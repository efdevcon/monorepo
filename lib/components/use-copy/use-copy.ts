import { useEffect } from 'react'
import { useCopyContext } from './provider'

function tagStrings(data: any, copyKey: string, path = ''): any {
  if (typeof data === 'string') {
    const s = new String(data) as any
    s.__copyKey = copyKey
    s.__copyPath = path
    return s
  }
  if (typeof data === 'object' && data !== null) {
    const out: any = {}
    for (const [k, v] of Object.entries(data)) {
      out[k] = tagStrings(v, copyKey, path ? `${path}.${k}` : k)
    }
    return out
  }
  return data
}

export function useCopy<T extends Record<string, any>>(
  key: string,
  defaults: T,
  serverContent?: T
): T {
  const { registerCopy, config, version } = useCopyContext()

  const resolved = serverContent ?? defaults

  useEffect(() => {
    registerCopy(key, defaults, resolved)
  }, [key, registerCopy]) // eslint-disable-line react-hooks/exhaustive-deps

  if (config.devMode) {
    return tagStrings(resolved, key) as T
  }

  return resolved
}
