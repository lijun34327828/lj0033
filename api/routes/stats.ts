import { Router, type Request, type Response } from 'express'
import { db } from '../database.js'

const router = Router()

router.get('/revenue', (req: Request, res: Response): void => {
  try {
    const period = (req.query.period as string) || 'month'

    const now = new Date()
    let startDate: string

    if (period === 'year') {
      startDate = `${now.getFullYear() - 1}-01-01`
    } else if (period === 'quarter') {
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      startDate = quarterStart.toISOString().slice(0, 10)
    } else {
      startDate = `${now.getFullYear()}-01-01`
    }

    const totalRevenueRow = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM orders
      WHERE status IN ('checked_in', 'completed') AND check_in >= ?
    `).get(startDate) as { total: number }

    const totalRevenue = totalRevenueRow.total

    const totalProperties = (db.prepare('SELECT COUNT(*) as count FROM properties').get() as { count: number }).count

    const daysInRange = Math.max(1, Math.round((now.getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)))

    const bookedNightsRow = db.prepare(`
      SELECT COALESCE(SUM(julianday(check_out) - julianday(check_in)), 0) as nights
      FROM orders
      WHERE status IN ('checked_in', 'completed') AND check_in >= ?
    `).get(startDate) as { nights: number }

    const occupancyRate = totalProperties > 0
      ? Math.round((bookedNightsRow.nights / (totalProperties * daysInRange)) * 10000) / 100
      : 0

    const avgPriceRow = db.prepare(`
      SELECT COALESCE(AVG(total_amount), 0) as avg
      FROM orders
      WHERE status IN ('checked_in', 'completed') AND check_in >= ?
    `).get(startDate) as { avg: number }

    const avgPrice = Math.round(avgPriceRow.avg * 100) / 100

    const monthlyRevenue = db.prepare(`
      SELECT strftime('%Y-%m', check_in) as month, COALESCE(SUM(total_amount), 0) as revenue
      FROM orders
      WHERE status IN ('checked_in', 'completed') AND check_in >= ?
      GROUP BY strftime('%Y-%m', check_in)
      ORDER BY month
    `).all(startDate) as Array<{ month: string; revenue: number }>

    const topProperties = db.prepare(`
      SELECT p.id, p.name, COALESCE(SUM(o.total_amount), 0) as revenue, COUNT(o.id) as bookings
      FROM properties p
      LEFT JOIN orders o ON p.id = o.property_id AND o.status IN ('checked_in', 'completed') AND o.check_in >= ?
      GROUP BY p.id
      ORDER BY revenue DESC
      LIMIT 5
    `).all(startDate) as Array<{ id: string; name: string; revenue: number; bookings: number }>

    res.json({
      success: true,
      data: {
        totalRevenue,
        occupancyRate,
        avgPrice,
        monthlyRevenue,
        topProperties
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取营收统计失败' })
  }
})

export default router
