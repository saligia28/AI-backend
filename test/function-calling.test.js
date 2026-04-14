import test from 'node:test'
import assert from 'node:assert/strict'

import OpenAIAdapter from '../src/adapters/openai.adapter.js'
import aiService from '../src/services/ai.service.js'
import chatController from '../src/controllers/chat.controller.js'
import { StreamHandler } from '../src/utils/streamHandler.js'
import functionExecutor from '../src/utils/functionExecutor.js'
import { validateMessages } from '../src/middleware/validator.js'

function createMockResponse() {
  return {
    headers: {},
    body: [],
    jsonPayload: null,
    ended: false,
    setHeader(name, value) {
      this.headers[name] = value
    },
    write(chunk) {
      this.body.push(chunk)
    },
    json(payload) {
      this.jsonPayload = payload
      return payload
    },
    end() {
      this.ended = true
    },
  }
}

test('OpenAIAdapter formatResponse preserves function call payloads', () => {
  const adapter = new OpenAIAdapter({ apiKey: 'test-key', model: 'gpt-3.5-turbo' })

  const result = adapter.formatResponse({
    role: 'assistant',
    content: null,
    tool_calls: [
      {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'sum',
          arguments: '{"a":3,"b":5}',
        },
      },
    ],
  })

  assert.deepEqual(result.function_call, {
    name: 'sum',
    arguments: '{"a":3,"b":5}',
  })
  assert.equal(result.tool_calls?.length, 1)
})

test('chatStream forwards function definitions to aiService as tools', async () => {
  const originalChatStream = aiService.chatStream
  const originalChat = aiService.chat

  const recordedOptions = []
  aiService.chatStream = async (_messages, options) => {
    recordedOptions.push(options)
    return {
      async *[Symbol.asyncIterator]() {
        yield { choices: [{ delta: {}, finish_reason: 'stop' }] }
      },
    }
  }

  try {
    const req = {
      body: {
        messages: [{ role: 'user', content: '帮我算 3+5，然后告诉我现在北京时间' }],
        functions: [
          {
            name: 'sum',
            description: '计算两个数字的和',
            parameters: {
              type: 'object',
              properties: {
                a: { type: 'number' },
                b: { type: 'number' },
              },
              required: ['a', 'b'],
            },
          },
        ],
      },
    }
    const res = createMockResponse()

    await chatController.chatStream(req, res)

    assert.equal(recordedOptions.length, 1)
    assert.equal(recordedOptions[0].functions, undefined)
    assert.equal(recordedOptions[0].tools?.length, 1)
    assert.equal(recordedOptions[0].tools?.[0].function.name, 'sum')
  } finally {
    aiService.chatStream = originalChatStream
    aiService.chat = originalChat
  }
})

test('chatStream switches to non-stream follow-up after a tool call', async () => {
  const originalChatStream = aiService.chatStream
  const originalChat = aiService.chat
  const originalExecute = functionExecutor.execute

  let streamCalls = 0
  const chatCalls = []

  aiService.chatStream = async () => {
    streamCalls += 1
    return {
      async *[Symbol.asyncIterator]() {
        yield {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: 'call_1',
                    type: 'function',
                    function: {
                      name: 'sum',
                      arguments: '',
                    },
                  },
                ],
              },
              finish_reason: null,
            },
          ],
        }
        yield {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    function: {
                      arguments: '{"a":3,"b":5}',
                    },
                  },
                ],
              },
              finish_reason: 'tool_calls',
            },
          ],
        }
      },
    }
  }

  aiService.chat = async (messages, options) => {
    chatCalls.push({ messages: structuredClone(messages), options: structuredClone(options) })
    return {
      role: 'assistant',
      content: '15',
    }
  }

  try {
    functionExecutor.execute = () => 15

    const req = {
      body: {
        messages: [{ role: 'user', content: '帮我算 3+5' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'sum',
              description: '计算两个数字的和',
              parameters: {
                type: 'object',
                properties: {
                  a: { type: 'number' },
                  b: { type: 'number' },
                },
                required: ['a', 'b'],
              },
            },
          },
        ],
        tool_choice: 'required',
      },
    }
    const res = createMockResponse()

    await chatController.chatStream(req, res)

    assert.equal(streamCalls, 1)
    assert.equal(chatCalls.length, 1)
    assert.equal(chatCalls[0].options.tool_choice, undefined)
    assert.match(res.body.join(''), /"content":"15"/)
  } finally {
    aiService.chatStream = originalChatStream
    aiService.chat = originalChat
    functionExecutor.execute = originalExecute
  }
})

test('chat includes calledFunctions metadata after executing a function', async () => {
  const originalChat = aiService.chat
  const originalExecute = functionExecutor.execute

  let callCount = 0
  aiService.chat = async () => {
    callCount += 1

    if (callCount === 1) {
      return {
        role: 'assistant',
        content: null,
        function_call: {
          name: 'sum',
          arguments: '{"a":3,"b":5}',
        },
      }
    }

    return {
      role: 'assistant',
      content: '3 + 5 = 8，现在北京时间是 2026/04/14 16:00:00',
    }
  }

  try {
    functionExecutor.execute = () => 8

    const req = {
      body: {
        messages: [{ role: 'user', content: '帮我算 3+5，然后告诉我现在北京时间' }],
        functions: [
          {
            name: 'sum',
            description: '计算两个数字的和',
            parameters: {
              type: 'object',
              properties: {
                a: { type: 'number' },
                b: { type: 'number' },
              },
              required: ['a', 'b'],
            },
          },
        ],
      },
    }
    const res = createMockResponse()

    await chatController.chat(req, res)

    assert.equal(callCount, 2)
    assert.deepEqual(res.jsonPayload.data.calledFunctions, [
      {
        name: 'sum',
        arguments: '{"a":3,"b":5}',
      },
    ])
  } finally {
    aiService.chat = originalChat
    functionExecutor.execute = originalExecute
  }
})

test('chat prepends tool-grounding system message when tools are present', async () => {
  const originalChat = aiService.chat

  const recordedMessages = []
  aiService.chat = async (messages) => {
    recordedMessages.push(structuredClone(messages))
    return {
      role: 'assistant',
      content: 'done',
    }
  }

  try {
    const req = {
      body: {
        messages: [{ role: 'user', content: '帮我算 3+5' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'sum',
              description: '计算两个数字的和',
              parameters: {
                type: 'object',
                properties: {
                  a: { type: 'number' },
                  b: { type: 'number' },
                },
                required: ['a', 'b'],
              },
            },
          },
        ],
      },
    }
    const res = createMockResponse()

    await chatController.chat(req, res)

    assert.equal(recordedMessages.length, 1)
    assert.equal(recordedMessages[0][0].role, 'system')
    assert.match(recordedMessages[0][0].content, /tool 消息中的内容视为唯一事实来源/)
    assert.deepEqual(recordedMessages[0][1], { role: 'user', content: '帮我算 3+5' })
  } finally {
    aiService.chat = originalChat
  }
})

test('chat forwards DeepSeek-style tools and tool_choice to aiService', async () => {
  const originalChat = aiService.chat

  const recordedCalls = []
  aiService.chat = async (_messages, options) => {
    recordedCalls.push(options)
    return {
      role: 'assistant',
      content: 'done',
    }
  }

  try {
    const req = {
      body: {
        messages: [{ role: 'user', content: '帮我用工具算一下 3+5' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'sum',
              description: '计算两个数字的和',
              parameters: {
                type: 'object',
                properties: {
                  a: { type: 'number' },
                  b: { type: 'number' },
                },
                required: ['a', 'b'],
              },
            },
          },
        ],
        toolChoice: 'required',
      },
    }
    const res = createMockResponse()

    await chatController.chat(req, res)

    assert.equal(recordedCalls.length, 1)
    assert.equal(recordedCalls[0].functions, undefined)
    assert.equal(recordedCalls[0].tools?.length, 1)
    assert.deepEqual(recordedCalls[0].tools?.[0], req.body.tools[0])
    assert.equal(recordedCalls[0].tool_choice, 'required')
  } finally {
    aiService.chat = originalChat
  }
})

test('chat injects project tool definitions when enableFunctionCalling is true', async () => {
  const originalChat = aiService.chat

  const recordedCalls = []
  aiService.chat = async (_messages, options) => {
    recordedCalls.push(options)
    return {
      role: 'assistant',
      content: 'done',
    }
  }

  try {
    const req = {
      body: {
        messages: [{ role: 'user', content: '帮我算 3+5，然后告诉我现在北京时间' }],
        enableFunctionCalling: true,
      },
    }
    const res = createMockResponse()

    await chatController.chat(req, res)

    assert.equal(recordedCalls.length, 1)
    assert.equal(recordedCalls[0].tools?.length, 2)
    assert.deepEqual(recordedCalls[0].tools?.map((tool) => tool.function.name).sort(), ['getTime', 'sum'])
  } finally {
    aiService.chat = originalChat
  }
})

test('chat accepts snake_case fields from DeepSeek docs', async () => {
  const originalChat = aiService.chat

  const recordedCalls = []
  aiService.chat = async (_messages, options) => {
    recordedCalls.push(options)
    return {
      role: 'assistant',
      content: 'done',
    }
  }

  try {
    const req = {
      body: {
        messages: [{ role: 'user', content: '帮我用工具算一下 3+5' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'sum',
              description: '计算两个数字的和',
              parameters: {
                type: 'object',
                properties: {
                  a: { type: 'number' },
                  b: { type: 'number' },
                },
                required: ['a', 'b'],
              },
            },
          },
        ],
        max_tokens: 123,
        tool_choice: 'required',
        parallel_tool_calls: true,
      },
    }
    const res = createMockResponse()

    await chatController.chat(req, res)

    assert.equal(recordedCalls.length, 1)
    assert.equal(recordedCalls[0].max_tokens, 123)
    assert.equal(recordedCalls[0].tool_choice, 'required')
    assert.equal(recordedCalls[0].parallel_tool_calls, true)
  } finally {
    aiService.chat = originalChat
  }
})

test('chatStream injects project tool definitions when enable_function_calling is true', async () => {
  const originalChatStream = aiService.chatStream

  const recordedOptions = []
  aiService.chatStream = async (_messages, options) => {
    recordedOptions.push(options)
    return {
      async *[Symbol.asyncIterator]() {
        yield { choices: [{ delta: {}, finish_reason: 'stop' }] }
      },
    }
  }

  try {
    const req = {
      body: {
        messages: [{ role: 'user', content: '帮我算 3+5' }],
        enable_function_calling: true,
      },
    }
    const res = createMockResponse()

    await chatController.chatStream(req, res)

    assert.equal(recordedOptions.length, 1)
    assert.deepEqual(recordedOptions[0].tools?.map((tool) => tool.function.name).sort(), ['getTime', 'sum'])
  } finally {
    aiService.chatStream = originalChatStream
  }
})

test('chat appends tool messages using tool_call_id after a tool call', async () => {
  const originalChat = aiService.chat
  const originalExecute = functionExecutor.execute

  const recordedMessages = []
  let callCount = 0
  aiService.chat = async (messages) => {
    recordedMessages.push(structuredClone(messages))
    callCount += 1

    if (callCount === 1) {
      return {
        role: 'assistant',
        content: null,
        function_call: {
          name: 'sum',
          arguments: '{"a":3,"b":5}',
        },
        tool_calls: [
          {
            id: 'call_sum_1',
            type: 'function',
            function: {
              name: 'sum',
              arguments: '{"a":3,"b":5}',
            },
          },
        ],
      }
    }

    return {
      role: 'assistant',
      content: '3 + 5 = 8',
    }
  }

  try {
    functionExecutor.execute = () => 8

    const req = {
      body: {
        messages: [{ role: 'user', content: '帮我算 3+5' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'sum',
              description: '计算两个数字的和',
              parameters: {
                type: 'object',
                properties: {
                  a: { type: 'number' },
                  b: { type: 'number' },
                },
                required: ['a', 'b'],
              },
            },
          },
        ],
      },
    }
    const res = createMockResponse()

    await chatController.chat(req, res)

    assert.equal(callCount, 2)
    assert.equal(recordedMessages[1][0].role, 'system')
    assert.deepEqual(recordedMessages[1].slice(1), [
      { role: 'user', content: '帮我算 3+5' },
      {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call_sum_1',
            type: 'function',
            function: {
              name: 'sum',
              arguments: '{"a":3,"b":5}',
            },
          },
        ],
      },
      {
        role: 'tool',
        tool_call_id: 'call_sum_1',
        content: '8',
      },
    ])
  } finally {
    aiService.chat = originalChat
    functionExecutor.execute = originalExecute
  }
})

test('chat clears forced tool_choice after the first tool execution', async () => {
  const originalChat = aiService.chat
  const originalExecute = functionExecutor.execute

  const recordedOptions = []
  let callCount = 0
  aiService.chat = async (_messages, options) => {
    recordedOptions.push(structuredClone(options))
    callCount += 1

    if (callCount === 1) {
      return {
        role: 'assistant',
        content: null,
        function_call: {
          name: 'sum',
          arguments: '{"a":3,"b":5}',
        },
        tool_calls: [
          {
            id: 'call_sum_1',
            type: 'function',
            function: {
              name: 'sum',
              arguments: '{"a":3,"b":5}',
            },
          },
        ],
      }
    }

    return {
      role: 'assistant',
      content: '3 + 5 = 8',
    }
  }

  try {
    functionExecutor.execute = () => 8

    const req = {
      body: {
        messages: [{ role: 'user', content: '帮我算 3+5' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'sum',
              description: '计算两个数字的和',
              parameters: {
                type: 'object',
                properties: {
                  a: { type: 'number' },
                  b: { type: 'number' },
                },
                required: ['a', 'b'],
              },
            },
          },
        ],
        toolChoice: 'required',
      },
    }
    const res = createMockResponse()

    await chatController.chat(req, res)

    assert.equal(recordedOptions.length, 2)
    assert.equal(recordedOptions[0].tool_choice, 'required')
    assert.equal(recordedOptions[1].tool_choice, undefined)
  } finally {
    aiService.chat = originalChat
    functionExecutor.execute = originalExecute
  }
})

test('StreamHandler recognizes streamed tool_calls payloads', async () => {
  const res = createMockResponse()
  const handler = new StreamHandler(res)

  const stream = {
    async *[Symbol.asyncIterator]() {
      yield {
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: 'call_1',
                  type: 'function',
                  function: {
                    name: 'getTime',
                    arguments: '',
                  },
                },
              ],
            },
            finish_reason: null,
          },
        ],
      }
      yield {
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: 0,
                  function: {
                    arguments: '{"timezone":"Asia/Shanghai"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      }
    },
  }

  const outcome = await handler.handleStreamWithFunctionCall(stream)

  assert.deepEqual(outcome, {
    type: 'function_call',
    toolCallId: 'call_1',
    name: 'getTime',
    arguments: '{"timezone":"Asia/Shanghai"}',
  })
})

test('validateMessages allows assistant tool-calling history shapes', () => {
  const req = {
    body: {
      messages: [
        { role: 'user', content: '帮我算 3+5' },
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'call_1',
              type: 'function',
              function: {
                name: 'sum',
                arguments: '{"a":3,"b":5}',
              },
            },
          ],
        },
        {
          role: 'tool',
          tool_call_id: 'call_1',
          content: '15',
        },
      ],
    },
  }

  let nextCalled = false
  validateMessages(req, createMockResponse(), () => {
    nextCalled = true
  })

  assert.equal(nextCalled, true)
})
