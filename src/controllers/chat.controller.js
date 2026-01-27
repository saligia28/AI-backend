import aiService from '../services/ai.service.js'
import { success } from '../utils/response.js'
import { validateChatRequest } from '../validators/chatValidator.js'
import { StreamHandler } from '../utils/streamHandler.js'

class ChatController {
  async chat(req, res) {
    // 验证参数
    const validatedData = validateChatRequest(req.body)

    // 调用服务
    const result = await aiService.chat(validatedData.messages, {
      provider: validatedData.provider,
      model: validatedData.model,
      temperature: validatedData.temperature,
      max_tokens: validatedData.maxTokens,
    })

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
