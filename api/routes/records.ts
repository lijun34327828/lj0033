import { Router, type Request, type Response } from 'express'
import { db, parseJsonField } from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const { search } = req.query

    let sql = `
      SELECT r.*, p.name as property_name, p.zone as property_zone
      FROM check_in_records r
      JOIN properties p ON r.property_id = p.id
      WHERE 1=1
    `
    const params: unknown[] = []

    if (search) {
      sql += ` AND (r.guest_name LIKE ? OR r.guest_phone LIKE ? OR r.id_card LIKE ?)`
      const keyword = `%${search}%`
      params.push(keyword, keyword, keyword)
    }

    sql += ' ORDER BY r.created_at DESC'

    const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>

    const results = rows.map(row => ({
      ...row,
      extra_services: parseJsonField(row.extra_services as string, [])
    }))

    res.json({ success: true, data: results })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取入住档案列表失败' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const row = db.prepare(`
      SELECT r.*, p.name as property_name, p.zone as property_zone, p.type as property_type
      FROM check_in_records r
      JOIN properties p ON r.property_id = p.id
      WHERE r.id = ?
    `).get(req.params.id) as Record<string, unknown> | undefined

    if (!row) {
      res.status(404).json({ success: false, error: '入住档案不存在' })
      return
    }

    res.json({
      success: true,
      data: {
        ...row,
        extra_services: parseJsonField(row.extra_services as string, [])
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取入住档案详情失败' })
  }
})

export default router
