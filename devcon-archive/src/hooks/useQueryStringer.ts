import { useLocation } from '@reach/router'
import queryString from 'query-string'

export const useQueryStringer = (object: { [key: string]: any }, replaceState?: boolean, preserveUnmanagedKeys?: boolean): string => {
  const isBrowser = typeof window !== 'undefined'
  const location = useLocation()
  let formattedObject = {} as any

  Object.entries(object).forEach(([key, val]) => {
    if (!val) return

    if (typeof val === 'object') {
      formattedObject[key] = Object.keys(val)
    }
    if (typeof val === 'string') {
      formattedObject[key] = val
    }
  })

  // "preserveUnmanagedKeys" will ensure only the keys passed to useQueryString are updated - any existing query strings won't be affected/overwritten by useQueryStringer
  // This is highly contextual so it's off by default
  if (preserveUnmanagedKeys) {
    const managedKeys = Object.keys(object);
    const currentQueryString = queryString.parse(location.search);
    const unmanagedKeys = Object.entries(currentQueryString).reduce((acc, [key, val]) => {
      if (managedKeys.includes(key)) return acc;

      acc[key] = val;

      return acc;
    }, {} as { [key: string]: any });

    formattedObject = {
      ...formattedObject,
      ...unmanagedKeys
    };
  }

  let result = `?${queryString.stringify(formattedObject)}`

  if (result === '?') result = ''

  if (replaceState && isBrowser) {
    const url = `${location.pathname}${result}`
    window.history.replaceState({ path: url }, '', url)
  }

  return result
}
