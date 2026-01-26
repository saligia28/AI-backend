# 日志管理脚本使用说明

本目录包含用于日志分析、过滤和监控的工具脚本。

## 目录

- [日志统计工具](#日志统计工具)
- [日志过滤工具](#日志过滤工具)
- [日志告警工具](#日志告警工具)

---

## 日志统计工具

**文件**: `log-stats.js`

用于分析日志文件，统计各级别日志数量、错误信息和慢请求。

### 使用方法

```bash
# 分析指定日志文件
node scripts/log-stats.js logs/app-2026-01-26.log

# 分析默认日志文件
node scripts/log-stats.js
```

### 输出示例

```json
{
  "total": 100,
  "byLevel": {
    "INFO": 85,
    "WARN": 10,
    "ERROR": 5
  },
  "errors": [...],
  "slowRequests": [...]
}
```

---

## 日志过滤工具

**文件**: `log-filter.js`

功能强大的日志过滤工具，支持按级别、时间范围、关键词进行多维度过滤。

### 命令行选项

| 选项 | 简写 | 说明 | 示例 |
|------|------|------|------|
| `--level` | `-l` | 按日志级别过滤 | `--level ERROR,WARN` |
| `--from` | - | 开始时间 | `--from "2026-01-26 14:00:00"` |
| `--to` | - | 结束时间 | `--to "2026-01-26 15:00:00"` |
| `--keyword` | `-k` | 关键词搜索 | `--keyword "slow request"` |
| `--file` | `-f` | 指定日志文件 | `--file logs/app-2026-01-26.log` |
| `--output` | `-o` | 输出到文件 | `--output filtered.log` |
| `--help` | `-h` | 显示帮助信息 | - |

### 使用示例

#### 1. 过滤错误日志

```bash
node scripts/log-filter.js --level ERROR
```

#### 2. 过滤警告和错误

```bash
node scripts/log-filter.js --level WARN,ERROR
```

#### 3. 按时间范围过滤

```bash
node scripts/log-filter.js --from "2026-01-26 14:00:00" --to "2026-01-26 15:00:00"
```

#### 4. 组合过滤条件

```bash
node scripts/log-filter.js --level ERROR --from "2026-01-26 14:00:00" --keyword "database"
```

#### 5. 保存过滤结果到文件

```bash
node scripts/log-filter.js --level ERROR --output error-logs.txt
```

#### 6. 关键词搜索

```bash
node scripts/log-filter.js --keyword "slow request"
node scripts/log-filter.js --keyword "API"
```

#### 7. 指定特定日志文件

```bash
node scripts/log-filter.js --file logs/app-2026-01-26.log --level ERROR
```

### 输出说明

过滤工具会输出：
- **统计信息**：总日志数、匹配数、匹配率、按级别统计
- **过滤结果**：
  - 控制台显示前 100 条（超过会提示使用 `--output` 保存完整结果）
  - 使用 `--output` 可保存所有结果到文件

### 默认行为

- 未指定 `--file` 时，自动处理 `logs` 目录下最近 7 天的 `app-*.log` 文件
- 未指定 `--level` 时，显示所有级别的日志
- 未指定 `--output` 时，结果输出到控制台

---

## 日志告警工具

**文件**: `log-alert.js`

实时监控日志文件，当错误日志超过设定阈值时自动触发告警通知。

### 命令行选项

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--threshold` | `-t` | 错误阈值 | 5 |
| `--interval` | `-i` | 检查间隔（秒） | 300（5分钟） |
| `--config` | `-c` | 配置文件路径 | - |
| `--history` | - | 查看告警历史 | - |
| `--help` | `-h` | 显示帮助信息 | - |

### 使用示例

#### 1. 使用默认设置启动监控

```bash
node scripts/log-alert.js
```

默认配置：
- 错误阈值：5 条
- 检查间隔：5 分钟
- 警告阈值：10 条（错误阈值的 2 倍）

#### 2. 自定义阈值和间隔

```bash
# 错误阈值 10 条，每分钟检查一次
node scripts/log-alert.js --threshold 10 --interval 60
```

#### 3. 使用配置文件

```bash
node scripts/log-alert.js --config config/alert-config.json
```

#### 4. 查看告警历史

```bash
node scripts/log-alert.js --history
```

### 配置文件

配置文件位置：`config/alert-config.json`

```json
{
  "threshold": 5,
  "interval": 60,
  "notifiers": [
    {
      "type": "email",
      "recipients": ["admin@example.com", "dev@example.com"]
    },
    {
      "type": "webhook",
      "url": "https://hooks.example.com/alerts"
    }
  ]
}
```

### 告警级别

| 级别 | 触发条件 | 说明 |
|------|----------|------|
| CRITICAL | 错误数 ≥ 阈值 | 严重告警，需要立即处理 |
| WARNING | 警告数 ≥ 阈值×2 | 警告告警，需要关注 |

### 通知方式

工具支持多种通知方式：

#### 1. 控制台通知（默认）

直接在控制台输出告警信息。

#### 2. 邮件通知

需要在配置文件中配置邮件接收者：

```json
{
  "notifiers": [
    {
      "type": "email",
      "recipients": ["admin@example.com"]
    }
  ]
}
```

#### 3. Webhook 通知

支持发送告警到指定的 webhook URL：

```json
{
  "notifiers": [
    {
      "type": "webhook",
      "url": "https://hooks.example.com/alerts"
    }
  ]
}
```

### 告警信息内容

告警会包含以下信息：
- 告警时间
- 告警级别（CRITICAL / WARNING）
- 错误数量
- 警告数量
- 阈值
- 统计周期
- 最近的错误/警告日志（最多 5 条）

### 告警记录

所有告警会自动记录到：`logs/alerts.log`

格式为 JSON 行格式（每行一个 JSON 对象），包含：
- 时间戳
- 告警级别
- 错误/警告数量
- 最近的错误/警告消息（最多 3 条）

### 停止监控

按 `Ctrl+C` 优雅退出监控程序，会显示监控期间的告警统计。

---

## 日志格式说明

所有工具都基于以下日志格式进行解析：

```
[YYYY-MM-DD HH:mm:ss] [LEVEL] message
```

示例：
```
[2026-01-26 14:16:33] [INFO] Server is running on http://localhost:3000
[2026-01-26 14:16:49] [ERROR] Database connection failed
```

### 支持的日志级别

- `INFO` - 信息日志
- `WARN` - 警告日志
- `ERROR` - 错误日志
- `DEBUG` - 调试日志

---

## 常见使用场景

### 场景 1：排查今天的所有错误

```bash
node scripts/log-filter.js --level ERROR --from "2026-01-26 00:00:00"
```

### 场景 2：查找特定时间段的慢请求

```bash
node scripts/log-filter.js --keyword "slow request" --from "2026-01-26 14:00:00" --to "2026-01-26 15:00:00"
```

### 场景 3：导出错误日志给开发团队

```bash
node scripts/log-filter.js --level ERROR --output errors-for-dev.txt
```

### 场景 4：生产环境实时监控

```bash
# 错误阈值 3 条，每分钟检查
node scripts/log-alert.js --threshold 3 --interval 60
```

### 场景 5：测试环境宽松监控

```bash
# 错误阈值 20 条，每 10 分钟检查
node scripts/log-alert.js --threshold 20 --interval 600
```

---

## 最佳实践

### 日志过滤

1. **定期导出错误日志**：建议每天导出错误日志进行分析
2. **使用时间范围**：处理大量日志时，使用时间范围可以提高性能
3. **保存重要结果**：使用 `--output` 保存重要的过滤结果
4. **组合条件**：灵活组合多个过滤条件以精确定位问题

### 日志告警

1. **合理设置阈值**：根据应用规模和流量调整阈值
2. **调整检查间隔**：生产环境建议 1-5 分钟，测试环境可适当放宽
3. **配置多种通知**：同时配置邮件和 Webhook，确保告警不遗漏
4. **定期查看历史**：使用 `--history` 分析告警趋势，优化阈值设置
5. **后台运行**：生产环境建议使用 PM2 等进程管理工具运行

### 使用 PM2 运行告警监控

```bash
# 安装 PM2
npm install -g pm2

# 启动告警监控
pm2 start scripts/log-alert.js --name "log-alert" -- --threshold 5 --interval 300

# 查看状态
pm2 status

# 查看日志
pm2 logs log-alert

# 停止
pm2 stop log-alert

# 设置开机自启
pm2 startup
pm2 save
```

---

## 故障排除

### 问题：找不到日志文件

检查 `logs` 目录是否存在，以及日志文件命名格式是否为 `app-YYYY-MM-DD.log`。

### 问题：过滤结果为空

1. 检查日志级别是否正确（大小写敏感）
2. 检查时间格式是否正确
3. 使用 `--help` 查看正确的参数格式

### 问题：告警未触发

1. 检查阈值设置是否合理
2. 确认检查间隔内是否有足够的错误日志
3. 查看控制台是否有错误提示

### 问题：配置文件无效

1. 确认配置文件为有效的 JSON 格式
2. 检查文件路径是否正确
3. 查看控制台错误信息

---

## 技术支持

如有问题或建议，请联系开发团队。
