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
}

export default BaseAdapter
