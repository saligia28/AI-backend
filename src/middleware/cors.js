import logger from '../utils/logger.js'

/**
 * CORS 中间件
 * 处理跨域请求
 */
export function corsMiddleware(options = {}) {
  const {
    origin = '*',
    methods = 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders = 'Content-Type,Authorization',
    credentials = true,
    maxAge = 86400,
  } = options

  return (req, res, next) => {
    // 设置 CORS 响应头
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', methods)
    res.setHeader('Access-Control-Allow-Headers', allowedHeaders)
    res.setHeader('Access-Control-Allow-Credentials', credentials)
    res.setHeader('Access-Control-Max-Age', maxAge)

    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
      logger.debug(`CORS preflight: ${req.method} ${req.url}`)
      return res.status(204).end()
    }

    next()
  }
}

/**
 * 高级 CORS 中间件
 * 支持动态来源验证
 */
export function advancedCorsMiddleware(allowedOrigins = []) {
  return (req, res, next) => {
    const origin = req.headers.origin

    // 检查来源是否在白名单中
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
    } else {
      logger.warn(`Blocked CORS request from origin: ${origin}`)
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')

    if (req.method === 'OPTIONS') {
      return res.status(204).end()
    }

    next()
  }
}
