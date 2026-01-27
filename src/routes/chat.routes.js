import express from 'express'
import chatController from '../controllers/chat.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validateMessages } from '../middleware/validator.js'

const router = express.Router()

/**
 * 路由层只负责：
 * 1. 定义路由路径
 * 2. 应用中间件
 * 3. 调用控制器
 */

router.post('/chat', validateMessages, asyncHandler(chatController.chat.bind(chatController)))

router.post('/chat/stream', validateMessages, asyncHandler(chatController.chatStream.bind(chatController)))

router.get('/providers', asyncHandler(chatController.getProviders.bind(chatController)))

export default router
