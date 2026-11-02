import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'

// Lets a field finish async work (e.g. uploading a drawn signature) before
// react-hook-form snapshots the values for submission. handleSubmit clones the
// form values BEFORE running validators, so a setValue made during validation
// never reaches onSubmit — the work has to happen ahead of handleSubmit.

type BeforeSubmitHook = () => Promise<void>

interface BeforeSubmitContextValue {
  register: (hook: BeforeSubmitHook) => () => void
}

const BeforeSubmitContext = createContext<BeforeSubmitContextValue | null>(null)

/** Owner side: wraps the form in the Provider and runs every hook before submit. */
export function useBeforeSubmitHooks() {
  const hooks = useRef(new Set<BeforeSubmitHook>())
  const register = useCallback((hook: BeforeSubmitHook) => {
    hooks.current.add(hook)
    return () => {
      hooks.current.delete(hook)
    }
  }, [])
  const run = useCallback(async () => {
    await Promise.all(Array.from(hooks.current).map(hook => hook()))
  }, [])
  const value = useMemo(() => ({ register }), [register])
  return { value, run, Provider: BeforeSubmitContext.Provider }
}

/** Field side: `hook` runs (and is awaited) before every submit while mounted.
 *  Throwing from it aborts the submit; the field is expected to show why. */
export function useBeforeSubmit(hook: BeforeSubmitHook) {
  const ctx = useContext(BeforeSubmitContext)
  const hookRef = useRef(hook)
  hookRef.current = hook
  useEffect(() => ctx?.register(() => hookRef.current()), [ctx])
}
