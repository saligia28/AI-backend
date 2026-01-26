import logger from './logger.js'

/**
 * 日志辅助工具
 */

/**
 * 记录 API 调用
 */
export function logApiCall(provider, method, duration, success = true) {
  logger.http(`API Call: ${provider}`, {
    provider,
    method,
    duration,
    success,
  })
}

/**
 * 记录错误
 */
export function logError(context, error, extra = {}) {
  logger.error(`Error in ${context}`, {
    context,
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
    },
    ...extra,
  })
}

/**
 * 记录性能指标
 */
export function logPerformance(operation, duration, meta = {}) {
  const level = duration > 1000 ? 'warn' : 'info'
  logger[level](`Performance: ${operation}`, {
    operation,
    duration,
    ...meta,
  })
}

/**
 * 记录用户操作
 */
export function logUserAction(action, userId, details = {}) {
  logger.audit(`User action: ${action}`, {
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...details,
  })
}
