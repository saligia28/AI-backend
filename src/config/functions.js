import functionExecutor from '../utils/functionExecutor.js'
import { getTime } from '../../functions/getTime.js'
import { sum } from '../../functions/sum.js'
import { getTimeSchema } from '../../schemas/getTime.schema.js'
import { sumSchema } from '../../schemas/sum.schema.js'

const functionSchemas = [getTimeSchema, sumSchema]

export function getFunctionDefinitions() {
  return structuredClone(functionSchemas)
}

export function getToolDefinitions() {
  return getFunctionDefinitions().map((schema) => ({
    type: 'function',
    function: schema,
  }))
}

/**
 * 初始化函数执行器
 * 注册所有可用函数
 */
export function initFunctions() {
  // 方式 1: 单个注册
  functionExecutor.register('getTime', (args) => {
    return getTime(args.timezone)
  })

  functionExecutor.register('sum', (args) => {
    return sum(args.a, args.b)
  })

  // 方式 2: 批量注册
  // functionExecutor.registerAll({
  //   getTime: (args) => getTime(args.timezone),
  //   sum: (args) => sum(args.a, args.b),
  // })

  console.log(`Registered functions: ${functionExecutor.list().join(', ')}`)
}
