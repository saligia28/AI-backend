import express from 'express'
import config from './config/index.js'
import routes from './routes/index.js'
import { corsMiddleware } from './middleware/cors.js'
import { requestLoggerMiddleware } from './middleware/requestLogger.js'
import { performanceMiddleware, requestCounterMiddleware } from './middleware/performance.js'
import { validateBodySize } from './middleware/validator.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

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

// ===== 404 处理（必须在路由之后）=====
app.use(notFoundHandler)

// ===== 错误处理（必须在最后）=====
app.use(errorHandler)

export default app
