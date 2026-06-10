export function assertEqual<T>(actual: T, expected: T, label: string): void {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) throw new Error(`FAIL ${label}: expected ${e}, got ${a}`)
  console.log(`  ok: ${label}`)
}
