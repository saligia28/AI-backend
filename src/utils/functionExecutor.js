import logger from './logger.js'
import { BadRequestError } from '../errors/index.js'

/**
 * 函数执行器
 * 负责注册、解析和执行函数
 */
export class FunctionExecutor {
  constructor() {
    this.functions = new Map()
  }

  /**
   * 注册函数
   * @param {string} name - 函数名
   * @param {Function} fn - 函数实现
   */
  register(name, fn) {
    if (typeof fn !== 'function') {
      throw new Error(`${name} must be a function`)
    }

    this.functions.set(name, fn)
    logger.info(`Registered function: ${name}`)
  }

  /**
   * 批量注册函数
   * @param {Object} functionsMap - { functionName: functionImpl }
   */
  registerAll(functionsMap) {
    Object.entries(functionsMap).forEach(([name, fn]) => {
      this.register(name, fn)
    })
  }
  /**
   * 执行函数
   * @param {string} name - 函数名
   * @param {string} argumentsJson - JSON 字符串格式的参数
   * @returns {any} 函数执行结果
   */
  execute(name, argumentsJson) {
    // 1.检查函数是否存在
    if (!this.functions.has(name)) {
      throw new BadRequestError(`Function ${name} not found`)
    }

    // 2.解析参数
    let args
    try {
      // arguments 可能是字符串或对象
      args = typeof argumentsJson === 'string' ? JSON.parse(argumentsJson) : argumentsJson
    } catch (error) {
      logger.error(`Failed to parse arguments for ${name}`, {
        arguments: argumentsJson,
        error: error.message,
      })
      throw new BadRequestError(`Invalid arguments format: ${error.message}`)
    }

    // 3. 执行函数
    try {
      const fn = this.functions.get(name)
      logger.debug(`Executing function: ${name}`, { args })

      const result = fn(args)

      logger.info(`Function ${name} executed successfully`)
      return result
    } catch (error) {
      logger.error(`Function ${name} execution failed`, {
        error: error.message,
        args,
      })
      throw new Error(`Function execution failed: ${error.message}`)
    }
  }

  /**
   * 获取已注册的函数列表
   */
  list() {
    return Array.from(this.functions.keys())
  }
}

// 导出单例
export default new FunctionExecutor()
