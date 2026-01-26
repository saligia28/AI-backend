import ApiError from './ApiError.js'

/**
 * 400 - 请求参数错误
 */
export class BadRequestError extends ApiError {
  constructor(message = '请求参数错误', errorCode = 400) {
    super(message, 400, errorCode)
  }
}

/**
 * 401 - 未认证
 */
export class UnauthorizedError extends ApiError {
  constructor(message = '未认证，请先登录', errorCode = 401) {
    super(message, 401, errorCode)
  }
}

/**
 * 403 - 无权限
 */
export class ForbiddenError extends ApiError {
  constructor(message = '无权限访问', errorCode = 403) {
    super(message, 403, errorCode)
  }
}

/**
 * 404 - 资源不存在
 */
export class NotFoundError extends ApiError {
  constructor(message = '资源不存在', errorCode = 404) {
    super(message, 404, errorCode)
  }
}

/**
 * 429 - 请求过多
 */
export class TooManyRequestsError extends ApiError {
  constructor(message = '请求过于频繁', errorCode = 429) {
    super(message, 429, errorCode)
  }
}

/**
 * 500 - 服务器内部错误
 */
export class InternalServerError extends ApiError {
  constructor(message = '服务器内部错误', errorCode = 500) {
    super(message, 500, errorCode)
  }
}

/**
 * 503 - 服务不可用
 */
export class ServiceUnavailableError extends ApiError {
  constructor(message = '服务暂时不可用', errorCode = 503) {
    super(message, 503, errorCode)
  }
}

/**
 * 自定义业务错误
 */
export class BusinessError extends ApiError {
  constructor(message, errorCode) {
    super(message, 400, errorCode)
  }
}

/**
 * AI 服务错误
 */
export class AIServiceError extends ApiError {
  constructor(message = 'AI 服务调用失败', provider, originalError) {
    super(message, 500, 10001)
    this.provider = provider
    this.originalError = originalError
  }

  toJSON() {
    return {
      ...super.toJSON(),
      provider: this.provider,
      details: this.originalError?.message,
    }
  }
}

export default ApiError
