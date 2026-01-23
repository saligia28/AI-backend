import express from 'express'
import config from './config/index.js'
import routes from './routes/index.js'
import { corsMiddleware } from './middleware/cors.js'
import { requestLoggerMiddleware } from './middleware/requestLogger.js'
import { performanceMiddleware, requestCounterMiddleware } from './middleware/performance.js'
import { validateBodySize } from './middleware/validator.js'
import logger from './utils/logger.js'

const app = express()
// ===== 全局中间件 =====

// 1. CORS（必须在最前面）
app.use(corsMiddleware(config.cors))

// 2. 请求日志
app.use(requestLoggerMiddleware)

// 3. 性能监控
app.use(performanceMiddleware(config.performance))

// 4. 请求计数
app.use(requestCounterMiddleware)

// 5. 请求体解析
app.use(express.json({ limit: config.security.maxBodySize }))
app.use(express.urlencoded({ extended: true, limit: config.security.maxBodySize }))

// 6. 请求体大小验证
app.use(validateBodySize(config.security.maxBodySize))

// ===== 路由 =====
app.use('/api', routes)

// ===== 404 处理 =====
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  })
})

// ===== 错误处理（后续实现）=====
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err)
  res.status(500).json({
    success: false,
    message: config.isDev ? err.message : 'Internal server error',
  })
})

export default app
