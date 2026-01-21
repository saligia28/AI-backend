import app from './src/app.js'
import config from './src/config/index.js'
import logger from './src/utils/logger.js'

const server = app.listen(config.port, () => {
  logger.info(`Server is running on http://localhost:${config.port}`)
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

process.on('SIGABRT', () => {
  logger.info('SIGABRT signal received: closing HTTP server')
  server.close(() => {
    logger.info('HTTP server closed')
  })
})
