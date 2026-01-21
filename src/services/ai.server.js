import OpenAI from 'openai'
import config from '../config/index.js'
import logger from '../utils/logger.js'

class AIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: config.ai.apiKey,
      baseURL: config.ai.baseURL,
    })
  }

  /**
   * 发送聊天请求
   * @param {Array} messages - 消息数组
   * @param {Object} options - 配置选项
   */
  async chat(messages, options = {}) {
    try {
      logger.info('Sending chat request', { messagesCount: messages.length })

      const model = options.model || config.ai.model

      // 从 options 中移除 model，避免被 undefined 覆盖
      const { model: _, ...restOptions } = options

      const response = await this.client.chat.completions.create({
        model,
        messages,
        stream: false,
        ...restOptions,
      })

      logger.info('Chat request completed', {
        usage: response.usage,
      })

      return response.choices[0].message
    } catch (error) {
      logger.error('Chat request failed', error.message)
      throw error
    }
  }

  /**
   * 发送流式聊天请求
   * @param {Array} messages - 消息数组
   * @param {Object} options - 配置选项
   */
  async chatStream(messages, options = {}) {
    try {
      logger.info('Sending stream chat request', { messagesCount: messages.length })

      const model = options.model || config.ai.model

      // 从 options 中移除 model，避免被 undefined 覆盖
      const { model: _, ...restOptions } = options

      const stream = await this.client.chat.completions.create({
        model,
        messages,
        stream: true,
        ...restOptions,
      })

      return stream
    } catch (error) {
      logger.error('Stream chat request failed', error.message)
      throw error
    }
  }
}

export default new AIService()
