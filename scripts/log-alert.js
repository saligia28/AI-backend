import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 日志告警工具
 * 功能：监控日志文件，当错误日志超过阈值时发送告警
 *
 * 使用示例：
 * node scripts/log-alert.js
 * node scripts/log-alert.js --threshold 10 --interval 60
 * node scripts/log-alert.js --config config/alert.json
 */

class LogAlertMonitor {
  constructor(options = {}) {
    this.threshold = options.threshold || 5 // 错误阈值
    this.interval = options.interval || 300 // 检查间隔（秒），默认5分钟
    this.logDir = options.logDir || path.join(__dirname, '../logs')
    this.alertFile = options.alertFile || path.join(__dirname, '../logs/alerts.log')
    this.notifiers = options.notifiers || []
    this.lastCheckTime = new Date()
    this.alertHistory = []
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
   * 分析日志文件
   */
  analyzeLogFile(filePath, sinceTime) {
    if (!fs.existsSync(filePath)) {
      return {
        total: 0,
        errors: [],
        warnings: [],
        byLevel: {},
      }
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())

    const result = {
      total: 0,
      errors: [],
      warnings: [],
      byLevel: {},
    }

    for (const line of lines) {
      const logEntry = this.parseLogLine(line)
      if (!logEntry) continue

      // 只统计指定时间之后的日志
      if (logEntry.timestamp <= sinceTime) continue

      result.total++
      result.byLevel[logEntry.level] = (result.byLevel[logEntry.level] || 0) + 1

      if (logEntry.level === 'ERROR') {
        result.errors.push(logEntry)
      } else if (logEntry.level === 'WARN') {
        result.warnings.push(logEntry)
      }
    }

    return result
  }

  /**
   * 检查是否需要告警
   */
  checkAndAlert() {
    const now = new Date()
    console.log(`[${now.toISOString()}] 开始检查日志...`)

    // 获取当前日期的日志文件
    const today = now.toISOString().split('T')[0]
    const logFile = path.join(this.logDir, `app-${today}.log`)
    const errorLogFile = path.join(this.logDir, `error-${today}.log`)

    // 分析日志
    const appLogStats = this.analyzeLogFile(logFile, this.lastCheckTime)
    const errorLogStats = this.analyzeLogFile(errorLogFile, this.lastCheckTime)

    // 合并统计
    const totalErrors = appLogStats.errors.length + errorLogStats.errors.length
    const totalWarnings = appLogStats.warnings.length + errorLogStats.warnings.length

    console.log(`  新增日志: ${appLogStats.total + errorLogStats.total} 条`)
    console.log(`  错误: ${totalErrors} 条`)
    console.log(`  警告: ${totalWarnings} 条`)

    // 检查阈值
    if (totalErrors >= this.threshold) {
      const alert = {
        timestamp: now,
        level: 'CRITICAL',
        errorCount: totalErrors,
        warningCount: totalWarnings,
        threshold: this.threshold,
        period: `${this.interval}秒`,
        errors: [...appLogStats.errors, ...errorLogStats.errors],
      }

      this.triggerAlert(alert)
    } else if (totalWarnings >= this.threshold * 2) {
      // 警告数量达到错误阈值的2倍时也告警
      const alert = {
        timestamp: now,
        level: 'WARNING',
        errorCount: totalErrors,
        warningCount: totalWarnings,
        threshold: this.threshold * 2,
        period: `${this.interval}秒`,
        warnings: [...appLogStats.warnings, ...errorLogStats.warnings],
      }

      this.triggerAlert(alert)
    }

    this.lastCheckTime = now
  }

  /**
   * 触发告警
   */
  triggerAlert(alert) {
    console.log('\n' + '='.repeat(80))
    console.log('🚨 触发告警！')
    console.log('='.repeat(80))
    console.log(`时间: ${alert.timestamp.toLocaleString('zh-CN')}`)
    console.log(`级别: ${alert.level}`)
    console.log(`错误数量: ${alert.errorCount}`)
    console.log(`警告数量: ${alert.warningCount}`)
    console.log(`阈值: ${alert.threshold}`)
    console.log(`统计周期: ${alert.period}`)

    // 显示最近的错误或警告
    if (alert.errors && alert.errors.length > 0) {
      console.log('\n最近的错误:')
      alert.errors.slice(-5).forEach((err, idx) => {
        console.log(`  ${idx + 1}. [${err.timestamp.toLocaleString('zh-CN')}] ${err.message}`)
      })
    }

    if (alert.warnings && alert.warnings.length > 0) {
      console.log('\n最近的警告:')
      alert.warnings.slice(-5).forEach((warn, idx) => {
        console.log(`  ${idx + 1}. [${warn.timestamp.toLocaleString('zh-CN')}] ${warn.message}`)
      })
    }

    console.log('='.repeat(80) + '\n')

    // 记录告警
    this.recordAlert(alert)

    // 发送通知
    this.sendNotifications(alert)

    // 保存到历史
    this.alertHistory.push(alert)
  }

  /**
   * 记录告警到文件
   */
  recordAlert(alert) {
    const alertLog = {
      timestamp: alert.timestamp.toISOString(),
      level: alert.level,
      errorCount: alert.errorCount,
      warningCount: alert.warningCount,
      threshold: alert.threshold,
      period: alert.period,
      recentErrors: alert.errors
        ? alert.errors.slice(-3).map(e => e.message)
        : [],
      recentWarnings: alert.warnings
        ? alert.warnings.slice(-3).map(w => w.message)
        : [],
    }

    const logEntry = JSON.stringify(alertLog) + '\n'

    try {
      fs.appendFileSync(this.alertFile, logEntry, 'utf-8')
      console.log(`告警已记录到: ${this.alertFile}`)
    } catch (error) {
      console.error('记录告警失败:', error.message)
    }
  }

  /**
   * 发送通知
   */
  async sendNotifications(alert) {
    for (const notifier of this.notifiers) {
      try {
        await notifier.send(alert)
      } catch (error) {
        console.error(`通知发送失败 (${notifier.name}):`, error.message)
      }
    }
  }

  /**
   * 启动监控
   */
  start() {
    console.log('='.repeat(80))
    console.log('日志告警监控已启动')
    console.log('='.repeat(80))
    console.log(`日志目录: ${this.logDir}`)
    console.log(`错误阈值: ${this.threshold}`)
    console.log(`检查间隔: ${this.interval}秒`)
    console.log(`告警文件: ${this.alertFile}`)
    console.log('='.repeat(80) + '\n')

    // 立即执行一次检查
    this.checkAndAlert()

    // 定时检查
    this.intervalId = setInterval(() => {
      this.checkAndAlert()
    }, this.interval * 1000)

    // 优雅退出
    process.on('SIGINT', () => {
      this.stop()
    })
    process.on('SIGTERM', () => {
      this.stop()
    })
  }

  /**
   * 停止监控
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      console.log('\n日志告警监控已停止')
      console.log(`总共触发 ${this.alertHistory.length} 次告警`)
      process.exit(0)
    }
  }

  /**
   * 查看告警历史
   */
  viewAlertHistory() {
    if (!fs.existsSync(this.alertFile)) {
      console.log('暂无告警记录')
      return
    }

    const content = fs.readFileSync(this.alertFile, 'utf-8')
    const alerts = content
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line))

    console.log(`\n=== 告警历史 (共 ${alerts.length} 条) ===\n`)

    alerts.forEach((alert, idx) => {
      console.log(`${idx + 1}. [${alert.timestamp}] ${alert.level}`)
      console.log(`   错误: ${alert.errorCount}, 警告: ${alert.warningCount}, 阈值: ${alert.threshold}`)
      if (alert.recentErrors.length > 0) {
        console.log(`   最近错误: ${alert.recentErrors[0]}`)
      }
      console.log()
    })
  }
}

/**
 * 通知器基类
 */
class Notifier {
  constructor(name) {
    this.name = name
  }

  async send(alert) {
    throw new Error('子类必须实现 send 方法')
  }
}

/**
 * 控制台通知器
 */
class ConsoleNotifier extends Notifier {
  constructor() {
    super('Console')
  }

  async send(alert) {
    console.log(`[${this.name}] 告警通知已发送`)
  }
}

/**
 * 邮件通知器（示例）
 */
class EmailNotifier extends Notifier {
  constructor(config) {
    super('Email')
    this.config = config
  }

  async send(alert) {
    // 这里可以集成真实的邮件发送服务，如 nodemailer
    console.log(`[${this.name}] 邮件告警已发送到: ${this.config.recipients.join(', ')}`)
    console.log(`   主题: [${alert.level}] 日志告警 - 错误数: ${alert.errorCount}`)
  }
}

/**
 * Webhook 通知器（示例）
 */
class WebhookNotifier extends Notifier {
  constructor(config) {
    super('Webhook')
    this.config = config
  }

  async send(alert) {
    // 这里可以发送 HTTP 请求到指定的 webhook URL
    console.log(`[${this.name}] Webhook 告警已发送到: ${this.config.url}`)

    // 示例：如果安装了 node-fetch 可以这样发送
    /*
    const response = await fetch(this.config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: alert.level,
        errorCount: alert.errorCount,
        warningCount: alert.warningCount,
        timestamp: alert.timestamp,
      }),
    })
    */
  }
}

/**
 * 解析命令行参数
 */
function parseArguments() {
  const args = process.argv.slice(2)
  const options = {
    threshold: 5,
    interval: 300,
    configFile: null,
    viewHistory: false,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--threshold':
      case '-t':
        if (args[i + 1]) {
          options.threshold = parseInt(args[++i], 10)
        }
        break
      case '--interval':
      case '-i':
        if (args[i + 1]) {
          options.interval = parseInt(args[++i], 10)
        }
        break
      case '--config':
      case '-c':
        if (args[i + 1]) {
          options.configFile = args[++i]
        }
        break
      case '--history':
        options.viewHistory = true
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
日志告警工具

用法:
  node scripts/log-alert.js [选项]

选项:
  -t, --threshold <number>   错误阈值，默认为 5
  -i, --interval <seconds>   检查间隔（秒），默认为 300（5分钟）
  -c, --config <file>        配置文件路径
  --history                  查看告警历史
  -h, --help                 显示帮助信息

示例:
  # 使用默认设置启动监控
  node scripts/log-alert.js

  # 自定义阈值和间隔
  node scripts/log-alert.js --threshold 10 --interval 60

  # 查看告警历史
  node scripts/log-alert.js --history

配置文件示例 (JSON):
{
  "threshold": 10,
  "interval": 300,
  "notifiers": [
    {
      "type": "email",
      "recipients": ["admin@example.com"]
    },
    {
      "type": "webhook",
      "url": "https://hooks.example.com/alerts"
    }
  ]
}
  `)
}

/**
 * 加载配置文件
 */
function loadConfig(configFile) {
  if (!configFile || !fs.existsSync(configFile)) {
    return {}
  }

  try {
    const content = fs.readFileSync(configFile, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('配置文件加载失败:', error.message)
    return {}
  }
}

/**
 * 创建通知器
 */
function createNotifiers(config) {
  const notifiers = [new ConsoleNotifier()]

  if (config.notifiers) {
    for (const notifierConfig of config.notifiers) {
      switch (notifierConfig.type) {
        case 'email':
          notifiers.push(new EmailNotifier(notifierConfig))
          break
        case 'webhook':
          notifiers.push(new WebhookNotifier(notifierConfig))
          break
      }
    }
  }

  return notifiers
}

/**
 * 主函数
 */
function main() {
  try {
    const options = parseArguments()

    // 加载配置文件
    const config = loadConfig(options.configFile)

    // 如果是查看历史，直接显示并退出
    if (options.viewHistory) {
      const monitor = new LogAlertMonitor()
      monitor.viewAlertHistory()
      return
    }

    // 合并配置
    const finalConfig = {
      threshold: options.threshold || config.threshold || 5,
      interval: options.interval || config.interval || 300,
      notifiers: createNotifiers(config),
    }

    // 创建并启动监控
    const monitor = new LogAlertMonitor(finalConfig)
    monitor.start()

  } catch (error) {
    console.error('错误:', error.message)
    process.exit(1)
  }
}

// 运行主函数
main()
