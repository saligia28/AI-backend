/**
 * 统一成功响应格式
 */
export function success(data, message = 'Success') {
  return {
    success: true,
    message,
    data,
  }
}

/**
 * 统一错误响应格式
 */
export function error(message, code = 500) {
  return {
    success: false,
    message,
    code,
  }
}
