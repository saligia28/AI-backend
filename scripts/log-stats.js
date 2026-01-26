import fs from 'fs'
import path from 'path'

/**
 * 日志统计工具
 */
function analyzeLogFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())

  const stats = {
    total: lines.length,
    byLevel: {},
    errors: [],
    slowRequests: [],
  }

  for (const line of lines) {
    // 统计级别
    const levelMatch = line.match(/\[(INFO|WARN|ERROR|DEBUG)\]/)
    if (levelMatch) {
      const level = levelMatch[1]
      stats.byLevel[level] = (stats.byLevel[level] || 0) + 1
    }

    // 收集错误
    if (line.includes('[ERROR]')) {
      stats.errors.push(line)
    }

    // 收集慢请求
    if (line.includes('Slow request')) {
      stats.slowRequests.push(line)
    }
  }

  return stats
}

// 示例使用
const logFile = process.argv[2] || './logs/app-2024-01-20.log'

if (fs.existsSync(logFile)) {
  const stats = analyzeLogFile(logFile)
  console.log('日志统计:', JSON.stringify(stats, null, 2))
} else {
  console.error('日志文件不存在:', logFile)
}
