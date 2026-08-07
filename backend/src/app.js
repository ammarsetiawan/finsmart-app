import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import swaggerUi from 'swagger-ui-express'
import swaggerSpec from './swagger.js'

import transactionRoutes from './routes/transactions.js'
import dashboardRoutes   from './routes/dashboard.js'
import categoryRoutes    from './routes/categories.js'
import budgetRoutes      from './routes/budgets.js'
import allocationRoutes  from './routes/allocations.js'
import profileRoutes     from './routes/profiles.js'
import balanceRoutes     from './routes/balance.js'
import adminRoutes       from './routes/admin.js'

const app  = express()
const PORT = process.env.PORT || 5000

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:3002')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }
    callback(null, false)
  },
  credentials: true,
}))
app.use(express.json())
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Finance App API Docs',
  swaggerOptions: { persistAuthorization: true },
}))

app.use('/api/transactions', transactionRoutes)
app.use('/api/dashboard',    dashboardRoutes)
app.use('/api/categories',   categoryRoutes)
app.use('/api/budgets',      budgetRoutes)
app.use('/api/allocations',  allocationRoutes)
app.use('/api/profiles',     profileRoutes)
app.use('/api/balance',      balanceRoutes)
app.use('/api/admin',        adminRoutes)

app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }))

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`✓ Backend running → http://localhost:${PORT}`))
}

export default app;
