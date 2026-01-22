import DeepSeekAdapter from './deepseek.adapter.js'
import OpenAIAdapter from './openai.adapter.js'

/**
 * AI Provider Factory
 * 根据配置创建对应的适配器实例
 */
class ProviderFactory {
  constructor() {
    this.providers = new Map()
  }

  /**
   * 注册提供商
   */
  register(name, AdapterClass, config) {
    this.providers.set(name, {
      AdapterClass,
      config,
    })
  }

  /**
   * 获取提供商实例
   */
  get(name) {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`Provider "${name}" not found`)
    }

    // 每次创建新实例（也可以改为单例模式）
    return new provider.AdapterClass(provider.config)
  }

  /**
   * 列出所有已注册的提供商
   */
  list() {
    return Array.from(this.providers.keys())
  }
}

export default new ProviderFactory()
