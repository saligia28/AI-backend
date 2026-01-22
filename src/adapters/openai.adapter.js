import OpenAI from 'openai'
import BaseAdapter from './base.adapter.js'
import logger from '../utils/logger.js'

/**
 * OpenAI 适配器
 */
class OpenAIAdapter extends BaseAdapter {
  constructor(config) {
    super(config)
    this.client = new OpenAI({
      apiKey: config.apiKey,
    })
    this.model = config.model || 'gpt-3.5-turbo'
  }

  async chat(messages, options = {}) {
    try {
      logger.info('[OpenAI] Sending chat request')
      const model = options.model || this.model

      // 从 options 中移除 model，避免被 undefined 覆盖
      const { model: _, ...restOptions } = options

      const response = await this.client.chat.completions.create({
        model,
        messages: this.formatMessages(messages),
        stream: false,
        ...restOptions,
      })

      logger.info('[OpenAI] Chat completed', {
        usage: response.usage,
      })

      return this.formatResponse(response.choices[0].message)
    } catch (error) {
      logger.error('[OpenAI] Chat failed:', error.message)
      throw this.handleError(error)
    }
  }

  async chatStream(messages, options = {}) {
    try {
      logger.info('[OpenAI] Sending stream request')
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
      logger.error('[OpenAI] Stream failed:', error.message)
      throw this.handleError(error)
    }
  }

  formatResponse(message) {
    return {
      role: message.role,
      content: message.content,
      provider: 'openai',
    }
  }

  handleError(error) {
    return {
      provider: 'openai',
      message: error.message,
      status: error.status,
      code: error.code,
    }
  }
}

export default OpenAIAdapter
