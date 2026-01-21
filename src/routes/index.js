import express from 'express'
import chatRoutes from './chat.routes.js'

const router = express.Router()

router.use('/', chatRoutes)

router.use('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default router
