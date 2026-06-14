import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db, parseJsonField, toCamelCase, toCamelCaseArray } from '../database.js'

const router = Router()

interface ExtraService {
  id: string
  name: string
  price: number
  quantity: number
}

function calculateTotal(property: Record<string, unknown>, checkIn: string, checkOut: string, guests: number, extraServices: ExtraService[]): number {
  const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)))
  const basePrice = Number(property.base_price)
  const baseGuests = Number(property.base_guests)
  const extraGuestPrice = Number(property.extra_guest_price)
  const extraGuests = Math.max(0, guests - baseGuests)

  const roomCharge = nights * basePrice
  const extraGuestCharge = extraGuests * nights * extraGuestPrice
  const serviceCharge = extraServices.reduce((sum, s) => sum + s.price * s.quantity, 0)

  return roomCharge + extraGuestCharge + serviceCharge
}

function hasConflict(propertyId: string, checkIn: string, checkOut: string, excludeOrderId?: string): boolean {
  const conflicts = db.prepare(
    `SELECT id FROM orders WHERE property_id = ? AND status != 'cancelled' AND check_in < ? AND check_out > ?`
  ).all(propertyId, checkOut, checkIn) as Array<{ id: string }>

  if (excludeOrderId) {
    const filtered = conflicts.filter(c => c.id !== excludeOrderId)
    return filtered.length > 0
  }

  return conflicts.length > 0
}

function hasBlackout(propertyId: string, checkIn: string, checkOut: string): boolean {
  const blackouts = db.prepare(
    `SELECT id FROM property_blackouts WHERE property_id = ? AND start_date < ? AND end_date > ?`
  ).all(propertyId, checkOut, checkIn) as Array<{ id: string }>

  return blackouts.length > 0
}

router.post('/', (req: Request, res: Response): void => {
  try {
    const { propertyId, guestName, guestPhone, checkIn, checkOut, guests, extraServices } = req.body

    if (!propertyId || !guestName || !guestPhone || !checkIn || !checkOut || !guests) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId) as Record<string, unknown> | undefined
    if (!property) {
      res.status(404).json({ success: false, error: '房源不存在' })
      return
    }

    if (guests > Number(property.max_guests)) {
      res.status(400).json({ success: false, error: `超出最大入住人数（${property.max_guests}人）` })
      return
    }

    if (hasConflict(propertyId, checkIn, checkOut)) {
      res.status(409).json({ success: false, error: '该时段已被预订，存在时间冲突' })
      return
    }

    if (hasBlackout(propertyId, checkIn, checkOut)) {
      res.status(409).json({ success: false, error: '该时段房源不可用（维护/封房中）' })
      return
    }

    const services: ExtraService[] = extraServices || []
    const totalAmount = calculateTotal(property, checkIn, checkOut, guests, services)
    const now = new Date().toISOString()
    const id = uuidv4()

    db.prepare(`
      INSERT INTO orders (id, property_id, guest_name, guest_phone, check_in, check_out, guests, extra_services, status, total_amount, penalty_amount, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 0, ?, ?)
    `).run(id, propertyId, guestName, guestPhone, checkIn, checkOut, guests, JSON.stringify(services), totalAmount, now, now)

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, unknown>

    res.status(201).json({
      success: true,
      data: {
        ...toCamelCase(order),
        extraServices: parseJsonField<ExtraService[]>(order.extra_services as string, [])
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建订单失败' })
  }
})

router.get('/', (req: Request, res: Response): void => {
  try {
    const { status } = req.query

    let sql = `SELECT o.*, p.name as property_name, p.zone as property_zone FROM orders o JOIN properties p ON o.property_id = p.id WHERE 1=1`
    const params: unknown[] = []

    if (status) {
      sql += ' AND o.status = ?'
      params.push(status)
    }

    sql += ' ORDER BY o.created_at DESC'

    const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>

    const results = rows.map(row => ({
      ...toCamelCase(row),
      extraServices: parseJsonField<ExtraService[]>(row.extra_services as string, [])
    }))

    res.json({ success: true, data: results })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取订单列表失败' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const row = db.prepare(
      `SELECT o.*, p.name as property_name, p.zone as property_zone, p.type as property_type, p.base_price as property_base_price
       FROM orders o JOIN properties p ON o.property_id = p.id WHERE o.id = ?`
    ).get(req.params.id) as Record<string, unknown> | undefined

    if (!row) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    res.json({
      success: true,
      data: {
        ...toCamelCase(row),
        extraServices: parseJsonField<ExtraService[]>(row.extra_services as string, [])
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取订单详情失败' })
  }
})

router.put('/:id/cancel', (req: Request, res: Response): void => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined

    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    if (order.status === 'cancelled') {
      res.status(400).json({ success: false, error: '订单已取消' })
      return
    }

    if (order.status === 'completed') {
      res.status(400).json({ success: false, error: '已完成的订单不可取消' })
      return
    }

    const cancelDate = req.body.cancelDate ? new Date(req.body.cancelDate) : new Date()
    const checkInDate = new Date(order.check_in as string)
    const diffDays = (checkInDate.getTime() - cancelDate.getTime()) / (1000 * 60 * 60 * 24)

    let penaltyRate: number
    let rule: string

    if (diffDays >= 7) {
      penaltyRate = 0.1
      rule = '入住前7天以上取消，违约金10%'
    } else if (diffDays >= 3) {
      penaltyRate = 0.3
      rule = '入住前3-7天取消，违约金30%'
    } else if (diffDays >= 1) {
      penaltyRate = 0.5
      rule = '入住前1-3天取消，违约金50%'
    } else {
      penaltyRate = 0.8
      rule = '入住前1天内取消，违约金80%'
    }

    const totalAmount = Number(order.total_amount)
    const penaltyAmount = Math.round(totalAmount * penaltyRate * 100) / 100

    const now = new Date().toISOString()
    db.prepare(`
      UPDATE orders SET status = 'cancelled', penalty_amount = ?, updated_at = ? WHERE id = ?
    `).run(penaltyAmount, now, req.params.id)

    const updated = db.prepare(
      `SELECT o.*, p.name as property_name FROM orders o JOIN properties p ON o.property_id = p.id WHERE o.id = ?`
    ).get(req.params.id) as Record<string, unknown>

    res.json({
      success: true,
      data: {
        ...toCamelCase(updated),
        extraServices: parseJsonField<ExtraService[]>(updated.extra_services as string, []),
        penaltyRate,
        penaltyAmount,
        refundAmount: totalAmount - penaltyAmount,
        rule
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '取消订单失败' })
  }
})

router.put('/:id/modify', (req: Request, res: Response): void => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined

    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    if (order.status === 'cancelled' || order.status === 'completed') {
      res.status(400).json({ success: false, error: '当前订单状态不可修改' })
      return
    }

    const { checkIn, checkOut, guests, extraServices } = req.body

    const newCheckIn = checkIn || (order.check_in as string)
    const newCheckOut = checkOut || (order.check_out as string)
    const newGuests = guests || (order.guests as number)
    const newServices: ExtraService[] = extraServices !== undefined ? extraServices : parseJsonField<ExtraService[]>(order.extra_services as string, [])

    if (hasConflict(order.property_id as string, newCheckIn, newCheckOut, req.params.id)) {
      res.status(409).json({ success: false, error: '修改后的时段存在冲突' })
      return
    }

    if (hasBlackout(order.property_id as string, newCheckIn, newCheckOut)) {
      res.status(409).json({ success: false, error: '修改后的时段房源不可用' })
      return
    }

    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(order.property_id) as Record<string, unknown>
    const totalAmount = calculateTotal(property, newCheckIn, newCheckOut, newGuests, newServices)

    const now = new Date().toISOString()
    db.prepare(`
      UPDATE orders SET check_in = ?, check_out = ?, guests = ?, extra_services = ?, total_amount = ?, updated_at = ? WHERE id = ?
    `).run(newCheckIn, newCheckOut, newGuests, JSON.stringify(newServices), totalAmount, now, req.params.id)

    const updated = db.prepare(
      `SELECT o.*, p.name as property_name FROM orders o JOIN properties p ON o.property_id = p.id WHERE o.id = ?`
    ).get(req.params.id) as Record<string, unknown>

    res.json({
      success: true,
      data: {
        ...toCamelCase(updated),
        extraServices: parseJsonField<ExtraService[]>(updated.extra_services as string, [])
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '修改订单失败' })
  }
})

router.put('/:id/checkin', (req: Request, res: Response): void => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined

    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    if (order.status !== 'pending') {
      res.status(400).json({ success: false, error: '当前订单状态不可办理入住' })
      return
    }

    const { idCard } = req.body

    const now = new Date().toISOString()
    const recordId = uuidv4()
    const cleaningId = uuidv4()

    const transaction = db.transaction(() => {
      db.prepare(`
        UPDATE orders SET status = 'checked_in', updated_at = ? WHERE id = ?
      `).run(now, req.params.id)

      db.prepare(`
        INSERT INTO check_in_records (id, order_id, property_id, guest_name, guest_phone, id_card, check_in, check_out, actual_amount, extra_services, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        recordId, order.id, order.property_id, order.guest_name, order.guest_phone,
        idCard || '', order.check_in, order.check_out, order.total_amount, order.extra_services, now
      )

      db.prepare(`
        INSERT INTO cleaning_tasks (id, property_id, scheduled_date, status, assignee, created_at)
        VALUES (?, ?, ?, 'pending', '', ?)
      `).run(cleaningId, order.property_id, order.check_out, now)
    })

    transaction()

    const updated = db.prepare(
      `SELECT o.*, p.name as property_name FROM orders o JOIN properties p ON o.property_id = p.id WHERE o.id = ?`
    ).get(req.params.id) as Record<string, unknown>

    res.json({
      success: true,
      data: {
        ...toCamelCase(updated),
        extraServices: parseJsonField<ExtraService[]>(updated.extra_services as string, []),
        checkInRecordId: recordId,
        cleaningTaskId: cleaningId
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '办理入住失败' })
  }
})

router.put('/:id/complete', (req: Request, res: Response): void => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined

    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    if (order.status !== 'checked_in') {
      res.status(400).json({ success: false, error: '当前订单状态不可办理退房' })
      return
    }

    const now = new Date().toISOString()
    db.prepare(`
      UPDATE orders SET status = 'completed', updated_at = ? WHERE id = ?
    `).run(now, req.params.id)

    const updated = db.prepare(
      `SELECT o.*, p.name as property_name FROM orders o JOIN properties p ON o.property_id = p.id WHERE o.id = ?`
    ).get(req.params.id) as Record<string, unknown>

    res.json({
      success: true,
      data: {
        ...toCamelCase(updated),
        extraServices: parseJsonField<ExtraService[]>(updated.extra_services as string, [])
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '办理退房失败' })
  }
})

export default router
