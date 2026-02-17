import { useEffect, useMemo } from 'react'
import { createCopyProxy } from './proxy'
import { useCopyContext } from './provider'
import type { Proxied } from './types'

export function useCopy<T extends Record<string, any>>(
  key: string,
  defaults: T,
  serverContent?: T
): Proxied<T> {
  const { registerCopy, version } = useCopyContext()

  const resolved = serverContent ?? defaults

  useEffect(() => {
    registerCopy(key, defaults, resolved)
  }, [key, registerCopy]) // eslint-disable-line react-hooks/exhaustive-deps

  return useMemo(
    () => createCopyProxy(resolved, key),
    [resolved, key, version] // eslint-disable-line react-hooks/exhaustive-deps
  )
}
