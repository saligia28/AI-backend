/**
 * 计算两个数的和
 * @param {number} a - 第一个数
 * @param {number} b - 第二个数
 * @returns {number} 两数之和
 */
export function sum(a, b) {
  // 参数验证
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('参数必须是数字类型')
  }

  if (isNaN(a) || isNaN(b)) {
    throw new Error('参数不能是 NaN')
  }

  const result = a + b

  return result
}

// 测试函数
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('sum(10, 20) =', sum(10, 20)) // 30
  console.log('sum(-5, 5) =', sum(-5, 5)) // 0
  console.log('sum(3.14, 2.86) =', sum(3.14, 2.86)) // 6

  // 测试错误处理
  try {
    sum('10', 20) // 应该抛出错误
  } catch (error) {
    console.log('错误捕获:', error.message)
  }
}
