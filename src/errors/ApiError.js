/**
 * API 错误基类
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, errorCode = null, isOperational = true) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.errorCode = errorCode
    this.isOperational = isOperational // 是否是可预期的业务错误

    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      success: false,
      code: this.errorCode || this.statusCode,
      message: this.message,
    }
  }
}

export default ApiError
