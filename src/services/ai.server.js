import factory from '../adapters/factory.js'
import DeepSeekAdapter from '../adapters/deepseek.adapter.js'
import OpenAIAdapter from '../adapters/openai.adapter.js'
import config from '../config/index.js'
import logger from '../utils/logger.js'

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
      logger.error('No AI provider configured!')
      throw new Error('At lease one AI provider must be configured')
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
    const adapter = factory.get(provider)

    logger.info(`Using provider: ${provider}`)

    return await adapter.chat(messages, options)
  }

  /**
   * 发送流式聊天请求
   * @param {Array} messages - 消息数组
   * @param {Object} options - 配置选项
   */
  async chatStream(messages, options = {}) {
    const provider = options.provider || config.ai.defaultProvider
    const adapter = factory.get(provider)

    logger.info(`Using provider: ${provider}`)

    return await adapter.chatStream(messages, options)
  }

  /**
   * 获取可用的提供商列表
   */
  getAvailableProviders() {
    return factory.list()
  }
}

export default new AIService()
