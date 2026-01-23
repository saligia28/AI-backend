import express from 'express'
import chatRoutes from './chat.routes.js'
import { getRequestStats } from '../middleware/performance.js'
import { success } from '../utils/response.js'

const router = express.Router()

// 挂载聊天路由
router.use('/', chatRoutes)

// 健康检查
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  })
})

// 请求统计
router.get('/stats', (req, res) => {
  res.json(
    success({
      requests: getRequestStats(),
      memory: process.memoryUsage(),
      uptime: process.uptime(),
    }),
  )
})

export default router
