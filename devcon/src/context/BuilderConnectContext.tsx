import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

// An automatic discount tier the applicant qualifies for (Core Devs free,
// Public Goods 50%, Past POAP 10%, …) — detected from their connected GitHub /
// wallet via the existing /api/discounts/validate endpoint.
export interface QualifyingDiscount {
  type: string
  name: string
  discount: number // 100 = free, else % off
}

// Only these tiers are worth steering a builder applicant to the store instead:
// Core Devs / Protocol Guild (free) and Public Good Projects (50%). OSS
// Contributors is now folded into the builder discount, and Past-POAP (10%) is
// worse than applying as a builder — so neither is surfaced.
const WARN_DISCOUNT_TYPES = new Set(['core-devs', 'pg-projects'])

// Check a GitHub username or wallet address against the auto-discount lists.
export async function checkAutoDiscount(id: string): Promise<QualifyingDiscount | null> {
  if (!id) return null
  try {
    const res = await fetch(`/api/discounts/validate/${encodeURIComponent(id)}/`)
    if (!res.ok) return null
    const json = await res.json()
    const discounts = Array.isArray(json?.data?.discounts) ? json.data.discounts : []
    const top = discounts.filter((d: QualifyingDiscount) => WARN_DISCOUNT_TYPES.has(d.type))[0]
    if (top && typeof top.discount === 'number' && top.discount > 0) {
      return { type: top.type, name: top.name, discount: top.discount }
    }
    return null
  } catch {
    return null
  }
}

// Holds the wallet SIWE proof (for submit) plus any auto-discount the applicant
// qualifies for (so the form can nudge them to the ticket store instead).
interface BuilderConnectState {
  walletProof: string | null
  setWalletProof: (p: string | null) => void
  qualifyingDiscount: QualifyingDiscount | null
  /** Report a detected discount; keeps the best (highest %) seen across connectors. */
  reportDiscount: (d: QualifyingDiscount | null) => void
}

const noop = () => undefined

const BuilderConnectContext = createContext<BuilderConnectState>({
  walletProof: null,
  setWalletProof: noop,
  qualifyingDiscount: null,
  reportDiscount: noop,
})

export function BuilderConnectProvider({ children }: { children: React.ReactNode }) {
  const [walletProof, setWalletProof] = useState<string | null>(null)
  const [qualifyingDiscount, setQualifyingDiscount] = useState<QualifyingDiscount | null>(null)

  const reportDiscount = useCallback((d: QualifyingDiscount | null) => {
    if (!d) return
    setQualifyingDiscount(prev => (!prev || d.discount > prev.discount ? d : prev))
  }, [])

  const value = useMemo(
    () => ({ walletProof, setWalletProof, qualifyingDiscount, reportDiscount }),
    [walletProof, qualifyingDiscount, reportDiscount]
  )
  return <BuilderConnectContext.Provider value={value}>{children}</BuilderConnectContext.Provider>
}

export function useBuilderConnect(): BuilderConnectState {
  return useContext(BuilderConnectContext)
}
