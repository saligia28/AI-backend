import 'dotenv/config'

const config = {
  // 服务器配置
  port: process.env.PORT || 3000,

  // AI配置
  ai: {
    // 默认提供商
    defaultProvider: process.env.AI_DEFAULT_PROVIDER || 'deepseek',

    // DeepSeek 配置
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASEURL || 'https://api.deepseek.com',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    },

    // OpenAI 配置
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    },
  },
}

export default config
