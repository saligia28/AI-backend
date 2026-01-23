import logger from '../utils/logger.js'

/**
 * 性能监控中间件
 * 监控慢请求和统计性能指标
 */
export function performanceMiddleware(options = {}) {
  const { slowThreshold = 1000 } = options

  return (req, res, next) => {
    const startTime = Date.now()
    const startMemory = process.memoryUsage

    res.on('finish', () => {
      const duration = Date.now() - startTime
      const endMemory = process.memoryUsage
      const memoryDelta = {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        external: endMemory.external - startMemory.external,
      }

      if (duration > slowThreshold) {
        logger.warn(`Slow request detected: ${req.method} ${req.url}`, {
          duration,
          memoryDelta,
        })
      }
    })

    next()
  }
}

/**
 * 请求计数中间件
 * 统计 API 调用次数
 */
const requestCounts = new Map()

export function requestCounterMiddleware(req, res, next) {
  const key = `${req.method} ${req.path}`
  const count = requestCounts.get(key) || 0
  requestCounts.set(key, count + 1)

  req.requestCounts = requestCounts

  next()
}

/**
 * 获取请求统计
 */
export function getRequestStats() {
  return Object.fromEntries(requestCounts)
}
