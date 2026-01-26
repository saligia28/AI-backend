/**
 * 错误码定义
 */
export const ErrorCodes = {
  // 通用错误 1xxxx
  UNKNOWN_ERROR: 10000,
  INVALID_PARAMS: 10001,
  UNAUTHORIZED: 10002,
  FORBIDDEN: 10003,
  NOT_FOUND: 10004,
  TOO_MANY_REQUESTS: 10005,

  // AI 服务错误 2xxxx
  AI_SERVICE_UNAVAILABLE: 20001,
  AI_API_KEY_INVALID: 20002,
  AI_QUOTA_EXCEEDED: 20003,
  AI_RESPONSE_TIMEOUT: 20004,
  AI_CONTENT_FILTERED: 20005,

  // 业务错误 3xxxx
  INVALID_MESSAGE_FORMAT: 30001,
  MESSAGE_TOO_LONG: 30002,
  UNSUPPORTED_PROVIDER: 30003,
}

/**
 * 错误消息
 */
export const ErrorMessages = {
  [ErrorCodes.UNKNOWN_ERROR]: '未知错误',
  [ErrorCodes.INVALID_PARAMS]: '参数错误',
  [ErrorCodes.UNAUTHORIZED]: '未认证',
  [ErrorCodes.FORBIDDEN]: '无权限',
  [ErrorCodes.NOT_FOUND]: '资源不存在',
  [ErrorCodes.TOO_MANY_REQUESTS]: '请求过于频繁',

  [ErrorCodes.AI_SERVICE_UNAVAILABLE]: 'AI 服务不可用',
  [ErrorCodes.AI_API_KEY_INVALID]: 'AI API Key 无效',
  [ErrorCodes.AI_QUOTA_EXCEEDED]: 'AI 配额已用尽',
  [ErrorCodes.AI_RESPONSE_TIMEOUT]: 'AI 响应超时',
  [ErrorCodes.AI_CONTENT_FILTERED]: '内容被过滤',

  [ErrorCodes.INVALID_MESSAGE_FORMAT]: '消息格式错误',
  [ErrorCodes.MESSAGE_TOO_LONG]: '消息过长',
  [ErrorCodes.UNSUPPORTED_PROVIDER]: '不支持的提供商',
}

/**
 * 获取错误消息
 */
export function getErrorMessage(code) {
  return ErrorMessages[code] || ErrorMessages[ErrorCodes.UNKNOWN_ERROR]
}
