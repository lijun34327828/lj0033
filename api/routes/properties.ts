import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db, parseJsonField, toCamelCase, toCamelCaseArray } from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const { zone, type, minPrice, maxPrice, amenities } = req.query

    let sql = 'SELECT * FROM properties WHERE 1=1'
    const params: unknown[] = []

    if (zone) {
      sql += ' AND zone = ?'
      params.push(zone)
    }
    if (type) {
      sql += ' AND type = ?'
      params.push(type)
    }
    if (minPrice) {
      sql += ' AND base_price >= ?'
      params.push(Number(minPrice))
    }
    if (maxPrice) {
      sql += ' AND base_price <= ?'
      params.push(Number(maxPrice))
    }

    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]

    let results = rows.map(row => ({
      ...toCamelCase(row),
      amenities: parseJsonField<string[]>(row.amenities as string, []),
      images: parseJsonField<string[]>(row.images as string, [])
    }))

    if (amenities) {
      const filterAmenities = (amenities as string).split(',').map(a => a.trim())
      results = results.filter(p =>
        filterAmenities.every(a => p.amenities.includes(a))
      )
    }

    res.json({ success: true, data: results })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取房源列表失败' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const row = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined

    if (!row) {
      res.status(404).json({ success: false, error: '房源不存在' })
      return
    }

    const result = {
      ...toCamelCase(row),
      amenities: parseJsonField<string[]>(row.amenities as string, []),
      images: parseJsonField<string[]>(row.images as string, [])
    }

    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取房源详情失败' })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const existing = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined

    if (!existing) {
      res.status(404).json({ success: false, error: '房源不存在' })
      return
    }

    const { status, base_price, extra_guest_price, description, name, zone, type, bedrooms, max_guests, base_guests, amenities, images } = req.body

    const updates: string[] = []
    const params: unknown[] = []

    if (name !== undefined) { updates.push('name = ?'); params.push(name) }
    if (zone !== undefined) { updates.push('zone = ?'); params.push(zone) }
    if (type !== undefined) { updates.push('type = ?'); params.push(type) }
    if (bedrooms !== undefined) { updates.push('bedrooms = ?'); params.push(bedrooms) }
    if (max_guests !== undefined) { updates.push('max_guests = ?'); params.push(max_guests) }
    if (base_guests !== undefined) { updates.push('base_guests = ?'); params.push(base_guests) }
    if (base_price !== undefined) { updates.push('base_price = ?'); params.push(base_price) }
    if (extra_guest_price !== undefined) { updates.push('extra_guest_price = ?'); params.push(extra_guest_price) }
    if (amenities !== undefined) { updates.push('amenities = ?'); params.push(JSON.stringify(amenities)) }
    if (images !== undefined) { updates.push('images = ?'); params.push(JSON.stringify(images)) }
    if (status !== undefined) { updates.push('status = ?'); params.push(status) }
    if (description !== undefined) { updates.push('description = ?'); params.push(description) }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: '没有提供更新字段' })
      return
    }

    params.push(req.params.id)
    db.prepare(`UPDATE properties SET ${updates.join(', ')} WHERE id = ?`).run(...params)

    const updated = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id) as Record<string, unknown>

    res.json({
      success: true,
      data: {
        ...toCamelCase(updated),
        amenities: parseJsonField<string[]>(updated.amenities as string, []),
        images: parseJsonField<string[]>(updated.images as string, [])
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新房源失败' })
  }
})

router.get('/:id/calendar', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const year = Number(req.query.year) || new Date().getFullYear()
    const month = Number(req.query.month) || (new Date().getMonth() + 1)

    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(id) as Record<string, unknown> | undefined
    if (!property) {
      res.status(404).json({ success: false, error: '房源不存在' })
      return
    }

    const daysInMonth = new Date(year, month, 0).getDate()
    const calendar: Array<{ date: string; status: string; orderId?: string }> = []

    const orders = db.prepare(
      `SELECT id, check_in, check_out FROM orders WHERE property_id = ? AND status != 'cancelled' AND check_in < ? AND check_out > ?`
    ).all(id, `${year}-${String(month).padStart(2, '0')}-31`, `${year}-${String(month).padStart(2, '0')}-01`) as Array<{ id: string; check_in: string; check_out: string }>

    const blackouts = db.prepare(
      `SELECT start_date, end_date FROM property_blackouts WHERE property_id = ? AND start_date <= ? AND end_date >= ?`
    ).all(id, `${year}-${String(month).padStart(2, '0')}-31`, `${year}-${String(month).padStart(2, '0')}-01`) as Array<{ start_date: string; end_date: string }>

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

      let status = 'available'
      let orderId: string | undefined

      const blackout = blackouts.find(b => dateStr >= b.start_date && dateStr <= b.end_date)
      if (blackout) {
        status = 'blackout'
      }

      if (property.status === 'maintenance') {
        status = 'maintenance'
      }

      const order = orders.find(o => dateStr >= o.check_in && dateStr < o.check_out)
      if (order) {
        status = 'booked'
        orderId = order.id
      }

      calendar.push({ date: dateStr, status, ...(orderId ? { orderId } : {}) })
    }

    res.json({ success: true, data: calendar })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取日历数据失败' })
  }
})

router.post('/:id/blackout', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { startDate, endDate, reason } = req.body

    if (!startDate || !endDate) {
      res.status(400).json({ success: false, error: '缺少开始或结束日期' })
      return
    }

    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(id) as Record<string, unknown> | undefined
    if (!property) {
      res.status(404).json({ success: false, error: '房源不存在' })
      return
    }

    const blackoutId = uuidv4()
    db.prepare(`
      INSERT INTO property_blackouts (id, property_id, start_date, end_date, reason)
      VALUES (?, ?, ?, ?, ?)
    `).run(blackoutId, id, startDate, endDate, reason || '')

    const blackout = db.prepare('SELECT * FROM property_blackouts WHERE id = ?').get(blackoutId)
    res.status(201).json({ success: true, data: blackout })
  } catch (error) {
    res.status(500).json({ success: false, error: '设置黑名单日期失败' })
  }
})

export default router
