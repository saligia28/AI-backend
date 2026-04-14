/**
 * AI 适配器基类
 * 定义所有 AI 服务必须实现的接口
 */
class BaseAdapter {
  constructor(config) {
    this.config = config
  }

  /**
   * 发送聊天请求
   * @param {Array} messages - 消息数组
   * @param {Object} options - 配置选项
   * @returns {Promise<Object>} - 返回消息对象
   */
  async chat(messages, options = {}) {
    throw new Error('chat() must be implemented by subclass')
  }

  /**
   * 发送流式聊天请求
   * @param {Array} messages - 消息数组
   * @param {Object} options - 配置选项
   * @returns {Promise<Stream>} - 返回流对象
   */
  async chatStream(messages, options = {}) {
    throw new Error('chatStream() must be implemented by subclass')
  }

  /**
   * 格式化消息（可选）
   * 将统一格式的消息转换为特定 API 的格式
   */
  formatMessages(messages) {
    return messages
  }

  /**
   * 格式化响应（可选）
   * 将特定 API 的响应转换为统一格式
   */
  formatResponse(response) {
    return response
  }

  /**
   * 将 message 中的 tool_calls / function_call 归一化为统一字段
   * 当前控制器仍按单函数循环执行，所以这里只提取第一个函数调用
   */
  normalizeFunctionCall(message = {}) {
    if (message.function_call) {
      return {
        function_call: message.function_call,
        tool_calls: message.tool_calls,
      }
    }

    const firstToolCall = message.tool_calls?.find((toolCall) => toolCall?.type === 'function' && toolCall.function)

    if (!firstToolCall) {
      return {
        function_call: undefined,
        tool_calls: message.tool_calls,
      }
    }

    return {
      function_call: {
        name: firstToolCall.function.name,
        arguments: firstToolCall.function.arguments,
      },
      tool_calls: message.tool_calls,
    }
  }
}

export default BaseAdapter
