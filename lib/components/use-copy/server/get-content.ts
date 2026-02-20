import { deepMerge } from '../utils/merge'
import { readOverrides } from './fs-writer'

export function getCopyContent<T extends Record<string, any>>(
  key: string,
  defaults: T,
  options: { basePath: string }
): T {
  const overrides = readOverrides(options.basePath, key)

  if (!overrides) return defaults

  return deepMerge(defaults, overrides as Partial<T>)
}
