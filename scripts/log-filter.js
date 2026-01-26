import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 日志过滤工具
 * 功能：按级别、时间范围过滤日志
 *
 * 使用示例：
 * node scripts/log-filter.js --level ERROR
 * node scripts/log-filter.js --level WARN,ERROR
 * node scripts/log-filter.js --from "2026-01-26 14:00:00" --to "2026-01-26 15:00:00"
 * node scripts/log-filter.js --level ERROR --from "2026-01-26 14:00:00"
 * node scripts/log-filter.js --file logs/app-2026-01-26.log --level INFO
 */

class LogFilter {
  constructor(options = {}) {
    this.levels = options.levels || []
    this.fromTime = options.fromTime ? new Date(options.fromTime) : null
    this.toTime = options.toTime ? new Date(options.toTime) : null
    this.keyword = options.keyword || null
    this.outputFile = options.outputFile || null
  }

  /**
   * 解析日志行
   */
  parseLogLine(line) {
    const match = line.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] \[(\w+)\] (.+)/)
    if (!match) return null

    return {
      timestamp: new Date(match[1]),
      level: match[2],
      message: match[3],
      raw: line,
    }
  }

  /**
   * 检查日志行是否匹配过滤条件
   */
  matchesFilter(logEntry) {
    if (!logEntry) return false

    // 级别过滤
    if (this.levels.length > 0 && !this.levels.includes(logEntry.level)) {
      return false
    }

    // 时间范围过滤
    if (this.fromTime && logEntry.timestamp < this.fromTime) {
      return false
    }
    if (this.toTime && logEntry.timestamp > this.toTime) {
      return false
    }

    // 关键词过滤
    if (this.keyword && !logEntry.message.includes(this.keyword)) {
      return false
    }

    return true
  }

  /**
   * 过滤日志文件
   */
  filterLogFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`日志文件不存在: ${filePath}`)
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())

    const filteredLogs = []
    const stats = {
      total: lines.length,
      matched: 0,
      byLevel: {},
    }

    for (const line of lines) {
      const logEntry = this.parseLogLine(line)
      if (this.matchesFilter(logEntry)) {
        filteredLogs.push(logEntry.raw)
        stats.matched++
        stats.byLevel[logEntry.level] = (stats.byLevel[logEntry.level] || 0) + 1
      }
    }

    return { logs: filteredLogs, stats }
  }

  /**
   * 过滤多个日志文件
   */
  filterLogFiles(filePaths) {
    const allResults = {
      logs: [],
      stats: {
        total: 0,
        matched: 0,
        byLevel: {},
        files: filePaths.length,
      },
    }

    for (const filePath of filePaths) {
      try {
        const result = this.filterLogFile(filePath)
        allResults.logs.push(...result.logs)
        allResults.stats.total += result.stats.total
        allResults.stats.matched += result.stats.matched

        // 合并级别统计
        for (const [level, count] of Object.entries(result.stats.byLevel)) {
          allResults.stats.byLevel[level] = (allResults.stats.byLevel[level] || 0) + count
        }
      } catch (error) {
        console.error(`处理文件 ${filePath} 时出错:`, error.message)
      }
    }

    return allResults
  }

  /**
   * 输出结果
   */
  outputResults(results) {
    // 输出统计信息
    console.log('\n=== 过滤统计 ===')
    console.log(`总日志数: ${results.stats.total}`)
    console.log(`匹配数: ${results.stats.matched}`)
    console.log(`匹配率: ${((results.stats.matched / results.stats.total) * 100).toFixed(2)}%`)

    if (Object.keys(results.stats.byLevel).length > 0) {
      console.log('\n按级别统计:')
      for (const [level, count] of Object.entries(results.stats.byLevel)) {
        console.log(`  ${level}: ${count}`)
      }
    }

    // 输出日志内容
    if (results.logs.length > 0) {
      console.log('\n=== 过滤结果 ===')

      if (this.outputFile) {
        fs.writeFileSync(this.outputFile, results.logs.join('\n'), 'utf-8')
        console.log(`已保存 ${results.logs.length} 条日志到: ${this.outputFile}`)
      } else {
        // 控制台输出（限制前100条）
        const displayLimit = 100
        const displayLogs = results.logs.slice(0, displayLimit)
        console.log(displayLogs.join('\n'))

        if (results.logs.length > displayLimit) {
          console.log(`\n... 还有 ${results.logs.length - displayLimit} 条日志未显示`)
          console.log('提示: 使用 --output 参数保存完整结果到文件')
        }
      }
    } else {
      console.log('\n未找到匹配的日志')
    }
  }
}

/**
 * 解析命令行参数
 */
function parseArguments() {
  const args = process.argv.slice(2)
  const options = {
    levels: [],
    fromTime: null,
    toTime: null,
    keyword: null,
    files: [],
    outputFile: null,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--level':
      case '-l':
        if (args[i + 1]) {
          options.levels = args[++i].split(',').map(l => l.trim().toUpperCase())
        }
        break
      case '--from':
        if (args[i + 1]) {
          options.fromTime = args[++i]
        }
        break
      case '--to':
        if (args[i + 1]) {
          options.toTime = args[++i]
        }
        break
      case '--keyword':
      case '-k':
        if (args[i + 1]) {
          options.keyword = args[++i]
        }
        break
      case '--file':
      case '-f':
        if (args[i + 1]) {
          options.files.push(args[++i])
        }
        break
      case '--output':
      case '-o':
        if (args[i + 1]) {
          options.outputFile = args[++i]
        }
        break
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
        break
    }
  }

  return options
}

/**
 * 打印帮助信息
 */
function printHelp() {
  console.log(`
日志过滤工具

用法:
  node scripts/log-filter.js [选项]

选项:
  -l, --level <levels>      按级别过滤，多个级别用逗号分隔 (如: ERROR,WARN)
  --from <datetime>         开始时间 (格式: YYYY-MM-DD HH:mm:ss)
  --to <datetime>           结束时间 (格式: YYYY-MM-DD HH:mm:ss)
  -k, --keyword <keyword>   关键词过滤
  -f, --file <path>         指定日志文件（可多次使用）
  -o, --output <path>       输出到文件
  -h, --help                显示帮助信息

示例:
  # 过滤错误日志
  node scripts/log-filter.js --level ERROR

  # 过滤警告和错误
  node scripts/log-filter.js --level WARN,ERROR

  # 按时间范围过滤
  node scripts/log-filter.js --from "2026-01-26 14:00:00" --to "2026-01-26 15:00:00"

  # 组合过滤并保存到文件
  node scripts/log-filter.js --level ERROR --from "2026-01-26 14:00:00" --output filtered.log

  # 关键词搜索
  node scripts/log-filter.js --keyword "slow request"

  # 指定日志文件
  node scripts/log-filter.js --file logs/app-2026-01-26.log --level ERROR
  `)
}

/**
 * 获取日志文件列表
 */
function getLogFiles(specifiedFiles) {
  if (specifiedFiles.length > 0) {
    return specifiedFiles
  }

  // 默认使用 logs 目录下的所有 app-*.log 文件
  const logsDir = path.join(__dirname, '../logs')
  if (!fs.existsSync(logsDir)) {
    throw new Error(`日志目录不存在: ${logsDir}`)
  }

  const files = fs.readdirSync(logsDir)
    .filter(file => file.startsWith('app-') && file.endsWith('.log'))
    .map(file => path.join(logsDir, file))
    .sort()
    .reverse() // 最新的文件在前

  return files.slice(0, 7) // 默认处理最近7天的日志
}

/**
 * 主函数
 */
function main() {
  try {
    const options = parseArguments()

    // 获取要处理的日志文件
    const logFiles = getLogFiles(options.files)

    if (logFiles.length === 0) {
      console.error('错误: 未找到日志文件')
      process.exit(1)
    }

    console.log(`处理 ${logFiles.length} 个日志文件...`)
    console.log(`文件列表:\n  ${logFiles.join('\n  ')}`)

    // 创建过滤器
    const filter = new LogFilter({
      levels: options.levels,
      fromTime: options.fromTime,
      toTime: options.toTime,
      keyword: options.keyword,
      outputFile: options.outputFile,
    })

    // 执行过滤
    const results = filter.filterLogFiles(logFiles)

    // 输出结果
    filter.outputResults(results)

  } catch (error) {
    console.error('错误:', error.message)
    process.exit(1)
  }
}

// 运行主函数
main()
