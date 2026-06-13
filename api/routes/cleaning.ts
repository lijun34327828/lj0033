import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const { status } = req.query

    let sql = `
      SELECT ct.*, p.name as property_name, p.zone as property_zone
      FROM cleaning_tasks ct
      JOIN properties p ON ct.property_id = p.id
      WHERE 1=1
    `
    const params: unknown[] = []

    if (status) {
      sql += ' AND ct.status = ?'
      params.push(status)
    }

    sql += ' ORDER BY ct.scheduled_date ASC'

    const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>

    res.json({ success: true, data: rows })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取保洁任务列表失败' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { propertyId, scheduledDate, assignee } = req.body

    if (!propertyId || !scheduledDate) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId) as Record<string, unknown> | undefined
    if (!property) {
      res.status(404).json({ success: false, error: '房源不存在' })
      return
    }

    const id = uuidv4()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO cleaning_tasks (id, property_id, scheduled_date, status, assignee, created_at)
      VALUES (?, ?, ?, 'pending', ?, ?)
    `).run(id, propertyId, scheduledDate, assignee || '', now)

    const task = db.prepare(`
      SELECT ct.*, p.name as property_name, p.zone as property_zone
      FROM cleaning_tasks ct
      JOIN properties p ON ct.property_id = p.id
      WHERE ct.id = ?
    `).get(id) as Record<string, unknown>

    res.status(201).json({ success: true, data: task })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建保洁任务失败' })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const task = db.prepare('SELECT * FROM cleaning_tasks WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined

    if (!task) {
      res.status(404).json({ success: false, error: '保洁任务不存在' })
      return
    }

    const { status, assignee } = req.body

    const updates: string[] = []
    const params: unknown[] = []

    if (status !== undefined) {
      updates.push('status = ?')
      params.push(status)
    }
    if (assignee !== undefined) {
      updates.push('assignee = ?')
      params.push(assignee)
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: '没有提供更新字段' })
      return
    }

    params.push(req.params.id)
    db.prepare(`UPDATE cleaning_tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params)

    const updated = db.prepare(`
      SELECT ct.*, p.name as property_name, p.zone as property_zone
      FROM cleaning_tasks ct
      JOIN properties p ON ct.property_id = p.id
      WHERE ct.id = ?
    `).get(req.params.id) as Record<string, unknown>

    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新保洁任务失败' })
  }
})

export default router
