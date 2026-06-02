import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Head from 'next/head'
import { X } from 'lucide-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, useAccount, useDisconnect, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useSendTransaction } from 'wagmi'
import { waitForTransactionReceipt } from 'wagmi/actions'
import type { Config } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { wagmiAdapter } from 'context/appkit-config'
import { parseUnits } from 'viem'
import { getUsdcConfigForChainId, getTokenAddressForChainSymbol } from 'types/x402'
import css from './admin.module.scss'

const queryClient = new QueryClient()

const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

const STORAGE_KEY = 'x402_admin_secret'
const POLL_INTERVAL = 30_000

/** Completed crypto orders. `source === 'x402'` supports the full feature set
 *  (gasless flow + onchain refund button). `'wc_attempt'` is the legacy
 *  pre-x402 WalletConnect direct-send flow, shown read-only. */
interface CompletedOrder {
  source: 'x402' | 'wc_attempt'
  paymentReference: string | null
  pretixOrderCode: string | null
  txHash: string | null
  payer: string
  completedAt: number
  chainId?: number
  totalUsd?: string
  tokenSymbol?: string | null
  cryptoAmount?: string | null
  gasCostWei?: string
  /** Buyer's email pulled from the matching Pretix Order (joined by code). */
  email?: string | null
  env: string
  refundStatus?: string
  refundTxHash?: string
  refundMeta?: Record<string, unknown>
  /** Pretix order state: 'n' pending, 'p' paid, 'e' expired, 'c' canceled.
   *  Null when the Pretix Order couldn't be loaded (rare — orphaned row). */
  pretixStatus?: string | null
  /** Pretix order `testmode` flag. Surfaces a TEST badge so an admin
   *  doesn't mistake a sandbox row for live revenue. */
  pretixTestmode?: boolean
  /** Pretix order total (what the order was charged). Compared against
   *  `totalUsd` (what the buyer paid) to compute overpaid_usd. */
  pretixTotal?: string | null
  /** USD value the buyer paid above the order total. Only set when the
   *  delta exceeds 1¢ (dust threshold). Null for legacy wc_attempt
   *  rows that don't carry a comparable USD figure. */
  overpaidUsd?: string | null
  /** Sum of completed Pretix OrderRefunds on this order. Null when no
   *  refund has been recorded. Drives the "Refunded" badge + button
   *  suppression once nothing is owed. */
  refundedAmount?: string | null
}

/** x402 rows always have a payment reference, tx hash, and Pretix order code.
 *  The refund UI is gated to x402 at the call site; this alias lets the
 *  refund components assume those fields are present. */
type X402CompletedOrder = CompletedOrder & {
  source: 'x402'
  paymentReference: string
  txHash: string
  pretixOrderCode: string
}

interface PendingOrder {
  paymentReference: string
  totalUsd: string
  createdAt: number
  expiresAt: number
  intendedPayer: string
  expectedChainId?: number
  /** Pre-computed ETH wei per chain (locked at pending-creation time). Map from
   *  string chainId → string of wei. USDC/USDT0 amounts aren't stored — they're
   *  just `totalUsd × 10^6` since both are 6-dec stables pegged to USD. */
  expectedEthAmountWeiByChain?: Record<string, string>
  metadata?: { ticketIds: number[]; addonIds?: number[]; email: string }
  env: string
  pretixTestmode?: boolean
}

interface ChainBalance {
  chainId: number
  network: string
  ethBalance: string
  tokens: { symbol: string; balance: string; address: string }[]
}

interface WalletInfo {
  address: string
  balances: ChainBalance[]
  prices: { ETH: number | null; POL: number | null }
}

/** Pretix order in `status='n'` (pending) with a walletconnect OrderPayment
 *  in `created` state and no completed WCPaymentAttempt yet — i.e. a buyer
 *  who started the wc_inject crypto checkout but verify never completed
 *  (closed browser, RPC blip, etc.). Surfaced so an admin can recover the
 *  on-chain tx hash out-of-band and manually verify the payment. */
interface IncomingTx {
  txHash: string
  chainId: number
  chainName: string
  symbol: string
  rawAmount: string | null
  decimals: number | null
  from: string
  to: string
  blockNum: string | null
  timestamp: number
}

interface IncomingTxsResponse {
  success: boolean
  receiveAddress: string
  refundAddress?: string
  byChain: Record<string, { count: number; refundCount?: number; error?: string }>
  incoming: IncomingTx[]
  /** Outgoing transfers from the refund wallet, used to match orphan
   *  incoming txs to their corresponding refund. Same shape as incoming. */
  outgoingRefunds?: IncomingTx[]
  errors: Record<string, string>
}

/** Orphan incoming tx augmented with a matching refund (when found).
 *  The match key is (chainId, symbol, rawAmount, refund.to === orphan.from)
 *  with `refund.timestamp >= orphan.timestamp`. Once a refund is claimed
 *  by one orphan it's not reused for another. */
interface OrphanWithRefund extends IncomingTx {
  refundTxHash?: string
  refundTimestamp?: number
}

/** Per-hash refunded-orphan info passed to the manual-verify modals so
 *  they can block submission of a tx the buyer was already refunded for. */
type RefundedOrphanInfo = { refundTxHash: string; refundTimestamp?: number; chainId: number; from: string }
type RefundedOrphansByHash = Map<string, RefundedOrphanInfo>

interface WcUnpaidOrder {
  orderCode: string
  orderSecret: string
  email: string
  total: string
  createdAt: number | null
  testmode: boolean
  /** Last buyer-issued quote, if one was created before they dropped off.
   *  Pre-fills chain + symbol + payer fields in the manual-verify modal;
   *  admin can still override any of them. `null` if the buyer never
   *  reached the create-quote step. */
  quote: {
    chainId: number | null
    symbol: string | null
    intendedPayer: string | null
    amountRaw: string | null
    createdAt: number | null
    expiresAt: number | null
  } | null
}

interface OrdersResponse {
  success: boolean
  env: string
  pretixBaseUrl: string
  pretixOrgSlug: string
  pretixEventSlug: string
  stats: { pending: number; completed: number; x402Count?: number; legacyCount?: number; wcUnpaidCount?: number }
  completed: CompletedOrder[]
  pending: PendingOrder[]
  wcUnpaid?: WcUnpaidOrder[]
  /** Wallet that receives ticket payments (recipientAddress). Shows all tokens. */
  destinationWallet?: WalletInfo | null
  /** Wallet that pays gas for EIP-3009 sponsored transfers (relayerAddress).
   *  Native-only — gas isn't paid in tokens. Drives the low-balance red flag. */
  gasRelayerWallet?: WalletInfo | null
  error?: string
}

const BLOCK_EXPLORERS: Record<number, string> = {
  1: 'https://etherscan.io',
  10: 'https://optimistic.etherscan.io',
  42161: 'https://arbiscan.io',
  8453: 'https://basescan.org',
  84532: 'https://sepolia.basescan.org',
  137: 'https://polygonscan.com',
}

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  10: 'Optimism',
  42161: 'Arbitrum',
  8453: 'Base',
  84532: 'Base Sepolia',
  137: 'Polygon',
}

const TOKEN_ICONS: Record<string, string> = {
  USDC: 'https://storage.googleapis.com/zapper-fi-assets/tokens/ethereum/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
  ETH: 'https://storage.googleapis.com/zapper-fi-assets/tokens/ethereum/0x0000000000000000000000000000000000000000.png',
  USDT0: 'https://storage.googleapis.com/zapper-fi-assets/tokens/optimism/0x01bff41798a0bcf287b996046ca68b395dbc1071.png',
  POL: 'https://storage.googleapis.com/zapper-fi-assets/tokens/polygon/0x0000000000000000000000000000000000000000.png',
}

const NETWORK_LOGOS: Record<number, string> = {
  1: 'https://storage.googleapis.com/zapper-fi-assets/networks/ethereum-icon.png',
  10: 'https://storage.googleapis.com/zapper-fi-assets/networks/optimism-icon.png',
  42161: 'https://storage.googleapis.com/zapper-fi-assets/networks/arbitrum-icon.png',
  8453: 'https://storage.googleapis.com/zapper-fi-assets/networks/base-icon.png',
  137: 'https://storage.googleapis.com/zapper-fi-assets/networks/polygon-icon.png',
  84532: 'https://storage.googleapis.com/zapper-fi-assets/networks/base-icon.png',
}

function Logo({ src, alt, size = 16 }: { src?: string; alt: string; size?: number }) {
  if (!src) return null
  return <img className={css.logo} src={src} alt={alt} width={size} height={size} />
}

function txExplorerUrl(txHash: string, chainId?: number) {
  const base = chainId != null && BLOCK_EXPLORERS[chainId] ? BLOCK_EXPLORERS[chainId] : null
  return base ? `${base}/tx/${txHash}` : `https://blockscan.com/tx/${txHash}`
}

function addressExplorerUrl(address: string, chainId?: number) {
  const base = chainId != null && BLOCK_EXPLORERS[chainId] ? BLOCK_EXPLORERS[chainId] : null
  return base ? `${base}/address/${address}` : `https://blockscan.com/address/${address}`
}

function truncate(s: string, len = 8) {
  if (!s || s.length <= len * 2 + 2) return s
  return `${s.slice(0, len + 2)}...${s.slice(-len)}`
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleString()
}

function sourceLabel(source: CompletedOrder['source']): string {
  switch (source) {
    case 'x402': return 'x402'
    case 'wc_attempt': return 'WalletConnect'
  }
}

/** Pretix-status code → buyer-facing label. Mirrors the recap page. */
function statusLabel(code: string | null | undefined): string {
  switch (code) {
    case 'p': return 'Paid'
    case 'n': return 'Pending'
    case 'e': return 'Expired'
    case 'c': return 'Canceled'
    default: return code || '—'
  }
}

/** SCSS class key for the small pill rendered next to each order row. */
function statusBadgeClass(code: string | null | undefined): string {
  switch (code) {
    case 'p': return css['admin-badge-paid']
    case 'n': return css['admin-badge-pending']
    case 'e': return css['admin-badge-expired']
    case 'c': return css['admin-badge-canceled']
    default: return css['admin-badge-unknown']
  }
}

function StatusBadge({ code }: { code: string | null | undefined }) {
  if (!code) return null
  return <span className={statusBadgeClass(code)}>{statusLabel(code)}</span>
}

function TestModeBadge({ on }: { on?: boolean }) {
  if (!on) return null
  return <span className={css['admin-badge-test']}>TEST</span>
}

function OverpaidBadge({ amount }: { amount?: string | null }) {
  if (!amount) return null
  return <span className={css['admin-badge-overpaid']} title="Buyer paid more than the order total — refund the difference">OVERPAID +${amount}</span>
}

function formatGasCost(wei?: string, chainId?: number, prices?: { ETH: number | null; POL: number | null } | null) {
  if (!wei) return '—'
  const eth = Number(BigInt(wei)) / 1e18
  if (eth === 0) return '$0'
  const price = chainId === 137 ? prices?.POL : prices?.ETH
  if (price) {
    const usd = eth * price
    if (usd < 0.01) return '<$0.01'
    return `$${usd.toFixed(2)}`
  }
  // Native-unit fallback when prices aren't loaded. Values below 6-decimal
  // resolution would round to "0.000000" — show "<0.000001" instead so small
  // but non-zero gas costs don't look like zero.
  const unit = chainId === 137 ? 'POL' : 'ETH'
  if (eth < 0.000001) return `<0.000001 ${unit}`
  return `${eth.toFixed(6)} ${unit}`
}

function formatTokenChainText(tokenSymbol?: string, chainId?: number) {
  const token = tokenSymbol || 'USDC'
  const chain = chainId != null ? CHAIN_NAMES[chainId] || `Chain ${chainId}` : null
  return chain ? `${token} on ${chain}` : token
}

function TokenChainCell({ tokenSymbol, chainId }: { tokenSymbol?: string; chainId?: number }) {
  const token = tokenSymbol || 'USDC'
  const chain = chainId != null ? CHAIN_NAMES[chainId] || `Chain ${chainId}` : null
  return (
    <span className={css['token-chain']}>
      <Logo src={TOKEN_ICONS[token]} alt={token} />
      <span>{token}</span>
      {chain && (
        <>
          <span className={css['token-chain-on']}>on</span>
          <Logo src={chainId != null ? NETWORK_LOGOS[chainId] : undefined} alt={chain} />
          <span>{chain}</span>
        </>
      )}
    </span>
  )
}

function ChainCell({ chainId }: { chainId?: number }) {
  if (chainId == null) return <span>—</span>
  const chain = CHAIN_NAMES[chainId] || `Chain ${chainId}`
  return (
    <span className={css['token-chain']}>
      <Logo src={NETWORK_LOGOS[chainId]} alt={chain} />
      <span>{chain}</span>
    </span>
  )
}

/** Render a raw onchain amount (wei / base units) as a human-readable decimal.
 *  USDC and USDT0 use 6 decimals, ETH uses 18. Unknown tokens default to 6.
 *
 *  Implementation note: written with constructor-form BigInt (`BigInt(0)`,
 *  `BigInt('1' + '0'.repeat(decimals))`) instead of the `0n` / `10n ** N`
 *  literal syntax so we don't have to bump the shared base tsconfig
 *  `target: es6`. Constructor calls compile fine on any target where the
 *  BigInt runtime exists (Node 10.4+, all modern browsers). */
function formatCryptoAmount(raw: string, tokenSymbol: string): string {
  const decimals = tokenSymbol === 'ETH' ? 18 : 6
  try {
    const n = BigInt(raw)
    const ZERO = BigInt(0)
    if (n === ZERO) return '0'
    const base = BigInt('1' + '0'.repeat(decimals))
    const whole = n / base
    const frac = n % base
    if (frac === ZERO) return whole.toString()
    // Trim trailing zeros on the fractional part.
    const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
    return `${whole}.${fracStr}`
  } catch {
    // Fallback: if `raw` isn't an integer string (shouldn't happen from the
    // plugin, but legacy rows may not have one), show it verbatim.
    return raw
  }
}

function CryptoAmountCell({
  cryptoAmount,
  tokenSymbol,
}: {
  cryptoAmount?: string | null
  tokenSymbol?: string
}) {
  if (!cryptoAmount || !tokenSymbol) return <span>—</span>
  return (
    <span className={css['token-chain']}>
      <span>{formatCryptoAmount(cryptoAmount, tokenSymbol)}</span>
      <Logo src={TOKEN_ICONS[tokenSymbol]} alt={tokenSymbol} />
      <span>{tokenSymbol}</span>
    </span>
  )
}

/** Pre-stored ETH wei amount snapshotted at pending-order creation time —
 *  this is the rate the buyer was quoted, locked in regardless of how ETH
 *  moves between now and when they actually pay. Stables (USDC/USDT0) aren't
 *  shown here because they're trivially `totalUsd` (both are 6-dec USD-pegged
 *  stables); the Amount column already covers that. */
function PendingEthQuoteCell({
  expectedEthByChain,
  expectedChainId,
}: {
  expectedEthByChain?: Record<string, string>
  expectedChainId?: number
}) {
  const ethEntries = expectedEthByChain ? Object.entries(expectedEthByChain) : []
  const primaryEth = expectedChainId != null && expectedEthByChain
    ? expectedEthByChain[String(expectedChainId)]
    : null

  if (primaryEth) {
    return (
      <span className={css['token-chain']}>
        <Logo src={TOKEN_ICONS.ETH} alt="ETH" />
        <span>{formatCryptoAmount(primaryEth, 'ETH')} ETH on {chainName(expectedChainId)}</span>
      </span>
    )
  }
  if (ethEntries.length > 0) {
    // Pre-quote: amounts across chains are derived from the same USD ÷ ETH
    // price, so they're effectively identical. Show one figure rather than
    // spamming the same number once per chain.
    return (
      <span className={css['token-chain']} title="Same wei across all chains — buyer hasn't picked one yet">
        <Logo src={TOKEN_ICONS.ETH} alt="ETH" />
        <span>{formatCryptoAmount(ethEntries[0][1], 'ETH')} ETH</span>
      </span>
    )
  }
  return <span>—</span>
}

function chainName(chainId?: number) {
  if (chainId == null) return '—'
  return CHAIN_NAMES[chainId] || String(chainId)
}

/** Render a wallet (destination or gas relayer) — header with address +
 *  optional USD total, then per-chain native + (optional) token rows.
 *
 *  `flagLowNative=true` is for the gas relayer panel: each chain's native
 *  token row turns red when below the per-chain gas-sponsorship threshold
 *  (0.001 ETH on L2s, 2 POL on Polygon, 0.004 ETH on Ethereum). For the
 *  destination wallet there's no operational concern about its native
 *  balance — pass `false`. */
function WalletPanel({
  title,
  wallet,
  totalUsd,
  flagLowNative,
}: {
  title: string
  wallet: WalletInfo
  totalUsd: number | null
  flagLowNative: boolean
}) {
  return (
    <div className={css.wallet}>
      <div className={css['wallet-header']}>
        <span className={css['wallet-title']}>{title}</span>
        <a
          className={`${css.mono} ${css['wallet-addr']}`}
          href={`https://zapper.xyz/account/${wallet.address}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {wallet.address}
        </a>
        {totalUsd != null && (
          <span className={css['wallet-total']}>
            ~${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )}
      </div>
      <div className={css['wallet-chains']}>
        {wallet.balances.map(chain => {
          const nativeSym = chain.chainId === 137 ? 'POL' : 'ETH'
          const nativeBal = Number(chain.ethBalance)
          // Per-chain low-balance thresholds. Only meaningful for the relayer
          // wallet (where falling below means gasless payments start failing
          // on that chain). L1 needs more headroom because mainnet gas is
          // ~10× L2 gas.
          const lowThreshold =
            chain.chainId === 1 ? 0.004 :
            chain.chainId === 137 ? 2 :
            0.001
          const isLow = flagLowNative && Number.isFinite(nativeBal) && nativeBal < lowThreshold
          return (
            <div key={chain.chainId} className={css['wallet-chain']}>
              <div className={css['wallet-chain-name']}>
                <Logo src={NETWORK_LOGOS[chain.chainId]} alt={CHAIN_NAMES[chain.chainId] || chain.network} />
                {CHAIN_NAMES[chain.chainId] || chain.network}
              </div>
              <div className={css['wallet-chain-bals']}>
                <span
                  className={`${css['wallet-token']} ${isLow ? css['wallet-token--low'] : ''}`}
                  title={isLow ? `Below ${lowThreshold} ${nativeSym} — top up to keep gasless payments working on this chain` : undefined}
                >
                  <Logo src={TOKEN_ICONS[nativeSym]} alt={nativeSym} size={14} />
                  <span className={css['wallet-token-val']}>{Number(chain.ethBalance).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</span>
                  <span className={css['wallet-token-sym']}>{nativeSym}</span>
                  {isLow && <span className={css['wallet-token-warn']} aria-label="low balance">⚠</span>}
                </span>
                {chain.tokens.map(t => (
                  <span key={t.symbol} className={css['wallet-token']}>
                    <Logo src={TOKEN_ICONS[t.symbol]} alt={t.symbol} size={14} />
                    <span className={css['wallet-token-val']}>{Number(t.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className={css['wallet-token-sym']}>{t.symbol}</span>
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type SortDir = 'asc' | 'desc'

function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return null
  return <span className={css['sort-arrow']}>{dir === 'asc' ? ' \u2191' : ' \u2193'}</span>
}

function SortableTh({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
}: {
  label: string
  sortKey: string
  currentSort: string | null
  currentDir: SortDir
  onSort: (key: string) => void
}) {
  const active = currentSort === sortKey
  return (
    <th className={`${css.sortable}${active ? ` ${css['col-sorted-header']}` : ''}`} onClick={() => onSort(sortKey)}>
      {label}
      <SortArrow active={active} dir={currentDir} />
    </th>
  )
}

function toIsoDate(ts: number) {
  return new Date(ts * 1000).toISOString().slice(0, 10)
}

function Copyable({ value, children }: { value: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(value)
    setCopied(true)
    if (timeout.current) clearTimeout(timeout.current)
    timeout.current = setTimeout(() => setCopied(false), 1500)
  }

  return (
    <span className={css.copyable} onClick={handleClick} title={`Click to copy: ${value}`}>
      {children}
      {copied && <span className={css['copy-toast']}>Copied!</span>}
    </span>
  )
}

interface DailyBucket {
  date: string
  revenue: number
  count: number
}

function buildDailyBuckets(orders: CompletedOrder[], days: number): DailyBucket[] {
  const now = new Date()
  const bucketMap = new Map<string, DailyBucket>()

  // Pre-fill last N days so we get gaps as zero bars
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000)
    const key = d.toISOString().slice(0, 10)
    bucketMap.set(key, { date: key, revenue: 0, count: 0 })
  }

  for (const o of orders) {
    const key = toIsoDate(o.completedAt)
    const bucket = bucketMap.get(key)
    if (bucket) {
      bucket.revenue += o.totalUsd ? parseFloat(o.totalUsd) : 0
      bucket.count += 1
    }
  }

  return Array.from(bucketMap.values())
}

function RevenueChart({ orders }: { orders: CompletedOrder[] }) {
  const days = 14
  const buckets = useMemo(() => buildDailyBuckets(orders, days), [orders])
  const maxRevenue = Math.max(...buckets.map(b => b.revenue), 1)

  return (
    <div className={css.chart}>
      <div className={css['chart-title']}>Daily Revenue (last {days} days)</div>
      <div className={css['chart-bars']}>
        {buckets.map(b => {
          const pct = (b.revenue / maxRevenue) * 100
          const label = `$${b.revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
          const dayLabel = b.date.slice(5) // MM-DD
          return (
            <div key={b.date} className={css['chart-col']} title={`${b.date}: ${label} (${b.count} orders)`}>
              <div className={css['chart-label']}>{b.revenue > 0 ? label : ''}</div>
              <div className={css['chart-bar-bg']}>
                <div className={css['chart-bar']} style={{ height: `${Math.max(pct, b.revenue > 0 ? 4 : 0)}%` }} />
              </div>
              <div className={css['chart-day']}>{dayLabel}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function exportCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Refund Modal ────────────────────────────────────────────────

function RefundModal({
  order,
  secret,
  onClose,
  onRefunded,
}: {
  order: CompletedOrder
  secret: string
  onClose: () => void
  onRefunded: () => void
}) {
  const { address, chain } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const [step, setStep] = useState<'confirm' | 'switching' | 'signing' | 'waiting' | 'done' | 'error'>('confirm')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refundChainId = order.chainId || 8453
  // Mirror the original payment exactly — same token, same network, same
  // base-units amount. `order.cryptoAmount` is the raw integer in token
  // base units (wei for ETH, 1e6-units for USDC/USDT0), recorded at
  // verify time. Falling back to a USDC equivalent of totalUsd is the
  // legacy behavior for very old rows that don't have `cryptoAmount`
  // populated — kept as a fallback for backward compat but never the
  // happy path for new payments.
  const refundSymbol = order.tokenSymbol || 'USDC'
  const refundRawAmount = order.cryptoAmount
  // Pretix OrderRefund.amount is always in event currency (USD), separate
  // from the on-chain token amount. The backend uses this for accounting;
  // unchanged from before.
  const refundUsd = order.totalUsd || '0'
  const usdcConfig = getUsdcConfigForChainId(refundChainId)
  // Resolve the actual ERC20 contract for non-ETH refunds. ETH refunds use
  // sendTransaction (no contract) so the lookup returns null.
  const refundTokenAddress = getTokenAddressForChainSymbol(refundChainId, refundSymbol)
  const isX402 = order.source === 'x402'

  // x402 path uses an initiate/confirm/fail CAS endpoint that gates
  // against the X402CompletedOrder row. Legacy WC rows have no such
  // row to gate on, so they post a single confirm-after-broadcast call
  // to a separate endpoint that records the refund directly in Pretix
  // (idempotency = duplicate refund_tx_hash check on the Pretix side).
  async function callX402RefundApi(action: string, body: Record<string, unknown>) {
    const res = await fetch('/api/x402/admin/refund/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': secret },
      body: JSON.stringify({ paymentReference: order.paymentReference, action, ...body }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error || 'API call failed')
    return json
  }

  async function recordWcRefund(refundTxHash: string) {
    const res = await fetch('/api/x402/admin/wc-refund/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': secret },
      body: JSON.stringify({
        pretix_order_code: order.pretixOrderCode,
        refund_tx_hash: refundTxHash,
        chain_id: refundChainId,
        // Pretix OrderRefund.amount is event-currency (USD), not token
        // base units. Unchanged from before — the on-chain token amount
        // is recorded separately on `info_data` via record_pretix_refund.
        amount: refundUsd,
      }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error || 'API call failed')
    return json
  }

  async function handleRefund() {
    if (!address) return

    // Validate refund inputs up front so we surface a clean error instead
    // of failing mid-flow at the wallet popup.
    if (!refundRawAmount) {
      // Legacy x402 rows without a `cryptoAmount` value can't be refunded
      // in the original token (we don't know the exact wei amount). Fall
      // back to a USDC-equivalent refund of the USD total for those.
      if (!usdcConfig) {
        setError('No crypto amount on order and no USDC config for chain — cannot refund')
        setStep('error')
        return
      }
    } else if (refundSymbol !== 'ETH' && refundTokenAddress === undefined) {
      setError(`No ${refundSymbol} contract address known for chain ${refundChainId}`)
      setStep('error')
      return
    }

    try {
      // 1. Initiate — only for x402, where we have a CAS guard
      if (isX402) {
        setStep('signing')
        await callX402RefundApi('initiate', {
          chainId: refundChainId,
          amount: refundUsd,
          adminAddress: address,
        })
      }

      // 2. Switch chain if needed
      if (chain?.id !== refundChainId) {
        setStep('switching')
        await switchChainAsync({ chainId: refundChainId })
      }

      // 3. Send the refund — branch on the original token. ETH refunds
      // use a native sendTransaction; ERC20 refunds (USDC, USDT0) call
      // the matching token contract's `transfer`. The recorded amount
      // is the buyer's exact cryptoAmount, so they receive back what
      // they sent in.
      setStep('signing')
      let hash: `0x${string}`
      if (refundRawAmount && refundSymbol === 'ETH') {
        hash = await sendTransactionAsync({
          to: order.payer as `0x${string}`,
          value: BigInt(refundRawAmount),
          chainId: refundChainId,
        })
      } else if (refundRawAmount && refundTokenAddress) {
        hash = await writeContractAsync({
          address: refundTokenAddress as `0x${string}`,
          abi: ERC20_TRANSFER_ABI,
          functionName: 'transfer',
          args: [order.payer as `0x${string}`, BigInt(refundRawAmount)],
          chainId: refundChainId,
        })
      } else {
        // Legacy-row fallback: send USDC equivalent of the USD total.
        // Only reached when `cryptoAmount` is missing on the order row.
        if (!usdcConfig) throw new Error('No USDC config for fallback refund')
        hash = await writeContractAsync({
          address: usdcConfig.tokenAddress as `0x${string}`,
          abi: ERC20_TRANSFER_ABI,
          functionName: 'transfer',
          args: [order.payer as `0x${string}`, parseUnits(refundUsd, 6)],
          chainId: refundChainId,
        })
      }
      setTxHash(hash)

      // 4. Wait for on-chain confirmation BEFORE recording the refund
      // in Pretix and triggering the buyer's notification email. If the
      // tx ever reverts (out of funds, gas estimation error, etc.) the
      // earlier behavior would have written a Pretix OrderRefund and
      // emailed the buyer pointing at a tx that doesn't exist — now we
      // gate everything on the receipt being status='success'.
      setStep('waiting')
      const receipt = await waitForTransactionReceipt(
        wagmiAdapter.wagmiConfig as Config,
        { hash, chainId: refundChainId },
      )
      if (receipt.status !== 'success') {
        throw new Error(
          `Refund transaction reverted on-chain (status=${receipt.status}). Funds were not sent.`,
        )
      }

      // 5. Record the refund. x402 has a confirm step that updates
      // the plugin's CAS row + creates the Pretix OrderRefund; WC
      // just creates the Pretix OrderRefund directly. Both also
      // trigger the refund-notification email on the plugin side —
      // which is now guaranteed to point at a confirmed tx.
      if (isX402) {
        await callX402RefundApi('confirm', { refundTxHash: hash })
      } else {
        await recordWcRefund(hash)
      }

      setStep('done')
      setTimeout(() => {
        onRefunded()
        onClose()
      }, 1500)
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || 'Unknown error'
      setError(msg)
      setStep('error')

      // x402 only: mark the CAS row as failed so the next attempt can
      // initiate cleanly. WC has no plugin-side ledger to flip — the
      // admin can just click Refund again if nothing was broadcast.
      if (isX402) {
        try {
          await callX402RefundApi('fail', { error: msg })
        } catch {
          // best-effort
        }
      }
    }
  }

  // Click-outside is intentionally disabled on this modal — refunds send an
  // onchain tx, and a misclick on the backdrop (mid-signing, or while waiting
  // for a tx to confirm) could abandon state mid-flight. Explicit close only.
  return (
    <div className={css['modal-overlay']}>
      <div className={css['modal-card']}>
        <button
          type="button"
          className={css['modal-close']}
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <h3 className={css['modal-title']}>Refund Order</h3>
        <div className={css['modal-details']}>
          <div className={css['modal-row']}>
            <span className={css['modal-label']}>Pretix Order</span>
            <span className={css['modal-value']}>{order.pretixOrderCode}</span>
          </div>
          <div className={css['modal-row']}>
            <span className={css['modal-label']}>Amount</span>
            <span className={css['modal-value']}>
              {refundRawAmount
                ? `${formatCryptoAmount(refundRawAmount, refundSymbol)} ${refundSymbol} ($${refundUsd})`
                : `$${refundUsd} USDC (legacy fallback)`}
            </span>
          </div>
          <div className={css['modal-row']}>
            <span className={css['modal-label']}>Recipient</span>
            <span className={`${css['modal-value']} ${css.mono}`}>{truncate(order.payer)}</span>
          </div>
          <div className={css['modal-row']}>
            <span className={css['modal-label']}>Chain</span>
            <span className={css['modal-value']}>
              <Logo src={NETWORK_LOGOS[refundChainId]} alt={chainName(refundChainId)} />
              {' '}{chainName(refundChainId)}
            </span>
          </div>
        </div>

        {step === 'confirm' && (
          <div className={css['modal-actions']}>
            <button className={css['modal-cancel']} onClick={onClose}>Cancel</button>
            <button
              className={css['modal-confirm']}
              onClick={handleRefund}
              disabled={!address || !usdcConfig}
            >
              {!address ? 'Connect Wallet First' : !usdcConfig ? 'Unsupported Chain' : 'Send Refund'}
            </button>
          </div>
        )}

        {step === 'switching' && <div className={css['modal-status']}>Switching to {chainName(refundChainId)}...</div>}
        {step === 'signing' && <div className={css['modal-status']}>Sign the transaction in your wallet...</div>}
        {step === 'waiting' && (
          <div className={css['modal-status']}>
            Confirming refund...
            {txHash && (
              <a className={css.link} href={txExplorerUrl(txHash, refundChainId)} target="_blank" rel="noopener noreferrer">
                View tx
              </a>
            )}
          </div>
        )}
        {step === 'done' && <div className={css['modal-status-success']}>Refund confirmed!</div>}
        {step === 'error' && (
          <div className={css['modal-status-error']}>
            <div>{error}</div>
            <button className={css['modal-cancel']} onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Refund Action Cell ──────────────────────────────────────────

function RefundActionCell({
  order,
  secret,
  isConnected,
  onRefunded,
}: {
  order: CompletedOrder
  secret: string
  isConnected: boolean
  onRefunded: () => void
}) {
  const [showModal, setShowModal] = useState(false)

  // x402 has its own CAS-tracked "pending" state — show that explicitly
  // since a click would race with the in-flight refund.
  if (order.source === 'x402' && order.refundStatus === 'pending') {
    return <span className={css['badge-pending']}>Processing...</span>
  }

  // "Fully refunded" = a Pretix OrderRefund exists AND nothing more is
  // owed. Hide the Refund button entirely and show a green badge —
  // the on-chain tx link sits above the amount line so admins can
  // verify the refund without leaving the table. Both x402 and
  // wc_attempt rows surface `refundTxHash` now (the wc path extracts
  // it from the Pretix OrderRefund.info JSON, see views_admin.py).
  // Partial-refund case (refunded > 0 AND still overpaid) leaves the
  // urgent button visible — there's more to refund.
  const isFullyRefunded = !!order.refundedAmount && !order.overpaidUsd
  if (isFullyRefunded) {
    // When we have the on-chain refund tx, the link is the more useful
    // affordance — clicking it shows the actual confirmed amount on the
    // explorer. The "Refunded $X" line only shows as a fallback when
    // the tx hash is missing (legacy rows pre-refund-tx-recording).
    return (
      <span className={css['badge-refunded']}>
        {order.refundTxHash ? (
          <a
            className={css.link}
            href={txExplorerUrl(order.refundTxHash, order.chainId)}
            target="_blank"
            rel="noopener noreferrer"
          >
            View refund tx ↗
          </a>
        ) : (
          <>Refunded ${order.refundedAmount}</>
        )}
      </span>
    )
  }

  // Refund is only possible when we have the onchain identity to send
  // it from (pretixOrderCode for the Pretix-side OrderRefund record,
  // payer for the destination, totalUsd for the amount). All three are
  // present on every x402 row; for wc_attempt rows, pretixOrderCode and
  // totalUsd are present whenever the original order was successfully
  // serialized — the few legacy attempts missing those just won't get
  // a Refund button (the `—` fallback below).
  const canRefund = isConnected && !!order.totalUsd && !!order.pretixOrderCode

  // OVERPAID rows are the ones that actively need admin action. Promote
  // the button to a filled-red urgent variant + put the dollar amount in
  // the label so an operator scanning a long table immediately sees
  // both "this row needs a refund" and "for how much".
  const isOverpaid = !!order.overpaidUsd
  const buttonLabel = isOverpaid ? `Refund $${order.overpaidUsd}` : 'Refund'
  const buttonClass = isOverpaid ? css['refund-btn-urgent'] : css['refund-btn']
  const buttonTitle = !isConnected
    ? 'Connect wallet to refund'
    : !order.totalUsd
    ? 'No amount to refund'
    : !order.pretixOrderCode
    ? 'No Pretix order code to record refund against'
    : isOverpaid
    ? `This order is overpaid by $${order.overpaidUsd} — refund owed to buyer`
    : `Refund ${order.tokenSymbol || 'USDC'} on chain ${order.chainId || '?'}`

  return (
    <>
      <button
        className={buttonClass}
        onClick={() => setShowModal(true)}
        disabled={!canRefund}
        title={buttonTitle}
      >
        {buttonLabel}
      </button>
      {showModal && (
        <RefundModal order={order} secret={secret} onClose={() => setShowModal(false)} onRefunded={onRefunded} />
      )}
    </>
  )
}

// ─── Manual verification (admin recovery for stuck pending payments) ─────

const SUPPORTED_SYMBOLS = ['USDC', 'USDT0', 'ETH'] as const
const SUPPORTED_CHAINS = [1, 10, 8453, 42161, 137] as const

function ManualVerifyModal({
  order,
  secret,
  refundedOrphans,
  onClose,
  onVerified,
}: {
  order: PendingOrder
  secret: string
  refundedOrphans: RefundedOrphansByHash
  onClose: () => void
  onVerified: () => void
}) {
  const [txHash, setTxHash] = useState('')
  const [symbol, setSymbol] = useState<string>('USDC')
  const [chainId, setChainId] = useState<number>(order.expectedChainId ?? 8453)
  const [step, setStep] = useState<'form' | 'submitting' | 'done' | 'error'>('form')
  const [result, setResult] = useState<{ code?: string; secret?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const trimmedHash = txHash.trim()
  const hashValid = /^0x[a-fA-F0-9]{64}$/.test(trimmedHash)
  // Block submission when the tx hash matches an orphan we've already
  // refunded — verifying would credit the order while the buyer keeps
  // the refund. Admin must use a different tx or cancel the refund first.
  const refundedMatch = hashValid ? refundedOrphans.get(trimmedHash.toLowerCase()) : undefined
  const canSubmit = hashValid && !refundedMatch

  async function handleSubmit() {
    if (!canSubmit) return
    setStep('submitting')
    setError(null)
    try {
      // Admin manual-verify deliberately omits ethPayerSignature — the plugin
      // bypasses that gate for the recovery path and falls back to onchain
      // tx.from binding (see _x402_verify_and_finalize.skip_eth_payer_signature).
      const res = await fetch('/api/x402/admin/verify/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': secret },
        body: JSON.stringify({
          paymentReference: order.paymentReference,
          txHash: trimmedHash,
          payer: order.intendedPayer,
          chainId,
          symbol,
        }),
      })
      const body = await res.json()
      if (!res.ok || !body.success) {
        setError(body.error || `Verify failed (HTTP ${res.status})`)
        setStep('error')
        return
      }
      setResult(body.order)
      setStep('done')
      setTimeout(() => {
        onVerified()
        onClose()
      }, 2500)
    } catch (e) {
      setError((e as Error).message || 'Network error')
      setStep('error')
    }
  }

  return (
    <div className={css['modal-overlay']}>
      <div className={css['modal-card']}>
        <button
          type="button"
          className={css['modal-close']}
          onClick={onClose}
          disabled={step === 'submitting'}
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <h3 className={css['modal-title']}>Manual verification</h3>
        <p className={css['modal-hint']} style={{ fontSize: 13, color: '#666', margin: '0 0 16px' }}>
          Confirm a pending payment using the onchain transaction hash. The plugin re-runs the full
          verification (tx uniqueness, recipient, amount, payer match). The tx hash <strong>must</strong>
          belong to the payer shown below, not anyone else. For ETH payments the offchain
          <em> ethPayerSignature</em> is not required here — payer binding falls back to the onchain{' '}
          <code>tx.from</code> match.
        </p>
        <div className={css['modal-details']}>
          <div className={css['modal-row']}>
            <span className={css['modal-label']}>Payment Ref</span>
            <span className={`${css['modal-value']} ${css.mono}`}>{order.paymentReference}</span>
          </div>
          <div className={css['modal-row']}>
            <span className={css['modal-label']}>Amount</span>
            <span className={css['modal-value']}>${order.totalUsd}</span>
          </div>
          <div className={css['modal-row']}>
            <span className={css['modal-label']}>Payer</span>
            <span className={`${css['modal-value']} ${css.mono}`} title={order.intendedPayer}>
              {truncate(order.intendedPayer)}
            </span>
          </div>
        </div>

        {step === 'form' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '16px 0' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>Transaction hash</span>
                <input
                  className={css['wc-input'] ?? ''}
                  style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6, fontFamily: 'monospace' }}
                  placeholder="0x..."
                  value={txHash}
                  onChange={e => setTxHash(e.target.value)}
                />
                {!hashValid && txHash.length > 0 && (
                  <span style={{ color: '#c00', fontSize: 12 }}>Must be 0x + 64 hex characters.</span>
                )}
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, flex: 1 }}>
                  <span style={{ fontWeight: 600 }}>Token</span>
                  <select
                    value={symbol}
                    onChange={e => setSymbol(e.target.value)}
                    style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
                  >
                    {SUPPORTED_SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, flex: 1 }}>
                  <span style={{ fontWeight: 600 }}>Chain</span>
                  <select
                    value={chainId}
                    onChange={e => setChainId(Number(e.target.value))}
                    style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
                  >
                    {SUPPORTED_CHAINS.map(c => <option key={c} value={c}>{chainName(c)}</option>)}
                  </select>
                </label>
              </div>
            </div>
            {refundedMatch && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 6,
                  fontSize: 13,
                  color: '#991b1b',
                }}
              >
                <strong>This transaction has already been refunded.</strong>
                <div style={{ marginTop: 6, color: '#7f1d1d' }}>
                  Verifying it would credit the order while the buyer still has the refund (double cost). Refund tx:{' '}
                  <a
                    className={css.link}
                    href={txExplorerUrl(refundedMatch.refundTxHash, refundedMatch.chainId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ wordBreak: 'break-all' }}
                  >
                    {refundedMatch.refundTxHash}
                  </a>
                  {refundedMatch.refundTimestamp && ` (${formatDate(refundedMatch.refundTimestamp)})`}
                </div>
              </div>
            )}
            <div className={css['modal-actions']}>
              <button className={css['modal-cancel']} onClick={onClose}>Cancel</button>
              <button
                className={css['modal-confirm']}
                disabled={!canSubmit}
                onClick={handleSubmit}
                title={refundedMatch ? 'Blocked: this tx was already refunded' : undefined}
              >
                Verify payment
              </button>
            </div>
          </>
        )}

        {step === 'submitting' && <div className={css['modal-status']}>Verifying onchain...</div>}
        {step === 'done' && result && (
          <div className={css['modal-status']}>
            Verified. Pretix order <code>{result.code}</code> created.
          </div>
        )}
        {step === 'error' && (
          <>
            <div className={css['modal-error']} style={{ marginTop: 12, padding: 12, background: '#fee', borderRadius: 6, fontSize: 13 }}>
              {error}
            </div>
            <div className={css['modal-actions']}>
              <button className={css['modal-cancel']} onClick={() => setStep('form')}>Back</button>
              <button className={css['modal-confirm']} onClick={handleSubmit}>Retry</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ManualVerifyCell({
  order,
  secret,
  refundedOrphans,
  onVerified,
}: {
  order: PendingOrder
  secret: string
  refundedOrphans: RefundedOrphansByHash
  onVerified: () => void
}) {
  const [showModal, setShowModal] = useState(false)
  return (
    <>
      <button
        type="button"
        className={css['refund-btn']}
        onClick={() => setShowModal(true)}
        title="Manually verify this pending payment with a transaction hash"
      >
        Verify
      </button>
      {showModal && (
        <ManualVerifyModal
          order={order}
          secret={secret}
          refundedOrphans={refundedOrphans}
          onClose={() => setShowModal(false)}
          onVerified={onVerified}
        />
      )}
    </>
  )
}

// Recovery path for the legacy wc_inject flow: an order exists in Pretix
// (status=pending, walletconnect payment in created state) but auto-verify
// never landed. Admin pastes the tx hash; backend re-runs the same on-chain
// pipeline as the buyer-driven verify, but skips the buyer-signature gate.
function WcManualVerifyModal({
  order,
  secret,
  pretixOrderUrl,
  refundedOrphans,
  onClose,
  onVerified,
}: {
  order: WcUnpaidOrder
  secret: string
  pretixOrderUrl?: string
  refundedOrphans: RefundedOrphansByHash
  onClose: () => void
  onVerified: () => void
}) {
  const [txHash, setTxHash] = useState('')
  // Default to ETH on Ethereum mainnet when the buyer never reached the
  // create-quote step — that's the most common manual-recovery case
  // (legacy wc_inject paid in native ETH on L1).
  const [symbol, setSymbol] = useState<string>(order.quote?.symbol ?? 'ETH')
  const [chainId, setChainId] = useState<number>(order.quote?.chainId ?? 1)
  const [payer, setPayer] = useState<string>(order.quote?.intendedPayer ?? '')
  const [step, setStep] = useState<'form' | 'submitting' | 'done' | 'error'>('form')
  const [error, setError] = useState<string | null>(null)

  const trimmedHash = txHash.trim()
  const trimmedPayer = payer.trim()
  const hashValid = /^0x[a-fA-F0-9]{64}$/.test(trimmedHash)
  const payerValid = /^0x[a-fA-F0-9]{40}$/.test(trimmedPayer)
  // Block submission when the tx hash matches an orphan already refunded.
  const refundedMatch = hashValid ? refundedOrphans.get(trimmedHash.toLowerCase()) : undefined
  const canSubmit = hashValid && payerValid && !refundedMatch

  async function handleSubmit() {
    if (!canSubmit) return
    setStep('submitting')
    setError(null)
    try {
      const res = await fetch('/api/x402/admin/wc-verify/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': secret },
        body: JSON.stringify({
          orderCode: order.orderCode,
          orderSecret: order.orderSecret,
          txHash: trimmedHash,
          payer: trimmedPayer,
          chainId,
          symbol,
        }),
      })
      const body = await res.json()
      if (!res.ok || !body.success) {
        setError(body.error || `Verify failed (HTTP ${res.status})`)
        setStep('error')
        return
      }
      setStep('done')
      setTimeout(() => {
        onVerified()
        onClose()
      }, 2500)
    } catch (e) {
      setError((e as Error).message || 'Network error')
      setStep('error')
    }
  }

  return (
    <div className={css['modal-overlay']}>
      <div className={css['modal-card']}>
        <button
          type="button"
          className={css['modal-close']}
          onClick={onClose}
          disabled={step === 'submitting'}
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <h3 className={css['modal-title']}>Manual verify (wc_inject)</h3>
        <p className={css['modal-hint']} style={{ fontSize: 13, color: '#666', margin: '0 0 16px' }}>
          Recover an unpaid wc_inject order using the onchain transaction hash. The plugin re-runs
          full verification (tx uniqueness, recipient, amount, payer match). Choose the token and
          chain the buyer actually paid in. Buyer signature is skipped — payer binding falls back to
          the onchain <code>tx.from</code> match.
        </p>
        <div className={css['modal-details']}>
          <div className={css['modal-row']}>
            <span className={css['modal-label']}>Order Code</span>
            <span className={`${css['modal-value']} ${css.mono}`}>
              {pretixOrderUrl ? (
                <a className={css.link} href={pretixOrderUrl} target="_blank" rel="noopener noreferrer">
                  {order.orderCode}
                </a>
              ) : (
                order.orderCode
              )}
            </span>
          </div>
          <div className={css['modal-row']}>
            <span className={css['modal-label']}>Amount</span>
            <span className={css['modal-value']}>${order.total}</span>
          </div>
          {order.quote?.amountRaw && order.quote.symbol && (
            <div className={css['modal-row']}>
              <span className={css['modal-label']}>Quote Amount</span>
              <span className={css['modal-value']}>
                {formatCryptoAmount(order.quote.amountRaw, order.quote.symbol)} {order.quote.symbol}
              </span>
            </div>
          )}
          {order.quote?.intendedPayer && (
            <div className={css['modal-row']}>
              <span className={css['modal-label']}>Payer (quote)</span>
              <span className={`${css['modal-value']} ${css.mono}`}>
                <a
                  className={css.link}
                  href={addressExplorerUrl(order.quote.intendedPayer, order.quote.chainId ?? undefined)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={order.quote.intendedPayer}
                >
                  {truncate(order.quote.intendedPayer)}
                </a>
              </span>
            </div>
          )}
          {order.email && (
            <div className={css['modal-row']}>
              <span className={css['modal-label']}>Email</span>
              <span className={css['modal-value']}>{order.email}</span>
            </div>
          )}
        </div>

        {step === 'form' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '16px 0' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>Transaction hash</span>
                <input
                  className={css['wc-input'] ?? ''}
                  style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6, fontFamily: 'monospace' }}
                  placeholder="0x..."
                  value={txHash}
                  onChange={e => setTxHash(e.target.value)}
                />
                {!hashValid && txHash.length > 0 && (
                  <span style={{ color: '#c00', fontSize: 12 }}>Must be 0x + 64 hex characters.</span>
                )}
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>
                  Payer address {order.quote?.intendedPayer && <em style={{ fontWeight: 400 }}>(pre-filled from quote)</em>}
                </span>
                <input
                  style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6, fontFamily: 'monospace' }}
                  placeholder="0x..."
                  value={payer}
                  onChange={e => setPayer(e.target.value)}
                />
                {!payerValid && payer.length > 0 && (
                  <span style={{ color: '#c00', fontSize: 12 }}>Must be 0x + 40 hex characters.</span>
                )}
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, flex: 1 }}>
                  <span style={{ fontWeight: 600 }}>Token</span>
                  <select
                    value={symbol}
                    onChange={e => setSymbol(e.target.value)}
                    style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
                  >
                    {SUPPORTED_SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, flex: 1 }}>
                  <span style={{ fontWeight: 600 }}>Chain</span>
                  <select
                    value={chainId}
                    onChange={e => setChainId(Number(e.target.value))}
                    style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
                  >
                    {SUPPORTED_CHAINS.map(c => <option key={c} value={c}>{chainName(c)}</option>)}
                  </select>
                </label>
              </div>
            </div>
            {refundedMatch && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 6,
                  fontSize: 13,
                  color: '#991b1b',
                }}
              >
                <strong>This transaction has already been refunded.</strong>
                <div style={{ marginTop: 6, color: '#7f1d1d' }}>
                  Verifying it would credit the order while the buyer still has the refund (double cost). Refund tx:{' '}
                  <a
                    className={css.link}
                    href={txExplorerUrl(refundedMatch.refundTxHash, refundedMatch.chainId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ wordBreak: 'break-all' }}
                  >
                    {refundedMatch.refundTxHash}
                  </a>
                  {refundedMatch.refundTimestamp && ` (${formatDate(refundedMatch.refundTimestamp)})`}
                </div>
              </div>
            )}
            <div className={css['modal-actions']}>
              <button className={css['modal-cancel']} onClick={onClose}>Cancel</button>
              <button
                className={css['modal-confirm']}
                disabled={!canSubmit}
                onClick={handleSubmit}
                title={refundedMatch ? 'Blocked: this tx was already refunded' : undefined}
              >
                Verify payment
              </button>
            </div>
          </>
        )}

        {step === 'submitting' && <div className={css['modal-status']}>Verifying onchain...</div>}
        {step === 'done' && (
          <div className={css['modal-status']}>
            Verified. Order <code>{order.orderCode}</code> marked paid.
          </div>
        )}
        {step === 'error' && (
          <>
            <div className={css['modal-error']} style={{ marginTop: 12, padding: 12, background: '#fee', borderRadius: 6, fontSize: 13 }}>
              {error}
            </div>
            <div className={css['modal-actions']}>
              <button className={css['modal-cancel']} onClick={() => setStep('form')}>Back</button>
              <button className={css['modal-confirm']} onClick={handleSubmit}>Retry</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function WcManualVerifyCell({
  order,
  secret,
  pretixOrderUrl,
  refundedOrphans,
  onVerified,
}: {
  order: WcUnpaidOrder
  secret: string
  pretixOrderUrl?: string
  refundedOrphans: RefundedOrphansByHash
  onVerified: () => void
}) {
  const [showModal, setShowModal] = useState(false)
  return (
    <>
      <button
        type="button"
        className={css['refund-btn']}
        onClick={() => setShowModal(true)}
        title="Manually verify this unpaid wc_inject order with a transaction hash"
      >
        Verify
      </button>
      {showModal && (
        <WcManualVerifyModal
          order={order}
          secret={secret}
          pretixOrderUrl={pretixOrderUrl}
          refundedOrphans={refundedOrphans}
          onClose={() => setShowModal(false)}
          onVerified={onVerified}
        />
      )}
    </>
  )
}

// ─── Main wrapper with WagmiProvider ─────────────────────────────

export default function AdminPage() {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config}>
      <QueryClientProvider client={queryClient}>
        <AdminContent />
      </QueryClientProvider>
    </WagmiProvider>
  )
}

function AdminContent() {
  const { address, isConnected } = useAccount()
  const { open } = useAppKit()
  const { disconnect } = useDisconnect()

  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [inputSecret, setInputSecret] = useState('')
  const [loginError, setLoginError] = useState('')
  const [data, setData] = useState<OrdersResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [incomingTxsData, setIncomingTxsData] = useState<IncomingTxsResponse | null>(null)
  const [incomingTxsLoading, setIncomingTxsLoading] = useState(false)
  const [incomingTxsError, setIncomingTxsError] = useState<string | null>(null)

  // Collapsible sections — all four heavy tables are collapsed on first
  // load so the admin lands on the wallet panels + stats only and opens
  // tables explicitly. Visibility lives in sessionStorage so re-renders
  // (auto-poll, modal close) don't reset the user's expansion choices.
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({
    completed: false, pending: false, orphan: false, wcUnpaid: false,
  })
  const toggleSection = (k: string) =>
    setSectionsOpen(s => ({ ...s, [k]: !s[k] }))
  const [search, setSearch] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Date range filter — default to "since launch" (Devcon 8 ticket sale
  // opened 2026-05-20). Keeping the default at the launch boundary means
  // stats land on the relevant population by default, not a rolling 7-day
  // window that excludes early-sale activity.
  const LAUNCH_DATE = '2026-05-20'
  const [dateFrom, setDateFrom] = useState(LAUNCH_DATE)
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))

  // Sorting
  const [completedSort, setCompletedSort] = useState<string | null>('completedAt')
  const [completedSortDir, setCompletedSortDir] = useState<SortDir>('desc')
  const [pendingSort, setPendingSort] = useState<string | null>('expiresAt')
  const [pendingSortDir, setPendingSortDir] = useState<SortDir>('desc')

  const fetchOrders = useCallback(
    async (key: string) => {
      setLoading(true)
      try {
        const res = await fetch('/api/x402/admin/orders/', {
          headers: { 'x-admin-key': key },
        })
        if (res.status === 401) {
          sessionStorage.removeItem(STORAGE_KEY)
          setAuthed(false)
          setSecret('')
          setLoginError('Invalid secret')
          return
        }
        const json: OrdersResponse = await res.json()
        setData(json)
      } catch {
        // network error — keep existing data
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const fetchIncomingTxs = useCallback(
    async (key: string, from: string, to: string) => {
      setIncomingTxsLoading(true)
      setIncomingTxsError(null)
      try {
        const qs = new URLSearchParams()
        if (from) qs.set('dateFrom', from)
        if (to) qs.set('dateTo', to)
        const q = qs.toString()
        const res = await fetch(`/api/x402/admin/incoming-txs/${q ? `?${q}` : ''}`, {
          headers: { 'x-admin-key': key },
        })
        const json: IncomingTxsResponse = await res.json()
        if (!res.ok || !json.success) {
          setIncomingTxsError((json as unknown as { error?: string }).error || `HTTP ${res.status}`)
          return
        }
        setIncomingTxsData(json)
      } catch (e) {
        setIncomingTxsError((e as Error).message || 'Network error')
      } finally {
        setIncomingTxsLoading(false)
      }
    },
    []
  )

  // Check sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) {
      setSecret(stored)
      setAuthed(true)
    }
  }, [])

  // Fetch on auth
  useEffect(() => {
    if (authed && secret) fetchOrders(secret)
  }, [authed, secret, fetchOrders])

  // Auto-load incoming txs on first auth and whenever the global date
  // range changes — the backend translates the range into per-chain
  // `fromBlock`/`toBlock` for Alchemy so we only pull what's in view.
  useEffect(() => {
    if (authed && secret) {
      fetchIncomingTxs(secret, dateFrom, dateTo)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, secret, dateFrom, dateTo])

  // Auto-refresh
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (authed && secret && autoRefresh) {
      timerRef.current = setInterval(() => fetchOrders(secret), POLL_INTERVAL)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [authed, secret, autoRefresh, fetchOrders])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!inputSecret.trim()) return
    setLoginError('')
    sessionStorage.setItem(STORAGE_KEY, inputSecret.trim())
    setSecret(inputSecret.trim())
    setAuthed(true)
  }

  function setDatePreset(preset: 'today' | '7d' | '30d' | 'launch' | 'all') {
    if (preset === 'all') {
      setDateFrom('')
      setDateTo('')
      return
    }
    const now = new Date()
    const to = now.toISOString().slice(0, 10)
    setDateTo(to)
    if (preset === 'today') {
      setDateFrom(to)
    } else if (preset === '7d') {
      const d = new Date(now.getTime() - 7 * 86400000)
      setDateFrom(d.toISOString().slice(0, 10))
    } else if (preset === '30d') {
      const d = new Date(now.getTime() - 30 * 86400000)
      setDateFrom(d.toISOString().slice(0, 10))
    } else if (preset === 'launch') {
      setDateFrom(LAUNCH_DATE)
    }
  }

  function isActivePreset(preset: 'today' | '7d' | '30d' | 'launch' | 'all') {
    if (preset === 'all') return !dateFrom && !dateTo
    const now = new Date()
    const to = now.toISOString().slice(0, 10)
    if (dateTo !== to) return false
    if (preset === 'today') return dateFrom === to
    if (preset === '7d') return dateFrom === new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10)
    if (preset === '30d') return dateFrom === new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
    if (preset === 'launch') return dateFrom === LAUNCH_DATE
    return false
  }

  // Filter + date helpers
  const q = search.toLowerCase()
  function matchesSearch(fields: (string | null | undefined)[]) {
    if (!q) return true
    return fields.some(f => f?.toLowerCase().includes(q))
  }

  function inDateRange(ts: number) {
    if (!dateFrom && !dateTo) return true
    const d = toIsoDate(ts)
    if (dateFrom && d < dateFrom) return false
    if (dateTo && d > dateTo) return false
    return true
  }

  // Completed orders: search + date + sort
  const filteredCompleted = useMemo(() => {
    let list = data?.completed.filter(o =>
      matchesSearch([o.pretixOrderCode, o.txHash, o.payer, o.paymentReference, o.totalUsd, o.tokenSymbol])
    ) ?? []
    list = list.filter(o => inDateRange(o.completedAt))

    if (completedSort) {
      list = [...list].sort((a, b) => {
        let cmp = 0
        switch (completedSort) {
          case 'amount':
            cmp = (parseFloat(a.totalUsd || '0')) - (parseFloat(b.totalUsd || '0'))
            break
          case 'completedAt':
            cmp = a.completedAt - b.completedAt
            break
          case 'pretixOrder':
            cmp = (a.pretixOrderCode || '').localeCompare(b.pretixOrderCode || '')
            break
          case 'tokenChain':
            // CompletedOrder.tokenSymbol is `string | null | undefined` since we
            // started carrying legacy rows (wc_attempt) that can have null symbols;
            // formatTokenChainText only accepts `string | undefined`. Coerce.
            cmp = formatTokenChainText(a.tokenSymbol ?? undefined, a.chainId)
              .localeCompare(formatTokenChainText(b.tokenSymbol ?? undefined, b.chainId))
            break
        }
        return completedSortDir === 'asc' ? cmp : -cmp
      })
    }
    return list
  }, [data?.completed, q, dateFrom, dateTo, completedSort, completedSortDir])

  // Split completed into active (non-refunded) and refunded
  const activeCompleted = useMemo(() =>
    filteredCompleted.filter(o => o.refundStatus !== 'confirmed'),
    [filteredCompleted]
  )

  // Refunds are x402-only today — refundStatus/refundTxHash/refundMeta are
  // only populated for x402 rows. This filter narrows both the lifecycle state
  // and the source, which makes the downstream non-null field access safe.
  const refundedOrders = useMemo(() =>
    filteredCompleted
      .filter((o): o is X402CompletedOrder => (
        o.source === 'x402' &&
        o.refundStatus === 'confirmed' &&
        o.paymentReference !== null &&
        o.txHash !== null &&
        o.pretixOrderCode !== null
      ))
      .sort((a, b) => {
        const aTime = a.refundMeta?.refundedAt ? new Date(a.refundMeta.refundedAt as string).getTime() : 0
        const bTime = b.refundMeta?.refundedAt ? new Date(b.refundMeta.refundedAt as string).getTime() : 0
        return bTime - aTime
      }),
    [filteredCompleted]
  )

  // Completed crypto payments whose Pretix order was later cancelled
  // (status 'c'). These still appear in the completed list (the payment
  // happened) but don't represent a live ticket, so we surface them and
  // a net "Orders" figure that excludes them.
  const cancelledCount = useMemo(() =>
    activeCompleted.filter(o => o.pretixStatus === 'c').length,
    [activeCompleted]
  )
  const netOrders = activeCompleted.length - cancelledCount

  const totalRevenue = useMemo(() =>
    activeCompleted.reduce((sum, o) => sum + (o.totalUsd ? parseFloat(o.totalUsd) : 0), 0),
    [activeCompleted]
  )

  const totalRefunded = useMemo(() =>
    refundedOrders.reduce((sum, o) => sum + (o.totalUsd ? parseFloat(o.totalUsd) : 0), 0),
    [refundedOrders]
  )

  // Both wallet panels carry the same `prices` block (fetched once on the
  // backend) — pull from whichever exists.
  const walletPrices = data?.destinationWallet?.prices ?? data?.gasRelayerWallet?.prices ?? null

  // Total relayer-sponsored gas across the filtered completed rows.
  // Always return ETH + POL summed; USD is only filled in for chains whose
  // price loaded (missing prices no longer blank out the whole stat).
  const totalGasSponsored = useMemo(() => {
    const prices = walletPrices
    let usd: number | null = prices ? 0 : null
    let ethSum = 0
    let polSum = 0
    let rowsCounted = 0
    for (const o of filteredCompleted) {
      if (!o.gasCostWei) continue
      const native = Number(BigInt(o.gasCostWei)) / 1e18
      rowsCounted++
      if (o.chainId === 137) polSum += native
      else ethSum += native
      if (usd !== null && prices) {
        const price = o.chainId === 137 ? prices.POL : prices.ETH
        if (price) usd += native * price
      }
    }
    if (rowsCounted === 0) return null
    return { usd, eth: ethSum, pol: polSum }
  }, [filteredCompleted, walletPrices])

  const destinationWalletTotalUsd = useMemo(() => {
    const w = data?.destinationWallet
    if (!w) return null
    let total = 0
    for (const chain of w.balances) {
      // Stablecoins (USDC, USDT0) are ~$1 each
      for (const t of chain.tokens) {
        total += parseFloat(t.balance)
      }
      // Native gas token
      const nativeBal = parseFloat(chain.ethBalance)
      if (chain.chainId === 137) {
        if (w.prices.POL != null) total += nativeBal * w.prices.POL
      } else {
        if (w.prices.ETH != null) total += nativeBal * w.prices.ETH
      }
    }
    return total
  }, [data?.destinationWallet])

  // Pending orders: search + date + sort
  const filteredPending = useMemo(() => {
    let list = data?.pending.filter(o =>
      matchesSearch([
        o.paymentReference,
        o.totalUsd,
        o.intendedPayer,
        o.metadata?.email,
        o.expectedChainId?.toString(),
      ])
    ) ?? []
    list = list.filter(o => inDateRange(o.createdAt))

    if (pendingSort) {
      list = [...list].sort((a, b) => {
        let cmp = 0
        switch (pendingSort) {
          case 'amount':
            cmp = parseFloat(a.totalUsd || '0') - parseFloat(b.totalUsd || '0')
            break
          case 'expiresAt':
            cmp = a.expiresAt - b.expiresAt
            break
        }
        return pendingSortDir === 'asc' ? cmp : -cmp
      })
    }
    return list
  }, [data?.pending, q, dateFrom, dateTo, pendingSort, pendingSortDir])

  // Unpaid wc_inject orders: Pretix orders where the buyer started the wc
  // checkout but auto-verify never landed (closed browser, RPC blip, etc.).
  // Admin manual-verify by pasting the recovered tx hash.
  const filteredWcUnpaid = useMemo(() => {
    const list = data?.wcUnpaid?.filter(o =>
      matchesSearch([o.orderCode, o.email, o.total, o.quote?.intendedPayer])
    ) ?? []
    return list.filter(o => inDateRange(o.createdAt ?? 0))
  }, [data?.wcUnpaid, q, dateFrom, dateTo])

  // Identities expected to legitimately appear on many orders (admin /
  // recovery accounts, internal test wallets). Suppress the duplicate
  // badge for these so it stays meaningful as a buyer-retry signal.
  const DUPLICATE_BADGE_EMAIL_ALLOWLIST = new Set(['didier.krux@ethereum.org'])
  const DUPLICATE_BADGE_PAYER_ALLOWLIST = new Set(['0x957e6583bb0513a3b044dfdac05a757a53b2ec49'])
  const isDupBadgeSuppressedEmail = (email?: string | null) =>
    !!email && DUPLICATE_BADGE_EMAIL_ALLOWLIST.has(email.toLowerCase())
  const isDupBadgeSuppressedPayer = (payer?: string | null) =>
    !!payer && DUPLICATE_BADGE_PAYER_ALLOWLIST.has(payer.toLowerCase())

  // Per-email count of unpaid wc_inject orders that have a quote — surfaces
  // buyers who started multiple quote attempts (likely retried after a
  // failed broadcast). Computed off the full unfiltered list so the badge
  // remains accurate even when the user narrows the table by search/date.
  const wcUnpaidQuotedByEmail = useMemo(() => {
    const m: Record<string, number> = {}
    for (const o of data?.wcUnpaid ?? []) {
      if (!o.quote || !o.email) continue
      m[o.email] = (m[o.email] ?? 0) + 1
    }
    return m
  }, [data?.wcUnpaid])

  // Same idea, keyed by the quote's intended payer wallet — catches buyers
  // who retried with a different email but the same address.
  // Set of tx hashes (lowercased) already recorded against a completed
  // order — both x402 and legacy wc_inject share this list. Used to flag
  // orphan transfers in the incoming-txs panel without a second backend
  // round-trip. Also includes refunded orders' tx hashes since those
  // were legitimate payments at one point, just reversed.
  const knownTxHashes = useMemo(() => {
    const s = new Set<string>()
    for (const o of data?.completed ?? []) {
      if (o.txHash) s.add(o.txHash.toLowerCase())
    }
    return s
  }, [data?.completed])

  // Orphans = incoming transfers whose tx hash isn't in `knownTxHashes`.
  // Pure client-side filter so we re-derive on order data refresh too,
  // not just when the incoming-txs panel reloads. Each orphan is then
  // paired with its refund (if any) from the outgoing-from-refunder feed
  // by exact (chain, symbol, rawAmount, refund.to == orphan.from) match
  // with refund.timestamp >= orphan.timestamp. First-come-first-serve so
  // duplicate-amount cases don't double-claim the same refund.
  const orphanIncomingTxs = useMemo<OrphanWithRefund[]>(() => {
    // Backend already filters by date range + launch-cutoff via Alchemy
    // block bounds, so here we just strip out the txs that match known
    // orders.
    const orphans = (incomingTxsData?.incoming ?? []).filter(tx => {
      if (knownTxHashes.has(tx.txHash.toLowerCase())) return false
      return true
    })

    // Refund pool, oldest first so the earliest matching refund claims an
    // orphan (mirrors real-world chronology — earliest refund pairs with
    // earliest qualifying orphan).
    const refundPool = [...(incomingTxsData?.outgoingRefunds ?? [])].sort(
      (a, b) => a.timestamp - b.timestamp,
    )
    const claimed = new Set<string>()

    // Match oldest orphans first too, so dup-amount orphans bind refunds
    // in order rather than the latest one stealing the earliest refund.
    const oldestFirst = [...orphans].sort((a, b) => a.timestamp - b.timestamp)
    const refundByOrphanHash = new Map<string, { txHash: string; timestamp: number }>()
    for (const o of oldestFirst) {
      if (!o.rawAmount || !o.symbol) continue
      const match = refundPool.find(r =>
        !claimed.has(r.txHash) &&
        r.chainId === o.chainId &&
        r.symbol === o.symbol &&
        r.rawAmount === o.rawAmount &&
        r.to === o.from &&
        r.timestamp >= o.timestamp,
      )
      if (match) {
        claimed.add(match.txHash)
        refundByOrphanHash.set(o.txHash, { txHash: match.txHash, timestamp: match.timestamp })
      }
    }

    // Preserve original sort order (newest first, from the API).
    return orphans.map(o => {
      const m = refundByOrphanHash.get(o.txHash)
      return m ? { ...o, refundTxHash: m.txHash, refundTimestamp: m.timestamp } : o
    })
  }, [incomingTxsData?.incoming, incomingTxsData?.outgoingRefunds, knownTxHashes])

  /** Lookup of orphan tx hashes (lowercased) that already have a matching
   *  refund. The manual-verify modals consult this so admins can't
   *  re-submit a tx the buyer was already refunded for — that would credit
   *  the order AND keep the refund, double-spending the cost. */
  const refundedOrphansByHash = useMemo(() => {
    const m = new Map<string, { refundTxHash: string; refundTimestamp?: number; chainId: number; from: string }>()
    for (const o of orphanIncomingTxs) {
      if (!o.refundTxHash) continue
      m.set(o.txHash.toLowerCase(), {
        refundTxHash: o.refundTxHash,
        refundTimestamp: o.refundTimestamp,
        chainId: o.chainId,
        from: o.from,
      })
    }
    return m
  }, [orphanIncomingTxs])

  const wcUnpaidQuotedByPayer = useMemo(() => {
    const m: Record<string, number> = {}
    for (const o of data?.wcUnpaid ?? []) {
      const payer = o.quote?.intendedPayer
      if (!payer) continue
      const key = payer.toLowerCase()
      m[key] = (m[key] ?? 0) + 1
    }
    return m
  }, [data?.wcUnpaid])

  // Completed-order duplicate counters: surface buyers / wallets that paid
  // more than once. Counts the full completed list (not just visible rows)
  // so the badge stays accurate across search and date filters.
  const completedByEmail = useMemo(() => {
    const m: Record<string, number> = {}
    for (const o of data?.completed ?? []) {
      if (!o.email) continue
      m[o.email] = (m[o.email] ?? 0) + 1
    }
    return m
  }, [data?.completed])

  const completedByPayer = useMemo(() => {
    const m: Record<string, number> = {}
    for (const o of data?.completed ?? []) {
      if (!o.payer) continue
      const key = o.payer.toLowerCase()
      m[key] = (m[key] ?? 0) + 1
    }
    return m
  }, [data?.completed])

  function toggleCompletedSort(key: string) {
    if (completedSort === key) {
      setCompletedSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setCompletedSort(key)
      setCompletedSortDir('desc')
    }
  }

  function togglePendingSort(key: string) {
    if (pendingSort === key) {
      setPendingSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setPendingSort(key)
      setPendingSortDir('desc')
    }
  }

  function exportCompletedCsv() {
    const headers = ['Pretix Order', 'Email', 'Amount (USD)', 'Crypto Amount', 'Token', 'Chain', 'Gas Cost (ETH)', 'Tx Hash', 'Payer', 'Completed At', 'Refund Status', 'Refund Tx Hash']
    // Coerce nullable fields to '' — legacy `wc_attempt` rows may carry
    // null pretixOrderCode/txHash/tokenSymbol; the CSV exporter expects
    // `string[][]`, not `(string | null)[][]`.
    const rows = filteredCompleted.map(o => [
      o.pretixOrderCode ?? '',
      o.email ?? '',
      o.totalUsd || '',
      o.cryptoAmount ? formatCryptoAmount(o.cryptoAmount, o.tokenSymbol || 'USDC') : '',
      o.tokenSymbol || 'USDC',
      chainName(o.chainId),
      o.gasCostWei ? formatGasCost(o.gasCostWei, o.chainId, walletPrices) : '',
      o.txHash ?? '',
      o.payer,
      formatDate(o.completedAt),
      o.refundStatus || '',
      o.refundTxHash || '',
    ])
    const date = new Date().toISOString().slice(0, 10)
    exportCsv(`x402-completed-${date}.csv`, headers, rows)
  }

  function exportPendingCsv() {
    const now = Math.floor(Date.now() / 1000)
    const headers = [
      'Payment Ref', 'Amount', 'ETH Quote',
      'Payer', 'Email', 'Created At', 'Expires At', 'Status',
    ]
    const rows = filteredPending.map(o => {
      // Pre-quote: per-chain ETH amounts are all the same value derived from
      // USD ÷ ETH price. Take the first if not bound to a specific chain yet.
      const primaryEth = o.expectedChainId != null
        ? o.expectedEthAmountWeiByChain?.[String(o.expectedChainId)]
        : Object.values(o.expectedEthAmountWeiByChain || {})[0]
      const ethStr = primaryEth ? formatCryptoAmount(primaryEth, 'ETH') : ''
      return [
        o.paymentReference,
        o.totalUsd,
        ethStr,
        o.intendedPayer,
        o.metadata?.email ?? '',
        formatDate(o.createdAt),
        formatDate(o.expiresAt),
        o.expiresAt < now ? 'EXPIRED' : 'ACTIVE',
      ]
    })
    const date = new Date().toISOString().slice(0, 10)
    exportCsv(`x402-pending-${date}.csv`, headers, rows)
  }

  function exportOrphansCsv() {
    const headers = [
      'Chain ID', 'Chain', 'Token', 'Decimals', 'Raw Amount', 'Formatted Amount',
      'From', 'To', 'Tx Hash', 'Block Num', 'Timestamp (UTC)', 'Tx Explorer', 'Address Explorer',
      'Refunded', 'Refund Tx Hash', 'Refund Timestamp (UTC)', 'Refund Tx Explorer',
    ]
    const rows = orphanIncomingTxs.map(tx => {
      const formatted = tx.rawAmount && tx.symbol ? formatCryptoAmount(tx.rawAmount, tx.symbol) : ''
      // blockNum from Alchemy is hex; export both raw and decimal would be
      // overkill — admins paste the hex into block explorers fine.
      return [
        String(tx.chainId),
        tx.chainName,
        tx.symbol,
        tx.decimals != null ? String(tx.decimals) : '',
        tx.rawAmount ?? '',
        formatted,
        tx.from,
        tx.to,
        tx.txHash,
        tx.blockNum ?? '',
        new Date(tx.timestamp * 1000).toISOString(),
        txExplorerUrl(tx.txHash, tx.chainId),
        addressExplorerUrl(tx.from, tx.chainId),
        tx.refundTxHash ? 'YES' : 'NO',
        tx.refundTxHash ?? '',
        tx.refundTimestamp ? new Date(tx.refundTimestamp * 1000).toISOString() : '',
        tx.refundTxHash ? txExplorerUrl(tx.refundTxHash, tx.chainId) : '',
      ]
    })
    const date = new Date().toISOString().slice(0, 10)
    exportCsv(`x402-orphans-${date}.csv`, headers, rows)
  }

  // Not authed — login prompt
  if (!authed) {
    return (
      <div className={css.page}>
        <Head>
          <title>Crypto Admin</title>
        </Head>
        <div className={css.login}>
          <div className={css['login-card']}>
            <h1 className={css['login-title']}>Crypto Payment Monitor</h1>
            <form className={css['login-form']} onSubmit={handleLogin}>
              <input
                className={css['login-input']}
                type="password"
                placeholder="Admin secret"
                value={inputSecret}
                onChange={e => setInputSecret(e.target.value)}
                autoFocus
              />
              <button className={css['login-btn']} type="submit">
                Enter
              </button>
            </form>
            {loginError && <p className={css['login-error']}>{loginError}</p>}
          </div>
        </div>
      </div>
    )
  }

  const now = Math.floor(Date.now() / 1000)

  return (
    <div className={css.page}>
      <Head>
        <title>Crypto Admin{data?.env ? ` (${data.env})` : ''}</title>
      </Head>

      {/* Header */}
      <div className={css.header}>
        <div className={css['header-left']}>
          <h1 className={css.title}>Crypto Admin</h1>
          {data?.env && <span className={css['env-badge']}>{data.env}</span>}
        </div>
        <div className={css['header-right']}>
          {isConnected ? (
            <button className={css['wallet-btn']} onClick={() => disconnect()} title={address}>
              {truncate(address || '', 4)} — Disconnect
            </button>
          ) : (
            <button className={css['wallet-btn-connect']} onClick={() => open()}>
              Connect Wallet
            </button>
          )}
          <label className={css['refresh-toggle']}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            Auto-refresh (30s)
          </label>
          <button className={css['refresh-btn']} onClick={() => fetchOrders(secret)} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats + Wallet */}
      {data?.stats && (
        <div className={css.stats}>
          <div className={css['stat-grid']}>
            <div className={css['stat-card']}>
              <p className={css['stat-label']}>Pending</p>
              <p className={css['stat-value']}>{filteredPending.length}</p>
            </div>
            <div className={css['stat-card']}>
              <p className={css['stat-label']}>Completed</p>
              <p className={css['stat-value']}>{activeCompleted.length}</p>
            </div>
            <div className={css['stat-card']}>
              <p className={css['stat-label']}>Paid</p>
              <p className={css['stat-value']}>{netOrders}</p>
            </div>
            <div className={css['stat-card']}>
              <p className={css['stat-label']}>Cancelled</p>
              <p className={css['stat-value']}>{cancelledCount}</p>
            </div>
            <div className={css['stat-card']}>
              <p className={css['stat-label']}>Refunded</p>
              <p className={css['stat-value']}>{refundedOrders.length}</p>
            </div>
            <div className={css['stat-card']}>
              <p className={css['stat-label']}>Total Revenue</p>
              <p className={css['stat-value']}>
                ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className={css['stat-card']}>
              <p className={css['stat-label']}>Gas Sponsored</p>
              <p className={css['stat-value']}>
                {totalGasSponsored == null
                  ? '—'
                  : totalGasSponsored.usd != null
                  ? `$${totalGasSponsored.usd.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : [
                      totalGasSponsored.eth > 0 ? `${totalGasSponsored.eth.toFixed(6)} ETH` : null,
                      totalGasSponsored.pol > 0 ? `${totalGasSponsored.pol.toFixed(4)} POL` : null,
                    ]
                      .filter(Boolean)
                      .join(' + ') || '—'}
              </p>
            </div>
            <div className={css['stat-card']}>
              <p className={css['stat-label']}>Total Refunded</p>
              <p className={css['stat-value']}>
                ${totalRefunded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          {data?.destinationWallet && (
            <WalletPanel
              title="Destination Wallet"
              wallet={data.destinationWallet}
              totalUsd={destinationWalletTotalUsd}
              flagLowNative={false}
            />
          )}
          {data?.gasRelayerWallet && (
            <WalletPanel
              title="Gas Relayer Wallet"
              wallet={data.gasRelayerWallet}
              totalUsd={null}
              flagLowNative={true}
            />
          )}
        </div>
      )}

      {/* Revenue Chart */}
      {data?.completed && data.completed.length > 0 && <RevenueChart orders={data.completed} />}

      {/* Search + Date Filter */}
      <div className={css['filter-bar']}>
        <input
          className={css['search-input']}
          type="text"
          placeholder="Search orders..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <input
          className={css['date-input']}
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          title="From date"
        />
        <span className={css['date-sep']}>to</span>
        <input
          className={css['date-input']}
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          title="To date"
        />
        {(['today', '7d', '30d', 'launch', 'all'] as const).map(p => (
          <button
            key={p}
            className={`${css['preset-btn']} ${isActivePreset(p) ? css['preset-btn-active'] : ''}`}
            onClick={() => setDatePreset(p)}
          >
            {p === 'all' ? 'All' : p === 'today' ? 'Today' : p === 'launch' ? 'Since launch' : p}
          </button>
        ))}
      </div>

      {/* Completed Orders */}
      <div className={css.section}>
        <div className={css['section-header']}>
          <h2
            className={css['section-title']}
            onClick={() => toggleSection('completed')}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            {sectionsOpen.completed ? '▾' : '▸'} Completed Orders ({activeCompleted.length})
          </h2>
          <button className={css['export-btn']} onClick={exportCompletedCsv} disabled={filteredCompleted.length === 0}>
            Export CSV
          </button>
        </div>
        {sectionsOpen.completed && (
          <div className={css['table-wrap']}>
            {activeCompleted.length === 0 ? (
              <div className={css.empty}>No completed orders</div>
            ) : (
              <table className={css.table}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <SortableTh
                      label="Pretix Order"
                      sortKey="pretixOrder"
                      currentSort={completedSort}
                      currentDir={completedSortDir}
                      onSort={toggleCompletedSort}
                    />
                    <th>Status</th>
                    <th>Email</th>
                    <SortableTh
                      label="Amount"
                      sortKey="amount"
                      currentSort={completedSort}
                      currentDir={completedSortDir}
                      onSort={toggleCompletedSort}
                    />
                    <th>Crypto Amount</th>
                    <SortableTh
                      label="Chain"
                      sortKey="tokenChain"
                      currentSort={completedSort}
                      currentDir={completedSortDir}
                      onSort={toggleCompletedSort}
                    />
                    <th>Sponsored Gas</th>
                    <th>Tx Hash</th>
                    <th>Payer</th>
                    <SortableTh
                      label="Completed At"
                      sortKey="completedAt"
                      currentSort={completedSort}
                      currentDir={completedSortDir}
                      onSort={toggleCompletedSort}
                    />
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCompleted.map(o => (
                    <tr key={o.paymentReference ?? `${o.source}-${o.txHash ?? o.pretixOrderCode ?? o.completedAt}`}>
                      <td>{sourceLabel(o.source)}</td>
                      <td className={undefined}>
                        {o.pretixOrderCode ? (
                          <a
                            className={css.link}
                            href={`${data?.pretixBaseUrl}/control/event/${data?.pretixOrgSlug}/${data?.pretixEventSlug}/orders/${o.pretixOrderCode}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {o.pretixOrderCode}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={css['admin-badge-cell']}>
                        <StatusBadge code={o.pretixStatus} />
                        <TestModeBadge on={o.pretixTestmode} />
                        <OverpaidBadge amount={o.overpaidUsd} />
                      </td>
                      <td className={undefined}>
                        {o.email ?? '—'}
                        {o.email && !isDupBadgeSuppressedEmail(o.email) && (completedByEmail[o.email] ?? 0) > 1 && (
                          <span style={{ marginLeft: 6, color: '#c80', fontSize: 12, fontWeight: 600 }}>
                            ({completedByEmail[o.email]} orders)
                          </span>
                        )}
                      </td>
                      <td className={undefined}>{o.totalUsd ? `$${o.totalUsd}` : '—'}</td>
                      <td>
                        <CryptoAmountCell cryptoAmount={o.cryptoAmount} tokenSymbol={o.tokenSymbol ?? undefined} />
                      </td>
                      <td className={undefined}>
                        <ChainCell chainId={o.chainId} />
                      </td>
                      <td className={css.mono}>
                        {o.gasCostWei ? formatGasCost(o.gasCostWei, o.chainId, walletPrices) : '—'}
                      </td>
                      <td className={css.mono}>
                        {o.txHash ? (
                          <Copyable value={o.txHash}>
                            <a
                              className={css.link}
                              href={txExplorerUrl(o.txHash, o.chainId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                            >
                              {o.txHash.slice(0, 10)}...{o.txHash.slice(-8)}
                            </a>
                          </Copyable>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={css.mono}>
                        <a
                          className={css.link}
                          href={addressExplorerUrl(o.payer, o.chainId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={o.payer}
                        >
                          {truncate(o.payer)}
                        </a>
                        {o.payer &&
                          !isDupBadgeSuppressedPayer(o.payer) &&
                          (completedByPayer[o.payer.toLowerCase()] ?? 0) > 1 && (
                            <span style={{ marginLeft: 6, color: '#c80', fontSize: 12, fontWeight: 600 }}>
                              ({completedByPayer[o.payer.toLowerCase()]} orders)
                            </span>
                          )}
                      </td>
                      <td className={undefined}>{formatDate(o.completedAt)}</td>
                      <td>
                        <RefundActionCell
                          order={o}
                          secret={secret}
                          isConnected={isConnected}
                          onRefunded={() => fetchOrders(secret)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Refunded Orders */}
      {refundedOrders.length > 0 && (
        <div className={css.section}>
          <div className={css['section-header']}>
            <h2 className={css['section-title']}>Refunded Orders ({refundedOrders.length})</h2>
          </div>
          <div className={css['table-wrap']}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th>Pretix Order</th>
                  <th>Amount</th>
                  <th>Crypto Amount</th>
                  <th>Chain</th>
                  <th>Payer</th>
                  <th>Payment Tx</th>
                  <th>Refund Tx</th>
                  <th className={css['col-sorted-header']}>
                    Refunded At <span className={css['sort-arrow']}>↓</span>
                  </th>
                  <th>Completed At</th>
                </tr>
              </thead>
              <tbody>
                {refundedOrders.map(o => (
                  <tr key={o.paymentReference}>
                    <td>
                      <a
                        className={css.link}
                        href={`${data?.pretixBaseUrl}/control/event/${data?.pretixOrgSlug}/${data?.pretixEventSlug}/orders/${o.pretixOrderCode}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {o.pretixOrderCode}
                      </a>
                    </td>
                    <td>{o.totalUsd ? `$${o.totalUsd}` : '—'}</td>
                    <td>
                      <CryptoAmountCell cryptoAmount={o.cryptoAmount} tokenSymbol={o.tokenSymbol ?? undefined} />
                    </td>
                    <td>
                      <ChainCell chainId={o.chainId} />
                    </td>
                    <td className={css.mono}>
                      <a
                        className={css.link}
                        href={addressExplorerUrl(o.payer, o.chainId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={o.payer}
                      >
                        {truncate(o.payer)}
                      </a>
                    </td>
                    <td className={css.mono}>
                      <Copyable value={o.txHash}>
                        <a
                          className={css.link}
                          href={txExplorerUrl(o.txHash, o.chainId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                        >
                          {o.txHash.slice(0, 10)}...{o.txHash.slice(-8)}
                        </a>
                      </Copyable>
                    </td>
                    <td className={css.mono}>
                      {o.refundTxHash ? (
                        <Copyable value={o.refundTxHash}>
                          <a
                            className={css.link}
                            href={txExplorerUrl(o.refundTxHash, o.chainId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                          >
                            {o.refundTxHash.slice(0, 10)}...{o.refundTxHash.slice(-8)}
                          </a>
                        </Copyable>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {o.refundMeta?.refundedAt
                        ? formatDate(Math.floor(new Date(o.refundMeta.refundedAt as string).getTime() / 1000))
                        : '—'}
                    </td>
                    <td>{formatDate(o.completedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending Orders */}
      <div className={css.section}>
        <div className={css['section-header']}>
          <h2
            className={css['section-title']}
            onClick={() => toggleSection('pending')}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            {sectionsOpen.pending ? '▾' : '▸'} Pending Orders ({filteredPending.length})
          </h2>
          <button className={css['export-btn']} onClick={exportPendingCsv} disabled={filteredPending.length === 0}>
            Export CSV
          </button>
        </div>
        {sectionsOpen.pending && (
          <div className={css['table-wrap']}>
            {filteredPending.length === 0 ? (
              <div className={css.empty}>No pending orders</div>
            ) : (
              <table className={css.table}>
                <thead>
                  <tr>
                    <th>Payment Ref</th>
                    <SortableTh
                      label="Amount"
                      sortKey="amount"
                      currentSort={pendingSort}
                      currentDir={pendingSortDir}
                      onSort={togglePendingSort}
                    />
                    <th>ETH Quote</th>
                    <th>Payer</th>
                    <th>Email</th>
                    <SortableTh
                      label="Expires At"
                      sortKey="expiresAt"
                      currentSort={pendingSort}
                      currentDir={pendingSortDir}
                      onSort={togglePendingSort}
                    />
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPending.map(o => {
                    const isExpired = o.expiresAt < now
                    return (
                      <tr key={o.paymentReference}>
                        <td className={css.mono}>
                          <Copyable value={o.paymentReference}>{truncate(o.paymentReference)}</Copyable>
                          {o.pretixTestmode && (
                            <>
                              {' '}
                              <TestModeBadge on />
                            </>
                          )}
                        </td>
                        <td className={undefined}>${o.totalUsd}</td>
                        <td>
                          <PendingEthQuoteCell
                            expectedEthByChain={o.expectedEthAmountWeiByChain}
                            expectedChainId={o.expectedChainId}
                          />
                        </td>
                        <td className={css.mono}>
                          <a
                            className={css.link}
                            href={addressExplorerUrl(o.intendedPayer, o.expectedChainId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={o.intendedPayer}
                          >
                            {truncate(o.intendedPayer)}
                          </a>
                        </td>
                        <td>{o.metadata?.email ?? '—'}</td>
                        <td className={undefined}>
                          {formatDate(o.expiresAt)}
                          {isExpired && <span className={css.expired}> EXPIRED</span>}
                        </td>
                        <td>
                          <ManualVerifyCell
                            order={o}
                            secret={secret}
                            refundedOrphans={refundedOrphansByHash}
                            onVerified={() => fetchOrders(secret)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Orphan incoming transactions: on-chain payments to receive_address
          (last N days, via Alchemy) that aren't linked to any known order.
          Lets admin spot buyers who paid but whose order didn't get
          verified — typically resolved via the Unpaid wc_inject section
          below or by reaching out to the buyer for an order code. */}
      <div className={css.section}>
        <div className={css['section-header']}>
          <h2
            className={css['section-title']}
            onClick={() => toggleSection('orphan')}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            {sectionsOpen.orphan ? '▾' : '▸'} Orphan Incoming Transactions
            {incomingTxsData && (() => {
              const refunded = orphanIncomingTxs.filter(o => o.refundTxHash).length
              const refundsTotal = incomingTxsData.outgoingRefunds?.length ?? 0
              return ` (${orphanIncomingTxs.length} orphan${refunded > 0 ? ` / ${refunded} refunded` : ''} / ${incomingTxsData.incoming.length} incoming / ${refundsTotal} refunds out)`
            })()}
          </h2>
          {sectionsOpen.orphan && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                className={css['refresh-btn']}
                onClick={() => fetchIncomingTxs(secret, dateFrom, dateTo)}
                disabled={incomingTxsLoading}
              >
                {incomingTxsLoading ? 'Loading…' : incomingTxsData ? 'Refresh' : 'Load'}
              </button>
              <button
                className={css['export-btn']}
                onClick={exportOrphansCsv}
                disabled={orphanIncomingTxs.length === 0}
              >
                Export CSV
              </button>
            </div>
          )}
        </div>

        {sectionsOpen.orphan && incomingTxsError && (
          <div className={css.empty} style={{ color: '#c00' }}>
            Error: {incomingTxsError}
          </div>
        )}

        {sectionsOpen.orphan && incomingTxsData && (
          <>
            {/* Per-chain summary + any Alchemy errors so the admin can see
                which chains were actually queried successfully. */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '8px 0', fontSize: 12, color: '#555' }}>
              {Object.entries(incomingTxsData.byChain).map(([chainId, s]) => (
                <span key={chainId}>
                  <strong>{chainName(Number(chainId))}:</strong>{' '}
                  {s.error ? (
                    <span style={{ color: '#c00' }} title={s.error}>
                      error
                    </span>
                  ) : (
                    <>
                      {s.count} incoming
                      {typeof s.refundCount === 'number' && ` · ${s.refundCount} refunds out`}
                    </>
                  )}
                </span>
              ))}
            </div>
            <div className={css['table-wrap']}>
              {orphanIncomingTxs.length === 0 ? (
                <div className={css.empty}>No orphan transactions in the selected date range</div>
              ) : (
                <table className={css.table}>
                  <thead>
                    <tr>
                      <th>Chain</th>
                      <th>Token</th>
                      <th>Amount</th>
                      <th>From</th>
                      <th>Tx Hash</th>
                      <th>Timestamp</th>
                      <th>Refund</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orphanIncomingTxs.map(tx => (
                      <tr key={`${tx.chainId}-${tx.txHash}`}>
                        <td>{tx.chainName}</td>
                        <td>{tx.symbol}</td>
                        <td>
                          {tx.rawAmount && tx.symbol
                            ? `${formatCryptoAmount(tx.rawAmount, tx.symbol)} ${tx.symbol}`
                            : '—'}
                        </td>
                        <td className={css.mono}>
                          <a
                            className={css.link}
                            href={addressExplorerUrl(tx.from, tx.chainId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={tx.from}
                          >
                            {truncate(tx.from)}
                          </a>
                        </td>
                        <td className={css.mono}>
                          <Copyable value={tx.txHash}>
                            <a
                              className={css.link}
                              href={txExplorerUrl(tx.txHash, tx.chainId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                            >
                              {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                            </a>
                          </Copyable>
                        </td>
                        <td>{formatDate(tx.timestamp)}</td>
                        <td className={css['admin-badge-cell']}>
                          {tx.refundTxHash ? (
                            <>
                              <span
                                className={css['admin-badge-paid']}
                                title={
                                  tx.refundTimestamp
                                    ? `Refunded ${formatDate(tx.refundTimestamp)}`
                                    : 'Refunded'
                                }
                              >
                                REFUNDED
                              </span>
                              <Copyable value={tx.refundTxHash}>
                                <a
                                  className={`${css.link} ${css.mono}`}
                                  href={txExplorerUrl(tx.refundTxHash, tx.chainId)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                >
                                  {tx.refundTxHash.slice(0, 10)}...{tx.refundTxHash.slice(-8)}
                                </a>
                              </Copyable>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {/* Unpaid wc_inject orders — Pretix orders where buyer started the
          legacy wc_inject crypto checkout but auto-verify never landed.
          Admin manually verifies by pasting the recovered tx hash. */}
      <div className={css.section}>
        <div className={css['section-header']}>
          <h2
            className={css['section-title']}
            onClick={() => toggleSection('wcUnpaid')}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            {sectionsOpen.wcUnpaid ? '▾' : '▸'} Unpaid wc_inject Orders ({filteredWcUnpaid.length})
          </h2>
        </div>
        {sectionsOpen.wcUnpaid && (
          <div className={css['table-wrap']}>
            {filteredWcUnpaid.length === 0 ? (
              <div className={css.empty}>No unpaid wc_inject orders</div>
            ) : (
              <table className={css.table}>
                <thead>
                  <tr>
                    <th>Order Code</th>
                    <th>Amount</th>
                    <th>Quote Amount</th>
                    <th>Email</th>
                    <th>Quote (chain/token/payer)</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWcUnpaid.map(o => (
                    <tr key={o.orderCode}>
                      <td className={css.mono}>
                        <Copyable value={o.orderCode}>{o.orderCode}</Copyable>
                        {o.testmode && (
                          <>
                            {' '}
                            <TestModeBadge on />
                          </>
                        )}
                      </td>
                      <td>${o.total}</td>
                      <td>
                        {o.quote?.amountRaw && o.quote.symbol ? (
                          <>
                            {formatCryptoAmount(o.quote.amountRaw, o.quote.symbol)} {o.quote.symbol}
                          </>
                        ) : (
                          <span style={{ color: '#999' }}>—</span>
                        )}
                      </td>
                      <td>
                        {o.email || '—'}
                        {o.email &&
                          !isDupBadgeSuppressedEmail(o.email) &&
                          (wcUnpaidQuotedByEmail[o.email] ?? 0) > 1 && (
                            <span style={{ marginLeft: 6, color: '#c80', fontSize: 12, fontWeight: 600 }}>
                              ({wcUnpaidQuotedByEmail[o.email]} orders)
                            </span>
                          )}
                      </td>
                      <td className={css.mono} style={{ fontSize: 12 }}>
                        {o.quote ? (
                          <>
                            {o.quote.symbol ?? '?'} on chain {o.quote.chainId ?? '?'}
                            {o.quote.intendedPayer && (
                              <>
                                {' '}
                                /{' '}
                                <a
                                  className={css.link}
                                  href={addressExplorerUrl(o.quote.intendedPayer, o.quote.chainId ?? undefined)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={o.quote.intendedPayer}
                                >
                                  {truncate(o.quote.intendedPayer)}
                                </a>
                                {!isDupBadgeSuppressedPayer(o.quote.intendedPayer) &&
                                  (wcUnpaidQuotedByPayer[o.quote.intendedPayer.toLowerCase()] ?? 0) > 1 && (
                                    <span style={{ marginLeft: 6, color: '#c80', fontSize: 12, fontWeight: 600 }}>
                                      ({wcUnpaidQuotedByPayer[o.quote.intendedPayer.toLowerCase()]} orders)
                                    </span>
                                  )}
                              </>
                            )}
                          </>
                        ) : (
                          <span style={{ color: '#999' }}>no quote</span>
                        )}
                      </td>
                      <td>{o.createdAt ? formatDate(o.createdAt) : '—'}</td>
                      <td>
                        <WcManualVerifyCell
                          order={o}
                          secret={secret}
                          pretixOrderUrl={
                            data?.pretixBaseUrl && data?.pretixOrgSlug && data?.pretixEventSlug
                              ? `${data.pretixBaseUrl}/control/event/${data.pretixOrgSlug}/${data.pretixEventSlug}/orders/${o.orderCode}/`
                              : undefined
                          }
                          refundedOrphans={refundedOrphansByHash}
                          onVerified={() => fetchOrders(secret)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
