import logger from '../utils/logger.js'

/**
 * 请求日志中间件
 * 记录每个请求的详细信息和响应时间
 */
export function requestLoggerMiddleware(req, res, next) {
  const startTime = Date.now()

  // 记录请求信息
  logger.info(`→ ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  })

  // 拦截响应的 end 方法
  const originalEnd = res.end
  res.end = function (...args) {
    const duration = Date.now() - startTime
    const statusCode = res.statusCode

    // 记录响应信息
    logger.info(`← ${req.method} ${req.url} ${statusCode} ${duration}ms`, {
      duration,
      statusCode,
    })

    originalEnd.apply(res.args)
  }

  next()
}
