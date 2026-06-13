import { Router, type Request, type Response } from 'express'
import { db } from '../database.js'

const router = Router()

interface ExtraService {
  id: string
  name: string
  price: number
  quantity: number
}

router.post('/calculate', (req: Request, res: Response): void => {
  try {
    const { propertyId, checkIn, checkOut, guests, extraServices } = req.body

    if (!propertyId || !checkIn || !checkOut || !guests) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId) as Record<string, unknown> | undefined
    if (!property) {
      res.status(404).json({ success: false, error: '房源不存在' })
      return
    }

    const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)))
    const basePrice = Number(property.base_price)
    const baseGuests = Number(property.base_guests)
    const extraGuestPrice = Number(property.extra_guest_price)
    const extraGuests = Math.max(0, guests - baseGuests)

    const roomCharge = nights * basePrice
    const extraGuestCharge = extraGuests * nights * extraGuestPrice

    const services: ExtraService[] = extraServices || []
    const serviceCharge = services.reduce((sum, s) => sum + s.price * s.quantity, 0)

    const totalAmount = roomCharge + extraGuestCharge + serviceCharge

    res.json({
      success: true,
      data: {
        roomCharge,
        extraGuestCharge,
        serviceCharge,
        totalAmount,
        nights,
        extraGuests
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '计算费用失败' })
  }
})

router.post('/penalty', (req: Request, res: Response): void => {
  try {
    const { orderId, cancelDate } = req.body

    if (!orderId) {
      res.status(400).json({ success: false, error: '缺少订单ID' })
      return
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as Record<string, unknown> | undefined
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    const cancel = cancelDate ? new Date(cancelDate) : new Date()
    const checkInDate = new Date(order.check_in as string)
    const diffDays = (checkInDate.getTime() - cancel.getTime()) / (1000 * 60 * 60 * 24)

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

    const originalAmount = Number(order.total_amount)
    const penaltyAmount = Math.round(originalAmount * penaltyRate * 100) / 100
    const refundAmount = originalAmount - penaltyAmount

    res.json({
      success: true,
      data: {
        orderId,
        originalAmount,
        penaltyRate,
        penaltyAmount,
        refundAmount,
        rule
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '计算违约金失败' })
  }
})

export default router
