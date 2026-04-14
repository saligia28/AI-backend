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
   * 发送结构化事件，便于前端区分函数调用与普通 token
   */
  sendEvent(type, data = {}) {
    this.sendChunk({
      type,
      ...data,
    })
  }

  /**
   * 发送一段普通文本内容，保持 SSE 数据结构与模型流式 chunk 接近
   */
  sendText(content) {
    if (!content) {
      return
    }

    this.sendChunk({
      choices: [
        {
          delta: { content },
          finish_reason: null,
        },
      ],
    })
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

  /**
   * ✅ 新增：支持 Function Calling 的流处理
   *
   * 返回值：
   *   - { type: 'done' }                          → 正常结束，纯文字回复已流出
   *   - { type: 'function_call', name, arguments } → AI 要调用函数，调用方去执行
   */
  async handleStreamWithFunctionCall(stream) {
    let functionCallName = ''
    let functionCallArgs = ''
    let functionCallId = ''
    let hasFunctionCall = false

    try {
      for await (const chunk of stream) {
        const choice = chunk.choices[0]
        if (!choice) continue

        const delta = choice.delta

        // 检测是否是 function_call 模式
        if (delta?.function_call) {
          hasFunctionCall = true
          if (delta.function_call.name) {
            functionCallName = delta.function_call.name
          }
          if (delta.function_call.arguments) {
            functionCallArgs += delta.function_call.arguments
          }
          // function_call 期间不向客户端发送任何内容（等函数执行完再说）
          continue
        }

        if (delta?.tool_calls?.length) {
          hasFunctionCall = true

          for (const toolCall of delta.tool_calls) {
            if (toolCall.type && toolCall.type !== 'function') {
              continue
            }

            if (toolCall.function?.name) {
              functionCallName = toolCall.function.name
            }

            if (toolCall.id) {
              functionCallId = toolCall.id
            }

            if (toolCall.function?.arguments) {
              functionCallArgs += toolCall.function.arguments
            }
          }

          continue
        }

        // 普通文字 token：流式发给客户端
        if (delta?.content) {
          this.sendChunk(chunk)
        }

        if (choice.finish_reason === 'function_call' || choice.finish_reason === 'tool_calls') {
          // 函数调用结束，告诉调用方
          return {
            type: 'function_call',
            toolCallId: functionCallId || undefined,
            name: functionCallName,
            arguments: functionCallArgs,
          }
        }

        if (choice.finish_reason === 'stop') {
          // 正常结束
          this.sendDone()
          return { type: 'done' }
        }
      }

      // stream 结束但没有明确的 finish_reason
      if (hasFunctionCall) {
        return {
          type: 'function_call',
          toolCallId: functionCallId || undefined,
          name: functionCallName,
          arguments: functionCallArgs,
        }
      }

      this.sendDone()
      return { type: 'done' }
    } catch (error) {
      logger.error('Stream handler error:', error)
      this.sendError(error)
      return { type: 'done' }
    } finally {
      // 注意：不在这里 end()，由 controller 决定何时关闭
      // 有需要再补充
    }
  }
}
