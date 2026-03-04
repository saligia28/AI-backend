/**
 * 获取当前时间
 * @param {string} timezone - 时区(可选)
 * @returns {string} 格式化的时间字符串
 */
export function getTime(timezone = 'Asia/Shanghai') {
  try {
    const now = new Date()

    // 根据时区格式化时间
    const options = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }

    const formatter = new Intl.DateTimeFormat('zh-CN', options)
    const formattedTime = formatter.format(now)

    return `当前时间 (${timezone}): ${formattedTime}`
  } catch (error) {
    throw new Error(`获取时间失败: ${error.message}`)
  }
}

// 测试函数
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(getTime()) // 默认时区
  console.log(getTime('UTC')) // UTC 时区
  console.log(getTime('America/New_York')) // 纽约时区
}
