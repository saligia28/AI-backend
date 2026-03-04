import app from './src/app.js'
import config from './src/config/index.js'
import logger from './src/utils/logger.js'

import { initFunctions } from './src/config/functions.js' // ← 新增

const PORT = config.port

// 初始化函数执行器
initFunctions() // ← 新增

const server = app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`)
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🚀 Server ready at http://localhost:${PORT}`)
})

process.on('SIGABRT', () => {
  logger.info('SIGABRT signal received: closing HTTP server')
  server.close(() => {
    logger.info('HTTP server closed')
  })
})
