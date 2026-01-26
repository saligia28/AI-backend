/**
 * 异步路由处理器包装
 * 自动捕获 async/await 中的错误
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * 使用示例：
 * router.get('/chat', asyncHandler(async (req, res) => {
 *   const result = await aiService.chat(messages)
 *   res.json(success(result))
 * }))
 */
