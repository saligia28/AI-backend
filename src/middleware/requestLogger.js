import logger from '../utils/logger.js'
import { randomUUID } from 'crypto'

/**
 * 请求日志中间件
 * 记录每个请求的详细信息和响应时间
 */
export function requestLoggerMiddleware(req, res, next) {
  // 生成请求 ID
  const requestId = randomUUID()
  req.requestId = requestId

  const startTime = Date.now()

  // 记录请求信息
  logger.info(`→ ${req.method} ${req.url}`, {
    requestId,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    body: req.body,
  })

  // 拦截响应的 end 方法
  const originalEnd = res.end
  res.end = function (...args) {
    const duration = Date.now() - startTime
    const statusCode = res.statusCode

    // 记录响应信息
    logger.info(`← ${req.method} ${req.url} ${statusCode} ${duration}ms`, {
      requestId,
      duration,
      statusCode,
    })

    // 记录慢请求
    if (duration > 1000) {
      logger.warn(`Slow request detected`, {
        requestId,
        method: req.method,
        url: req.url,
        duration,
      })
    }

    originalEnd.apply(res, args)
  }

  next()
}
