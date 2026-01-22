import OpenAI from 'openai'
import BaseAdapter from './base.adapter.js'
import logger from '../utils/logger.js'

/**
 * DeepSeek 适配器
 * DeepSeek 使用 OpenAI 兼容的 API
 */
class DeepSeekAdapter extends BaseAdapter {
  constructor(config) {
    super(config)
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    })
    this.model = config.model || 'deepseek-chat'
  }

  async chat(messages, options = {}) {
    try {
      logger.info('[DeepSeek] Send Chat request')
      const model = options.model || this.model

      // 从 options 中移除 model，避免被 undefined 覆盖
      const { model: _, ...restOptions } = options

      const response = await this.client.chat.completions.create({
        model,
        messages: this.formatMessages(messages),
        stream: false,
        ...restOptions,
      })

      logger.info('[DeepSeek] Chat completed', { usage: response.usage })

      return this.formatResponse(response.choices[0].message)
    } catch (error) {
      logger.error('[DeepSeek] Chat failed:', error.message)
      throw this.handleError(error)
    }
  }

  async chatStream(messages, options = {}) {
    try {
      logger.info('[DeepSeek] Stream Chat request')
      const model = options.model || this.model

      // 从 options 中移除 model，避免被 undefined 覆盖
      const { model: _, ...restOptions } = options

      const stream = await this.client.chat.completions.create({
        model,
        messages: this.formatMessages(messages),
        stream: true,
        ...restOptions,
      })

      return stream
    } catch (error) {
      logger.error('[DeepSeek] Stream failed:', error.message)
      throw this.handleError(error)
    }
  }

  formatMessages(messages) {
    return messages
  }

  formatResponse(message) {
    // 返回统一格式
    return {
      role: message.role,
      content: message.content,
      provider: 'deepseek',
    }
  }

  handleError(error) {
    // 统一错误格式
    return {
      provider: 'deepseek',
      message: error.message,
      status: error.status,
      code: error.code,
    }
  }
}

export default DeepSeekAdapter
