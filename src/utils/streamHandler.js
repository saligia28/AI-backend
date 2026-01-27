import logger from './logger.js'

/**
 * SSE 流处理器
 */
export class StreamHandler {
  constructor(res) {
    this.res = res
    this.setupHeaders()
  }

  /**
   * 设置 SSE 响应头
   */
  setupHeaders() {
    this.res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    this.res.setHeader('Cache-Control', 'no-cache')
    this.res.setHeader('Connection', 'keep-alive')
  }

  /**
   * 发送数据块
   */
  sendChunk(data) {
    this.res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  /**
   * 发送完成信号
   */
  sendDone() {
    this.res.write('data: [DONE]\n\n')
  }

  /**
   * 发送错误
   */
  sendError(error) {
    this.res.write(
      `data: ${JSON.stringify({
        error: error.message,
      })}\n\n`,
    )
  }

  /**
   * 结束流
   */
  end() {
    this.res.end()
  }

  /**
   * 处理流式响应
   */
  async handleStream(stream) {
    try {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          this.sendChunk(chunk)
        }
      }
      this.sendDone()
    } catch (error) {
      logger.error('Stream handler error:', error)
      this.sendError(error)
    } finally {
      this.end()
    }
  }
}
