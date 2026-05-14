/** Helpers for surfacing *which* wallet the buyer is connected through —
 *  mainly so a returning user with a stale WalletConnect session sees
 *  "Rainbow · WalletConnect (mobile)" instead of just an address, and
 *  knows which app to open before they click Sign.
 *
 *  Two pieces of info are combined:
 *    - `connector.id` from wagmi's `useAccount()` — the connection TYPE
 *      ("injected", "walletConnect", "coinbaseWallet", "safe").
 *    - `walletInfo.name`/`.icon` from Reown AppKit's `useWalletInfo()` —
 *      for WalletConnect this is the actual peer wallet (Rainbow, MetaMask
 *      Mobile, Zerion, etc.); for injected it mirrors the extension's
 *      announced name. May be undefined right after reconnect from a
 *      restored session — callers should handle that with a generic label.
 */

export type ConnectionKind = 'injected' | 'walletConnect' | 'coinbaseWallet' | 'safe' | 'other'

/** Map a wagmi connector to a connection kind. Prefers `connector.type`
 *  because it's the stable signal across EIP-6963-detected wallets — for
 *  example Zerion's desktop extension comes through with
 *  `id: 'io.zerion.wallet'` (the RDNS) but `type: 'injected'`. Matching on
 *  `id` alone would drop Zerion / Rainbow / Phantom / Trust / Frame /
 *  every other extension that announces itself via EIP-6963 into the
 *  `'other'` bucket and they'd render as a generic "Connected" pill. The
 *  id-based fallback below covers older connector configs that don't
 *  populate `type` (vanilla wagmi-builtin connectors did historically). */
export function classifyConnection(
  connector: { id?: string; type?: string } | undefined,
): ConnectionKind {
  if (!connector) return 'other'
  switch (connector.type) {
    case 'injected': return 'injected'
    case 'walletConnect': return 'walletConnect'
    // `baseAccount` is the modern Base Account / Coinbase Smart Wallet
    // connector (wagmi/@wagmi/connectors `baseAccount()`) that Reown
    // AppKit 1.8.x auto-installs. `coinbaseWallet` is the legacy SDK4
    // connector. Treat both as the same kind — UI copy ("Approve in
    // Coinbase Wallet") and the EIP-5792 capability probe apply
    // uniformly across them. Without this, the new connector falls
    // through to `'other'` and renders a generic "Connected" pill
    // instead of the Coinbase chip.
    case 'coinbaseWallet': return 'coinbaseWallet'
    case 'baseAccount': return 'coinbaseWallet'
    case 'safe': return 'safe'
  }
  const id = connector.id
  if (!id) return 'other'
  if (id === 'injected' || id === 'metaMask' || id === 'metaMaskSDK') return 'injected'
  if (id === 'walletConnect') return 'walletConnect'
  if (id === 'coinbaseWallet' || id === 'coinbaseWalletSDK' || id === 'baseAccount') return 'coinbaseWallet'
  if (id === 'safe') return 'safe'
  return 'other'
}

/** Short label describing HOW the user is connected. Pairs with the
 *  wallet's brand name in the UI: "Rainbow · WalletConnect (mobile)". */
export function connectionTypeLabel(kind: ConnectionKind): string {
  switch (kind) {
    case 'injected': return 'Browser extension'
    case 'walletConnect': return 'WalletConnect (mobile)'
    case 'coinbaseWallet': return 'Coinbase Wallet'
    case 'safe': return 'Safe multisig'
    default: return 'Connected'
  }
}

/** Lucide icon name to render alongside the connection-type pill. The
 *  icon doubles up the signal: a returning user can recognize "📱 phone"
 *  vs "🖥️ desktop" at a glance without reading the label. Kept as a
 *  string so callers in different bundles (devcon-next React, wc_inject
 *  bundle) can map to whatever icon library they're already using. */
export function connectionTypeIcon(kind: ConnectionKind): 'monitor' | 'smartphone' | 'wallet' | 'shield' {
  switch (kind) {
    case 'injected': return 'monitor'
    case 'walletConnect': return 'smartphone'
    case 'coinbaseWallet': return 'wallet'
    case 'safe': return 'shield'
    default: return 'wallet'
  }
}

/** Sentence-form hint shown right before the buyer clicks Sign / Pay, so
 *  they know where the next signature popup will appear (the #1 source of
 *  "I clicked sign and nothing happened" support tickets, especially with
 *  stale WC sessions where the user thinks they're on the extension). */
export function preSignHint(kind: ConnectionKind, walletName: string | undefined): string {
  const name = walletName || fallbackName(kind)
  switch (kind) {
    case 'walletConnect':
      return `Open ${name} on your phone to approve.`
    case 'injected':
      return `Approve the request in your ${name} popup.`
    case 'coinbaseWallet':
      return `Approve the request in Coinbase Wallet.`
    case 'safe':
      return `Open the Safe app to queue and sign this transaction.`
    default:
      return `Approve the request in your wallet.`
  }
}

/** Short phrase like "in Rainbow on your phone" or "in MetaMask" to
 *  append to imperative status strings. Replaces the generic "in wallet"
 *  so a buyer always knows exactly where the next action lives — same
 *  story as `preSignHint` above, just phrased to slot into a longer
 *  sentence ("Sign payer proof in Rainbow on your phone…"). */
export function walletLocationPhrase(kind: ConnectionKind, walletName: string | undefined): string {
  const name = walletName || fallbackName(kind)
  switch (kind) {
    case 'walletConnect':
      return `in ${name} on your phone`
    case 'injected':
      return `in ${name}`
    case 'coinbaseWallet':
      return `in Coinbase Wallet`
    case 'safe':
      return `in your Safe app`
    default:
      return `in your wallet`
  }
}

function fallbackName(kind: ConnectionKind): string {
  switch (kind) {
    case 'walletConnect': return 'your wallet app'
    case 'injected': return 'wallet'
    case 'coinbaseWallet': return 'Coinbase Wallet'
    case 'safe': return 'Safe'
    default: return 'wallet'
  }
}
