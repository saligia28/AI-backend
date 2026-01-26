import express from 'express'
import aiService from '../services/ai.service.js'
import { success } from '../utils/response.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { BadRequestError, NotFoundError } from '../errors/index.js'
import { validateMessages } from '../middleware/validator.js'

const router = express.Router()

/**
 * POST /api/chat
 * 普通聊天接口
 */
router.post(
  '/chat',
  validateMessages,
  asyncHandler(async (req, res) => {
    const { messages, provider, model } = req.body

    // 使用错误类抛出错误
    if (!messages || messages.length === 0) {
      throw new BadRequestError('messages 不能为空')
    }

    const result = await aiService.chat(messages, { provider, model })
    res.json(success(result))
  }),
)

/**
 * POST /api/chat/stream
 * 流式聊天接口
 */
router.post(
  '/chat/stream',
  validateMessages,
  asyncHandler(async (req, res) => {
    const { messages, provider, model } = req.body

    if (!messages || messages.length === 0) {
      throw new BadRequestError('messages 不能为空')
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const stream = await aiService.chatStream(messages, { provider, model })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  }),
)

/**
 * GET /api/providers
 * 获取可用的 AI 提供商列表
 */
router.get(
  '/providers',
  asyncHandler(async (req, res) => {
    const providers = aiService.getAvailableProviders()

    if (providers.length === 0) {
      throw new NotFoundError('没有可用的 AI 提供商')
    }

    res.json(success({ providers }))
  }),
)

export default router
