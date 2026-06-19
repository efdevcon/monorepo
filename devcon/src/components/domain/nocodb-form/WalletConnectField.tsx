import React from 'react'
import dynamic from 'next/dynamic'

interface Props {
  columnName: string
  label: string
  required?: boolean
  description?: string
  // When true, render only the button/connected state (no label/description) —
  // used inside the combined "Connections" block, which owns the heading.
  hideHeader?: boolean
}

// The wallet widget needs WagmiProvider + AppKit (createAppKit) mounted above its
// hooks. We load it lazily (ssr: false) so the wagmi/AppKit bundle and createAppKit
// side-effect are only pulled in when a form actually renders a Wallet Address field
// — other NocoDB forms are unaffected.
const WalletConnectFieldInner = dynamic(() => import('./WalletConnectFieldInner'), {
  ssr: false,
  loading: () => <p className="text-sm text-[#594d73]">Loading wallet…</p>,
})

export function WalletConnectField(props: Props) {
  return <WalletConnectFieldInner {...props} />
}
