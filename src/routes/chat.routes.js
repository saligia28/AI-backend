import express from 'express'
import aiService from '../services/ai.server.js'
import { success, error } from '../utils/response.js'
import logger from '../utils/logger.js'

const router = express.Router()

/**
 * POST /api/chat
 * 普通聊天接口
 */
router.post('/chat', async (req, res) => {
  try {
    const { messages, model } = req.body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json(error('messages 参数必须是非空数组', 400))
    }

    const result = await aiService.chat(messages, { model })

    res.json(success(result))
  } catch (err) {
    logger.error('Chat route error:', err)
    res.status(500).json(err.message)
  }
})

/**
 * POST /api/chat/stream
 * 流式聊天接口
 */
router.post('/chat/stream', async (req, res) => {
  try {
    const { messages, model } = req.body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json(error('messages 参数必须是非空数组', 400))
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const stream = await aiService.chatStream(messages, { model })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`)
      }
    }

    res.write(`data: [DONE]\n\n`)
    res.end()
  } catch (err) {
    logger.error('Stream chat route error:', err)
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

export default router
