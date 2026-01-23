import { error } from '../utils/response.js'

/**
 * 验证消息格式
 */
export function validateMessages(req, res, next) {
  const { messages } = req.body

  if (!messages) {
    return res.status(400).json(error('缺少 messages 参数', 400))
  }

  if (!Array.isArray(messages)) {
    return res.status(400).json(error('messages 必须是数组', 400))
  }

  if (messages.length === 0) {
    return res.status(400).json(error('messages 不能为空', 400))
  }

  // 验证每条消息的格式
  for (const [index, message] of messages.entries()) {
    if (!message.role || !message.content) {
      return res.status(400).json(error(`messages[${index}] 缺少 role 或 content`, 400))
    }

    if (!['system', 'user', 'assistant'].includes(message.role)) {
      return res.status(400).json(error(`messages[${index}] role 无效`, 400))
    }
  }

  next()
}

/**
 * 限制请求体大小
 */
export function validateBodySize(maxSize = 1024 * 1024) {
  // 1MB
  return (req, res, next) => {
    const contentLength = parseInt(req.get('content-length') || '0')

    if (contentLength > maxSize) {
      return res.status(413).json(error('请求体过大', 413))
    }

    next()
  }
}
