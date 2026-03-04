export const sumSchema = {
  name: 'sum',
  description: '计算两个数字的和。支持整数和浮点数。',
  parameters: {
    type: 'object',
    properties: {
      a: {
        type: 'number',
        description: '第一个加数',
      },
      b: {
        type: 'number',
        description: '第二个加数',
      },
    },
    required: ['a', 'b'], // 两个参数都是必填的
  },
}
