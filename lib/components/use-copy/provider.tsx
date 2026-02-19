import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import type { CopyConfig, CopyRegistryEntry } from './types'

interface CopyContextValue {
  config: CopyConfig
  editMode: boolean
  setEditMode: (mode: boolean) => void
  showOutlines: boolean
  setShowOutlines: (show: boolean) => void
  activeCopyKey: string | null
  registry: Map<string, CopyRegistryEntry>
  registerCopy: (key: string, defaults: Record<string, any>, resolved: Record<string, any>) => void
  saveCopy: (key: string, path: string, value: any) => Promise<void>
  version: number
}

const CopyContext = createContext<CopyContextValue | null>(null)

export function useCopyContext() {
  const ctx = useContext(CopyContext)
  if (!ctx) throw new Error('useCopyContext must be used within a CopyProvider')
  return ctx
}

export function CopyProvider({
  config,
  children,
}: {
  config: CopyConfig
  children: React.ReactNode
}) {
  const [editMode, setEditMode] = useState(false)
  const [showOutlines, setShowOutlines] = useState(false)
  const [version, setVersion] = useState(0)
  const registryRef = useRef(new Map<string, CopyRegistryEntry>())
  const activeCopyKeyRef = useRef<string | null>(null)

  const registerCopy = useCallback((key: string, defaults: Record<string, any>, resolved: Record<string, any>) => {
    activeCopyKeyRef.current = key
    registryRef.current.set(key, {
      defaults,
      overrides: null,
      resolved,
    })
  }, [])

  const saveCopy = useCallback(async (key: string, path: string, value: any) => {
    const endpoint = config.apiEndpoint || '/api/copy/save'

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, path, value }),
    })

    if (!res.ok) {
      throw new Error('Failed to save copy')
    }

    // Update the registry entry in-place so UI reflects the change
    const entry = registryRef.current.get(key)
    if (entry) {
      const keys = path.split('.')
      let obj = entry.resolved
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]]
      }
      obj[keys[keys.length - 1]] = value
    }

    setVersion(v => v + 1)
  }, [config.apiEndpoint])

  return (
    <CopyContext.Provider
      value={{
        config,
        editMode,
        setEditMode,
        showOutlines,
        setShowOutlines,
        activeCopyKey: activeCopyKeyRef.current,
        registry: registryRef.current,
        registerCopy,
        saveCopy,
        version,
      }}
    >
      {children}
    </CopyContext.Provider>
  )
}
