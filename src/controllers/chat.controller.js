import aiService from '../services/ai.service.js'
import functionExecutor from '../utils/functionExecutor.js'
import { success } from '../utils/response.js'
import { validateChatRequest } from '../validators/chatValidator.js'
import { StreamHandler } from '../utils/streamHandler.js'
import logger from '../utils/logger.js'
import { getToolDefinitions } from '../config/functions.js'

const TOOL_GROUNDING_SYSTEM_PROMPT =
  '当对话中存在工具调用结果时，你必须把 tool 消息中的内容视为唯一事实来源，禁止自行心算、纠正或覆盖工具结果。若工具返回 15，你就必须基于 15 作答。'

class ChatController {
  buildMessages(validatedData) {
    const messages = [...validatedData.messages]
    const tools = this.normalizeTools(validatedData)

    if (!tools?.length) {
      return messages
    }

    const alreadyGrounded = messages.some((message) => (
      message.role === 'system' && typeof message.content === 'string' && message.content.includes(TOOL_GROUNDING_SYSTEM_PROMPT)
    ))

    if (alreadyGrounded) {
      return messages
    }

    return [
      {
        role: 'system',
        content: TOOL_GROUNDING_SYSTEM_PROMPT,
      },
      ...messages,
    ]
  }

  normalizeTools(validatedData) {
    if (Array.isArray(validatedData.tools) && validatedData.tools.length > 0) {
      return validatedData.tools
    }

    if (Array.isArray(validatedData.functions) && validatedData.functions.length > 0) {
      return validatedData.functions.map((definition) => ({
        type: 'function',
        function: definition,
      }))
    }

    if (validatedData.enableFunctionCalling) {
      return getToolDefinitions()
    }

    return undefined
  }

  buildCallOptions(validatedData) {
    const tools = this.normalizeTools(validatedData)
    const hasTools = Array.isArray(tools) && tools.length > 0

    return {
      provider: validatedData.provider,
      model: validatedData.model,
      temperature: validatedData.temperature,
      max_tokens: validatedData.maxTokens,
      tools,
      tool_choice: validatedData.toolChoice,
      ...(hasTools ? { parallel_tool_calls: validatedData.parallelToolCalls ?? false } : {}),
    }
  }

  buildFollowUpCallOptions(callOptions) {
    if (!callOptions?.tools?.length) {
      return callOptions
    }

    return {
      ...callOptions,
      tool_choice: undefined,
    }
  }

  extractToolCall(result) {
    const toolCall = result.tool_calls?.find((item) => item?.type === 'function' && item.function)

    if (toolCall) {
      return toolCall
    }

    if (result.function_call) {
      return {
        type: 'function',
        function: result.function_call,
      }
    }

    return null
  }

  appendFunctionResult(messages, toolCall, functionResult) {
    const functionCall = toolCall?.function || toolCall
    const content = typeof functionResult === 'string' ? functionResult : JSON.stringify(functionResult)

    if (toolCall?.id && functionCall) {
      messages.push({
        role: 'assistant',
        content: null,
        tool_calls: [toolCall],
      })
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content,
      })
      return
    }

    messages.push({
      role: 'assistant',
      content: null,
      function_call: functionCall,
    })
    messages.push({
      role: 'function',
      name: functionCall.name,
      content,
    })
  }

  /**
   * 标准聊天(支持函数调用)
   */
  async chat(req, res) {
    const validatedData = validateChatRequest(req.body)
    const messages = this.buildMessages(validatedData)
    const callOptions = this.buildCallOptions(validatedData)
    const followUpCallOptions = this.buildFollowUpCallOptions(callOptions)
    const calledFunctions = []

    // 第一次调用 AI
    let result = await aiService.chat(messages, callOptions)
    let toolCall = this.extractToolCall(result)

    // ✅ 改成 while：AI 只要还想调用函数，就继续循环
    const MAX_ITERATIONS = 5 // 防止无限循环
    let iterations = 0

    while (toolCall && iterations < MAX_ITERATIONS) {
      iterations++

      const { name, arguments: args } = toolCall.function
      logger.info(`[iteration ${iterations}] AI requested function: ${name}`, { args })
      calledFunctions.push({ name, arguments: args })

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
      this.appendFunctionResult(messages, toolCall, functionResult)
      // 再次调用 AI（带上函数结果）
      result = await aiService.chat(messages, followUpCallOptions)
      toolCall = this.extractToolCall(result)
    }

    if (iterations >= MAX_ITERATIONS) {
      logger.warn(`Function call loop hit MAX_ITERATIONS (${MAX_ITERATIONS}), forcing stop`)
    }

    return res.json(
      success({
        ...result,
        ...(calledFunctions.length > 0 ? { calledFunctions } : {}),
      }),
    )
  }

  async chatStream(req, res) {
    // 验证参数
    const validatedData = validateChatRequest(req.body)
    const messages = this.buildMessages(validatedData)
    const callOptions = this.buildCallOptions(validatedData)
    const followUpCallOptions = this.buildFollowUpCallOptions(callOptions)

    // 创建流处理器
    const streamHandler = new StreamHandler(res)
    const MAX_ITERATIONS = 5
    let iterations = 0

    // ✅ 外层也是循环：AI 可能连续调用多个函数
    while (iterations < MAX_ITERATIONS) {
      if (iterations > 0) {
        const result = await aiService.chat(messages, followUpCallOptions)
        const toolCall = this.extractToolCall(result)

        if (!toolCall) {
          streamHandler.sendText(result.content)
          streamHandler.sendDone()
          break
        }

        iterations++
        const { name, arguments: args } = toolCall.function
        logger.info(`[stream iteration ${iterations}] AI request function: ${name}`)
        streamHandler.sendEvent('function_call', { name, arguments: args, toolCallId: toolCall.id })

        let functionResult
        try {
          functionResult = functionExecutor.execute(name, args)
        } catch (error) {
          logger.error(`Function ${name} failed`, { error: error.message })
          functionResult = { error: error.message }
        }

        this.appendFunctionResult(messages, toolCall, functionResult)
        continue
      }

      // 首轮仍然保持原生流式，便于前端实时收到工具调用事件
      const stream = await aiService.chatStream(messages, callOptions)
      const outcome = await streamHandler.handleStreamWithFunctionCall(stream)

      if (outcome.type === 'done') {
        // 正常结束，流已经发完
        break
      }

      if (outcome.type === 'function_call') {
        iterations++
        const { name, arguments: args, toolCallId } = outcome
        logger.info(`[stream iteration ${iterations}] AI request function: ${name}`)
        streamHandler.sendEvent('function_call', { name, arguments: args, toolCallId })

        // 执行函数
        let functionResult
        try {
          functionResult = functionExecutor.execute(name, args)
        } catch (error) {
          logger.error(`Function ${name} failed`, { error: error.message })
          functionResult = { error: error.message }
        }

        // 把这一轮加入message
        this.appendFunctionResult(messages, {
          id: toolCallId,
          type: 'function',
          function: {
            name,
            arguments: args,
          },
        }, functionResult)

        // 后续轮次改用非流式 follow-up，避免 DeepSeek 在 stream=true 时忽略 tool 结果
      }
    }

    // 确保 SSE 连接关闭
    streamHandler.end()
  }

  async getProviders(req, res) {
    const providers = aiService.getAvailableProviders()
    return res.json(success({ providers }))
  }
}

export default new ChatController()
