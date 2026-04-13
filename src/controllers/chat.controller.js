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

    const callOptions = {
      provider: validatedData.provider,
      model: validatedData.model,
      temperature: validatedData.temperature,
      max_tokens: validatedData.maxTokens,
      functions: validatedData.functions, // ← 传入函数定义
    }

    // 第一次调用 AI
    let result = await aiService.chat(messages, callOptions)

    // ✅ 改成 while：AI 只要还想调用函数，就继续循环
    const MAX_ITERATIONS = 5 // 防止无限循环
    let iterations = 0

    while (result.function_call && iterations < MAX_ITERATIONS) {
      iterations++

      const { name, arguments: args } = result.function_call
      logger.info(`[iteration ${iterations}] AI requested function: ${name}`, { args })

      // 执行函数（executor 内部会处理 JSON 解析 + 错误）
      let functionResult
      try {
        functionResult = functionExecutor.execute(name, args)
        logger.info(`Function ${name} executed`, { result: functionResult })
      } catch (error) {
        logger.error(`Function ${name} failed`, { error: error.message })
        // 把错误告诉 AI，让它自行处理（而不是直接抛出中断流程）
        functionResult = { error: error.message }
      }

      // 把这一轮的 assistant（带 function_call）+ function 结果 加入历史
      messages.push({
        role: 'assistant',
        content: null,
        function_call: result.function_call,
      })
      messages.push({
        role: 'function',
        name,
        content: typeof functionResult === 'string' ? functionResult : JSON.stringify(functionResult),
      })
      // 再次调用 AI（带上函数结果）
      result = await aiService.chat(messages, callOptions)
    }

    if (iterations >= MAX_ITERATIONS) {
      logger.warn(`Function call loop hit MAX_ITERATIONS (${MAX_ITERATIONS}), forcing stop`)
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
