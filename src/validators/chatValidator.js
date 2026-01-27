import Joi from 'joi'
import { BadRequestError } from '../errors/index.js'

/**
 * 消息格式 Schema
 */
const messageSchema = Joi.object({
  role: Joi.string().valid('system', 'user', 'assistant').required(),
  content: Joi.string().required().max(10000),
})

/**
 * 聊天请求 Schema
 */
const chatRequestSchema = Joi.object({
  messages: Joi.array().items(messageSchema).min(1).max(50).required(),
  provider: Joi.string().valid('deepseek', 'openai', 'claude').optional(),
  model: Joi.string().optional(),
  temperature: Joi.number().min(0).max(2).optional(),
  maxTokens: Joi.number().min(1).max(8000).optional(),
})

/**
 * 验证聊天请求
 */
export function validateChatRequest(data) {
  const { error, value } = chatRequestSchema.validate(data, {
    abortEarly: false,
  })

  if (error) {
    const messages = error.details.map(d => d.message)
    throw new BadRequestError(`参数验证失败: ${messages.join(', ')}`)
  }

  return value
}
