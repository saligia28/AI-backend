# AI Backend

基于 Express.js 构建的多模型 AI 后端服务，支持 DeepSeek / OpenAI 双提供商，提供标准聊天、流式输出（SSE）和 Function Calling 能力。

---

## 功能特性

- **多模型支持** — 适配器模式统一封装 DeepSeek 与 OpenAI，一行配置切换
- **流式输出** — Server-Sent Events（SSE）实时推送 token
- **Function Calling** — 注册自定义函数，支持 AI 连续多步调用（while 循环）
- **请求验证** — Joi 多层校验，拦截非法请求
- **日志系统** — Winston + 按天轮转，分级记录，自动清理
- **性能监控** — 慢请求告警、请求统计、内存快照
- **统一错误处理** — 自定义错误类 + 全局中间件，开发/生产双模式

---

## 项目结构

```
ai-backend/
├── functions/              # AI 可调用的函数实现
│   ├── getTime.js          # 获取指定时区当前时间
│   └── sum.js              # 计算两数之和
├── schemas/                # Function Calling 的参数描述（OpenAI 格式）
│   ├── getTime.schema.js
│   └── sum.schema.js
├── scripts/                # 日志分析工具
│   ├── log-alert.js        # 错误阈值告警
│   ├── log-filter.js       # 按级别/时间/关键词过滤
│   └── log-stats.js        # 日志统计报告
├── src/
│   ├── adapters/           # AI 提供商适配器
│   │   ├── base.adapter.js
│   │   ├── deepseek.adapter.js
│   │   ├── openai.adapter.js
│   │   └── factory.js      # 提供商注册 & 创建
│   ├── config/
│   │   ├── index.js        # 全局配置（读取 .env）
│   │   └── functions.js    # 函数执行器初始化
│   ├── constants/
│   │   └── errorCodes.js   # 统一错误码
│   ├── controllers/
│   │   └── chat.controller.js  # 请求处理，Function Calling 循环
│   ├── errors/             # 自定义错误类
│   ├── middleware/
│   │   ├── cors.js
│   │   ├── errorHandler.js # 全局错误处理 & 404
│   │   ├── performance.js  # 耗时统计 & 慢请求告警
│   │   ├── requestLogger.js
│   │   └── validator.js    # 请求体大小校验
│   ├── routes/
│   │   ├── index.js        # 健康检查 & 统计路由
│   │   └── chat.routes.js  # 聊天路由
│   ├── services/
│   │   └── ai.service.js   # AI 服务编排
│   ├── utils/
│   │   ├── asyncHandler.js
│   │   ├── functionExecutor.js  # 函数注册 & 执行
│   │   ├── logger.js       # Winston 配置
│   │   ├── logHelper.js
│   │   ├── response.js     # 统一响应格式
│   │   └── streamHandler.js     # SSE 流处理
│   └── app.js              # Express 应用 & 中间件装配
├── logs/                   # 运行时日志（自动生成）
├── .env.example
└── server.js               # 入口文件
```

---

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装

```bash
git clone <repo-url>
cd ai-backend
npm install
```

### 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，至少填写 `DEEPSEEK_API_KEY`：

```env
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
```

### 启动

```bash
# 开发模式（nodemon 热重载）
npm run dev

# 生产模式
npm start
```

服务默认运行在 `http://localhost:3000`。

---

## API 文档

### 基础路径：`/api`

### `POST /api/chat` — 标准聊天

支持多轮对话和 Function Calling。

**请求体**

```json
{
  "messages": [
    { "role": "user", "content": "帮我算 3 + 5" }
  ],
  "provider": "deepseek",
  "model": "deepseek-chat",
  "temperature": 0.7,
  "maxTokens": 2000,
  "functions": [
    {
      "name": "sum",
      "description": "计算两个数的和",
      "parameters": {
        "type": "object",
        "properties": {
          "a": { "type": "number", "description": "第一个数" },
          "b": { "type": "number", "description": "第二个数" }
        },
        "required": ["a", "b"]
      }
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `messages` | array | ✅ | 对话历史，1-50 条 |
| `provider` | string | ❌ | `deepseek` / `openai`，默认取 `AI_DEFAULT_PROVIDER` |
| `model` | string | ❌ | 模型名称，默认取各提供商配置 |
| `temperature` | number | ❌ | 0-2，控制随机性 |
| `maxTokens` | number | ❌ | 1-8000 |
| `functions` | array | ❌ | Function Calling 函数定义列表 |

**响应**

```json
{
  "success": true,
  "data": {
    "content": "3 + 5 = 8，现在北京时间是 2026/04/14 16:00:00",
    "role": "assistant",
    "calledFunctions": [
      {
        "name": "sum",
        "arguments": "{\"a\":3,\"b\":5}"
      },
      {
        "name": "getTime",
        "arguments": "{\"timezone\":\"Asia/Shanghai\"}"
      }
    ]
  }
}
```

---

### `POST /api/chat/stream` — 流式聊天（SSE）

参数格式与 `/api/chat` 相同，响应为 `text/event-stream`。

**响应格式**

```
data: {"type":"function_call","name":"sum","arguments":"{\"a\":3,\"b\":5}"}

data: {"type":"function_call","name":"getTime","arguments":"{\"timezone\":\"Asia/Shanghai\"}"}

data: {"choices":[{"delta":{"content":"3"},...}]}

data: {"choices":[{"delta":{"content":" +"},...}]}

data: [DONE]
```

**前端接入示例**

```js
const res = await fetch('/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: [{ role: 'user', content: '你好' }] }),
})

const reader = res.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  const text = decoder.decode(value)
  // 解析 "data: {...}" 格式
  const lines = text.split('\n').filter(l => l.startsWith('data:'))
  for (const line of lines) {
    const data = line.slice(5).trim()
    if (data === '[DONE]') break
    const chunk = JSON.parse(data)
    process.stdout.write(chunk.choices[0]?.delta?.content ?? '')
  }
}
```

---

### `GET /api/providers` — 查询可用提供商

```json
{
  "success": true,
  "data": {
    "providers": ["deepseek"]
  }
}
```

---

### `GET /api/health` — 健康检查

```json
{
  "status": "ok",
  "timestamp": "2026-04-13T10:00:00.000Z",
  "uptime": 123.4,
  "memory": { "heapUsed": 20971520, "heapTotal": 33554432 }
}
```

---

### `GET /api/stats` — 请求统计

```json
{
  "success": true,
  "data": {
    "requests": {
      "POST /api/chat": { "count": 42, "avgDuration": 380 }
    },
    "memory": { "heapUsed": 20971520 },
    "uptime": 3600
  }
}
```

---

## Function Calling

### 已注册函数

| 函数名 | 参数 | 说明 |
|--------|------|------|
| `getTime` | `timezone?: string` | 获取指定时区当前时间，默认 `Asia/Shanghai` |
| `sum` | `a: number, b: number` | 计算两数之和 |

### 注册新函数

**① 在 `functions/` 目录添加实现**

```js
// functions/multiply.js
export function multiply({ a, b }) {
  return a * b
}
```

**② 在 `schemas/` 目录添加描述**

```js
// schemas/multiply.schema.js
export const multiplySchema = {
  name: 'multiply',
  description: '计算两个数的乘积',
  parameters: {
    type: 'object',
    properties: {
      a: { type: 'number', description: '被乘数' },
      b: { type: 'number', description: '乘数' },
    },
    required: ['a', 'b'],
  },
}
```

**③ 在 `src/config/functions.js` 注册**

```js
import { multiply } from '../../functions/multiply.js'

export function initFunctions() {
  functionExecutor.registerAll({
    getTime,
    sum,
    multiply,   // ← 添加这一行
  })
}
```

---

## 环境变量说明

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `NODE_ENV` | `development` | 环境模式，production 下隐藏错误栈 |
| `PORT` | `3000` | 服务监听端口 |
| `DEEPSEEK_API_KEY` | — | **必填**，DeepSeek API 密钥 |
| `DEEPSEEK_BASEURL` | `https://api.deepseek.com` | DeepSeek 接口地址 |
| `DEEPSEEK_MODEL` | `deepseek-chat` | 默认模型 |
| `OPENAI_API_KEY` | — | 使用 OpenAI 时填写 |
| `OPENAI_MODEL` | `gpt-3.5-turbo` | OpenAI 默认模型 |
| `AI_DEFAULT_PROVIDER` | `deepseek` | 默认 AI 提供商 |
| `CORS_ORIGIN` | `http://localhost:5173` | 允许跨域的前端地址 |
| `LOG_LEVEL` | `info` | 日志级别：`debug` / `info` / `warn` / `error` |
| `SLOW_REQUEST_THRESHOLD` | `1000` | 慢请求告警阈值（毫秒） |
| `REQUEST_BODY_MAX_SIZE` | `1048576` | 请求体大小上限（字节，默认 1MB） |

---

## 技术栈

| 模块 | 库 | 版本 |
|------|-----|------|
| Web 框架 | Express | 5.x |
| AI SDK | openai | 6.x |
| 请求验证 | Joi | 18.x |
| 日志 | Winston + winston-daily-rotate-file | 3.x |
| 热重载（开发） | nodemon | 3.x |
