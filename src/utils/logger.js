import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 日志目录
const LOG_DIR = path.join(__dirname, '../../logs')

// 日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `[${timestamp}] [${level.toUpperCase()}] ${message}`
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`
    }
    return log
  }),
)

// 控制台格式（带颜色）
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `[${timestamp}] ${level}: ${message}`
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`
    }
    return log
  }),
)

/**
 * 创建日志记录器
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: consoleFormat,
    }),

    // 所有日志文件（按天轮转）
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m', // 单文件最大 20MB
      maxFiles: '14d', // 保留 14 天
      format: logFormat,
    }),

    // 错误日志单独文件
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d', // 错误日志保留 30 天
      format: logFormat,
    }),
  ],
})

/**
 * 扩展方法：记录 HTTP 请求
 */
logger.http = (message, meta = {}) => {
  logger.info(message, { type: 'http', ...meta })
}

/**
 * 扩展方法：记录性能
 */
logger.perf = (message, meta = {}) => {
  logger.info(message, { type: 'performance', ...meta })
}

/**
 * 扩展方法：记录审计
 */
logger.audit = (message, meta = {}) => {
  logger.info(message, { type: 'audit', ...meta })
}

export default logger
