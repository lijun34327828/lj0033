import { Router, type Request, type Response } from 'express'
import { db } from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const rows = db.prepare('SELECT * FROM extra_services_catalog').all() as Array<Record<string, unknown>>
    res.json({ success: true, data: rows })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取增值服务目录失败' })
  }
})

export default router
