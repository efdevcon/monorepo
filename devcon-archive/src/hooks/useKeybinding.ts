import React, { useEffect } from 'react'

const useKeyBinding = (onKeyDown: (...args: any[]) => any, keys: string[], modifiers?: string[]) => {
  useEffect(() => {
    const handler = (e: React.SyntheticEvent) => {
      if (e.defaultPrevented) {
        return
      }

      if (modifiers && !modifiers.every(modifier => e[modifier])) return

      var key = e.key || e.keyCode

      if (keys.includes(key)) {
        onKeyDown(e, true)
      }
    }

    document.addEventListener('keyup', handler)

    return () => document.removeEventListener('keyup', handler)
  })
}

export default useKeyBinding
