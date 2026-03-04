export const getTimeSchema = {
  name: 'getTime',
  description: '获取指定时区的当前时间。如果不指定时区,返回北京时间。',
  parameters: {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description: '时区标识符,例如: UTC, Asia/Shanghai, America/New_York',
        enum: ['UTC', 'Asia/Shanghai', 'America/New_York'],
        default: 'Asia/Shanghai',
      },
    },
    required: [], // 注意:timezone 是可选的,所以 required 为空数组
  },
}
