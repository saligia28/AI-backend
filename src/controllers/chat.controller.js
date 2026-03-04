import aiService from '../services/ai.service.js'
import functionExecutor from '../utils/functionExecutor.js'
import { success } from '../utils/response.js'
import { validateChatRequest } from '../validators/chatValidator.js'
import { StreamHandler } from '../utils/streamHandler.js'
import logger from '../utils/logger.js'

class ChatController {
  /**
   * 标准聊天(支持函数调用)
   */
  async chat(req, res) {
    const validatedData = validateChatRequest(req.body)
    const messages = [...validatedData.messages]

    // 第一次调用 AI
    let result = await aiService.chat(messages, {
      provider: validatedData.provider,
      model: validatedData.model,
      temperature: validatedData.temperature,
      max_tokens: validatedData.maxTokens,
      functions: validatedData.functions, // ← 传入函数定义
    })

    // 检查是否需要调用函数
    if (result.function_call) {
      const { name, arguments: args } = result.function_call

      logger.info(`AI requested function call`, { name, args })

      try {
        // 执行函数
        const functionResult = functionExecutor.execute(name, args)

        logger.info(`Function ${name} executed`, { result: functionResult })

        // 添加 assistant 消息(带 function_call)
        messages.push({
          role: 'assistant',
          content: null,
          function_call: result.function_call,
        })

        // 添加 function 消息(函数执行结果)
        messages.push({
          role: 'function',
          name: name,
          content: typeof functionResult === 'string' ? functionResult : JSON.stringify(functionResult),
        })

        // 第二次调用 AI,让它生成最终回复
        result = await aiService.chat(messages, {
          provider: validatedData.provider,
          model: validatedData.model,
          temperature: validatedData.temperature,
          max_tokens: validatedData.maxTokens,
        })

        logger.info(`Final response generated`)
      } catch (error) {
        logger.error(`Function execution failed`, { error: error.message })

        // 告诉 AI 函数执行失败
        messages.push({
          role: 'assistant',
          content: null,
          function_call: result.function_call,
        })
        messages.push({
          role: 'function',
          name: name,
          content: JSON.stringify({ error: error.message }),
        })

        // 让 AI 生成错误回复
        result = await aiService.chat(messages, {
          provider: validatedData.provider,
          model: validatedData.model,
        })
      }
    }

    return res.json(success(result))
  }

  async chatStream(req, res) {
    // 验证参数
    const validatedData = validateChatRequest(req.body)

    // 创建流处理器
    const streamHandler = new StreamHandler(res)

    // 获取流
    const stream = await aiService.chatStream(validatedData.messages, {
      provider: validatedData.provider,
      model: validatedData.model,
      temperature: validatedData.temperature,
      max_tokens: validatedData.maxTokens,
    })

    // 处理流
    await streamHandler.handleStream(stream)
  }

  async getProviders(req, res) {
    const providers = aiService.getAvailableProviders()
    return res.json(success({ providers }))
  }
}

export default new ChatController()
