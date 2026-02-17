import { CopyValue, type Proxied } from './types'

export function createCopyProxy<T extends Record<string, any>>(
  content: T,
  copyKey: string,
  pathPrefix?: string
): Proxied<T> {
  return new Proxy(content, {
    get(target, prop, receiver) {
      if (typeof prop === 'symbol' || prop === '__proto__') {
        return Reflect.get(target, prop, receiver)
      }

      const key = prop as string
      if (!(key in target)) return undefined

      const value = target[key]
      const fullPath = pathPrefix ? `${pathPrefix}.${key}` : key

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return createCopyProxy(value, copyKey, fullPath)
      }

      return new CopyValue(value, copyKey, fullPath)
    },
  }) as Proxied<T>
}
