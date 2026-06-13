import { Router, type Request, type Response } from 'express'
import { db } from '../database.js'

const router = Router()

interface ConflictInfo {
  orderId: string
  guestName: string
  conflictStart: string
  conflictEnd: string
  type: 'order' | 'blackout'
  reason?: string
}

router.post('/validate', (req: Request, res: Response): void => {
  try {
    const { propertyId, checkIn, checkOut } = req.body

    if (!propertyId || !checkIn || !checkOut) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId) as Record<string, unknown> | undefined
    if (!property) {
      res.status(404).json({ success: false, error: '房源不存在' })
      return
    }

    const conflicts: ConflictInfo[] = []

    const orderConflicts = db.prepare(
      `SELECT id, guest_name, check_in, check_out FROM orders WHERE property_id = ? AND status != 'cancelled' AND check_in < ? AND check_out > ?`
    ).all(propertyId, checkOut, checkIn) as Array<{ id: string; guest_name: string; check_in: string; check_out: string }>

    for (const oc of orderConflicts) {
      conflicts.push({
        orderId: oc.id,
        guestName: oc.guest_name,
        conflictStart: oc.check_in,
        conflictEnd: oc.check_out,
        type: 'order'
      })
    }

    const blackoutConflicts = db.prepare(
      `SELECT id, start_date, end_date, reason FROM property_blackouts WHERE property_id = ? AND start_date < ? AND end_date > ?`
    ).all(propertyId, checkOut, checkIn) as Array<{ id: string; start_date: string; end_date: string; reason: string }>

    for (const bc of blackoutConflicts) {
      conflicts.push({
        orderId: bc.id,
        guestName: '',
        conflictStart: bc.start_date,
        conflictEnd: bc.end_date,
        type: 'blackout',
        reason: bc.reason
      })
    }

    res.json({
      success: true,
      data: {
        propertyId,
        checkIn,
        checkOut,
        available: conflicts.length === 0,
        conflicts
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '校验时段失败' })
  }
})

router.get('/available', (req: Request, res: Response): void => {
  try {
    const { propertyId, startDate, endDate } = req.query

    if (!propertyId || !startDate || !endDate) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId) as Record<string, unknown> | undefined
    if (!property) {
      res.status(404).json({ success: false, error: '房源不存在' })
      return
    }

    const orders = db.prepare(
      `SELECT check_in, check_out FROM orders WHERE property_id = ? AND status != 'cancelled' AND check_in < ? AND check_out > ?`
    ).all(propertyId, endDate, startDate) as Array<{ check_in: string; check_out: string }>

    const blackouts = db.prepare(
      `SELECT start_date, end_date FROM property_blackouts WHERE property_id = ? AND start_date < ? AND end_date > ?`
    ).all(propertyId, endDate, startDate) as Array<{ start_date: string; end_date: string }>

    const bookedDates = new Set<string>()

    const start = new Date(startDate as string)
    const end = new Date(endDate as string)

    for (const o of orders) {
      const oStart = new Date(o.check_in)
      const oEnd = new Date(o.check_out)
      const current = new Date(Math.max(oStart.getTime(), start.getTime()))
      while (current < oEnd && current < end) {
        bookedDates.add(current.toISOString().slice(0, 10))
        current.setDate(current.getDate() + 1)
      }
    }

    for (const b of blackouts) {
      const bStart = new Date(b.start_date)
      const bEnd = new Date(b.end_date)
      const current = new Date(Math.max(bStart.getTime(), start.getTime()))
      while (current <= bEnd && current < end) {
        bookedDates.add(current.toISOString().slice(0, 10))
        current.setDate(current.getDate() + 1)
      }
    }

    const availableSlots: Array<{ startDate: string; endDate: string }> = []
    let slotStart: Date | null = null

    const current = new Date(start)
    while (current < end) {
      const dateStr = current.toISOString().slice(0, 10)

      if (!bookedDates.has(dateStr)) {
        if (!slotStart) {
          slotStart = new Date(current)
        }
      } else {
        if (slotStart) {
          availableSlots.push({
            startDate: slotStart.toISOString().slice(0, 10),
            endDate: dateStr
          })
          slotStart = null
        }
      }

      current.setDate(current.getDate() + 1)
    }

    if (slotStart) {
      availableSlots.push({
        startDate: slotStart.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10)
      })
    }

    res.json({ success: true, data: availableSlots })
  } catch (error) {
    res.status(500).json({ success: false, error: '查询可订时段失败' })
  }
})

export default router
