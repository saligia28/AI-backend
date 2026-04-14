import Joi from 'joi'
import { BadRequestError } from '../errors/index.js'

/**
 * 消息格式 Schema
 */
const toolCallSchema = Joi.object({
  id: Joi.string().optional(),
  type: Joi.string().valid('function').required(),
  function: Joi.object({
    name: Joi.string().required(),
    arguments: Joi.string().required(),
  }).required(),
})

const messageSchema = Joi.object({
  role: Joi.string().valid('system', 'user', 'assistant', 'tool').required(),
  content: Joi.alternatives().conditional('role', {
    switch: [
      {
        is: 'assistant',
        then: Joi.alternatives().try(Joi.string().max(10000), Joi.valid(null)).required(),
      },
      {
        is: 'tool',
        then: Joi.string().required().max(10000),
      },
    ],
    otherwise: Joi.string().required().max(10000),
  }),
  name: Joi.string().optional(),
  function_call: Joi.object().optional(),
  tool_calls: Joi.array().items(toolCallSchema).optional(),
  tool_call_id: Joi.string().optional(),
})

/**
 * Function Schema(用于验证functions参数)
 */
const functionSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  parameters: Joi.object().required(),
})

const toolSchema = Joi.object({
  type: Joi.string().valid('function').default('function'),
  function: functionSchema.required(),
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
  functions: Joi.array().items(functionSchema).optional(),
  tools: Joi.array().items(toolSchema).optional(),
  toolChoice: Joi.alternatives().try(Joi.string(), Joi.object()).optional(),
  parallelToolCalls: Joi.boolean().optional(),
  enableFunctionCalling: Joi.boolean().optional(),
})
  .rename('max_tokens', 'maxTokens', { ignoreUndefined: true })
  .rename('tool_choice', 'toolChoice', { ignoreUndefined: true })
  .rename('parallel_tool_calls', 'parallelToolCalls', { ignoreUndefined: true })
  .rename('enable_function_calling', 'enableFunctionCalling', { ignoreUndefined: true })

/**
 * 验证聊天请求
 */
export function validateChatRequest(data) {
  const { error, value } = chatRequestSchema.validate(data, {
    abortEarly: false,
  })

  if (error) {
    const messages = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
    }))
    throw new BadRequestError(
      `参数验证失败: ${messages.map(({ field, message }) => `${field}: ${message}`).join(', ')}`,
    )
  }

  return value
}
