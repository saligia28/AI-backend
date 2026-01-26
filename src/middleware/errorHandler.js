import logger from '../utils/logger.js'
import { logError } from '../utils/logHelper.js'
import ApiError from '../errors/ApiError.js'

/**
 * 统一错误处理中间件
 * 必须放在所有路由之后
 */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err)
  }

  logError('Global Error Handler', err, {
    url: req.url,
    method: req.method,
    requestId: req.requestId,
    ip: req.ip,
  })

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.errorCode || err.statusCode,
      message: err.message,
      requestId: req.requestId,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
      }),
    })
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      code: 400,
      message: '数据验证失败',
      errors: Object.values(err.errors).map(e => e.message),
      requestId: req.requestId,
    })
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      code: 401,
      message: 'Token无效',
      requestId: req.requestId,
    })
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      code: 401,
      message: 'Token 已过期',
      requestId: req.requestId,
    })
  }

  // 未知错误
  logger.error('Unhandled error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
  })

  // 生产环境不暴露错误详情
  const message = process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message

  res.status(500).json({
    success: false,
    code: 500,
    message,
    requestId: req.requestId,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
    }),
  })
}

/**
 * 404 错误处理
 * 放在所有路由之后，错误处理中间件之前
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    code: 404,
    message: `路由不存在: ${req.method} ${req.url}`,
    requestId: req.requestId,
  })
}
