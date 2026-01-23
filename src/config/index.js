import 'dotenv/config'
import logger from '../utils/logger.js'

/**
 * 验证必需的环境变量
 */
function validateEnv() {
  const required = ['DEEPSEEK_API_KEY']

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

// 执行验证
try {
  validateEnv()
} catch (error) {
  logger.error('Environment validation failed:', error.message)
  process.exit(1)
}

const config = {
  // 环境
  env: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',

  // 服务器配置
  port: process.env.PORT || 3000,

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // AI配置
  ai: {
    // 默认提供商
    defaultProvider: process.env.AI_DEFAULT_PROVIDER || 'deepseek',

    // DeepSeek 配置
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASEURL || 'https://api.deepseek.com',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    },

    // OpenAI 配置
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    },
  },

  // 性能
  performance: {
    slowThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD || '1000'),
  },

  // 安全
  security: {
    maxBodySize: parseInt(process.env.REQUEST_BODY_MAX_SIZE || '1048576'),
  },
}

export default config
