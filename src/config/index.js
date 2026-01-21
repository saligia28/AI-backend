import 'dotenv/config'

const config = {
  // 服务器配置
  port: process.env.PORT || 3000,

  // AI配置
  ai: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASEURL,
    model: 'deepseek-chat',
  },
}

export default config
