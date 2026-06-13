import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import './database.js'
import propertyRoutes from './routes/properties.js'
import orderRoutes from './routes/orders.js'
import slotRoutes from './routes/slots.js'
import settlementRoutes from './routes/settlement.js'
import recordRoutes from './routes/records.js'
import statsRoutes from './routes/stats.js'
import cleaningRoutes from './routes/cleaning.js'
import serviceRoutes from './routes/services.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/properties', propertyRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/slots', slotRoutes)
app.use('/api/settlement', settlementRoutes)
app.use('/api/records', recordRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/cleaning', cleaningRoutes)
app.use('/api/extra-services', serviceRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
