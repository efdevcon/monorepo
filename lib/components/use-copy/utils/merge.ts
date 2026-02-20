export function deepMerge<T extends Record<string, any>>(defaults: T, overrides: Partial<T>): T {
  const result = { ...defaults }

  for (const key of Object.keys(overrides) as (keyof T)[]) {
    if (!(key in defaults)) continue

    const defaultVal = defaults[key]
    const overrideVal = overrides[key]

    if (
      overrideVal !== null &&
      overrideVal !== undefined &&
      typeof defaultVal === 'object' &&
      typeof overrideVal === 'object' &&
      !Array.isArray(defaultVal) &&
      !Array.isArray(overrideVal)
    ) {
      result[key] = deepMerge(defaultVal, overrideVal as any)
    } else if (overrideVal !== undefined) {
      result[key] = overrideVal as T[keyof T]
    }
  }

  return result
}
