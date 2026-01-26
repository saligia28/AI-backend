import config from '../config/index.js'
import factory from '../adapters/factory.js'
import DeepSeekAdapter from '../adapters/deepseek.adapter.js'
import OpenAIAdapter from '../adapters/openai.adapter.js'
import logger from '../utils/logger.js'
import { logApiCall, logError, logPerformance } from '../utils/logHelper.js'
import { AIServiceError, ServiceUnavailableError } from '../errors/index.js'

class AIService {
  constructor() {
    this.init()
  }

  init() {
    // 注册DeepSeek
    if (config.ai.deepseek.apiKey) {
      factory.register('deepseek', DeepSeekAdapter, config.ai.deepseek)
      logger.info('Register provider: deepseek')
    }

    // 注册OpenAI
    if (config.ai.openai.apiKey) {
      factory.register('openai', OpenAIAdapter, config.ai.openai)
      logger.info('Register provider: OpenAI')
    }

    if (factory.list().length === 0) {
      logger.fatal('No AI provider configured!')
      throw new ServiceUnavailableError('没有配置可用的 AI 提供商')
    }

    logger.info(`Available providers: ${factory.list().join(',')}`)
  }

  /**
   * 发送聊天请求
   * @param {Array} messages - 消息数组
   * @param {Object} options - 配置选项
   */
  async chat(messages, options = {}) {
    const provider = options.provider || config.ai.defaultProvider
    const startTime = Date.now()

    try {
      logger.debug(`Starting chat request`, {
        provider,
        messagesCount: messages.length,
      })

      const adapter = factory.get(provider)
      const result = await adapter.chat(messages, options)

      const duration = Date.now() - startTime

      // 记录性能
      logPerformance('AI Chat', duration, { provider })

      // 记录 API 调用
      logApiCall(provider, 'chat', duration, true)

      logger.info(`Chat completed`, {
        provider,
        duration,
      })

      return result
    } catch (error) {
      const duration = Date.now() - startTime

      // 记录错误
      logError('AI Chat', error, { provider, duration })

      // 记录失败的 API 调用
      logApiCall(provider, 'chat', duration, false)

      throw new AIServiceError(`AI 服务调用失败: ${error.message}`, provider, error)
    }
  }

  /**
   * 发送流式聊天请求
   * @param {Array} messages - 消息数组
   * @param {Object} options - 配置选项
   */
  async chatStream(messages, options = {}) {
    const provider = options.provider || config.ai.defaultProvider

    try {
      logger.debug(`Starting stream chat request`, {
        provider,
        messagesCount: messages.length,
      })

      const adapter = factory.get(provider)
      const stream = await adapter.chatStream(messages, options)

      logger.info(`Stream chat started`, { provider })

      return stream
    } catch (error) {
      logError('AI Chat Stream', error, { provider })
      throw new AIServiceError(`AI 流式服务调用失败: ${error.message}`, provider, error)
    }
  }

  /**
   * 获取可用的提供商列表
   */
  getAvailableProviders() {
    return factory.list()
  }
}

export default new AIService()
