import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Head from 'next/head'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, useAccount, useDisconnect, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import type { Config } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { wagmiAdapter } from 'context/appkit-config'
import { parseUnits } from 'viem'
import { getUsdcConfigForChainId } from 'types/x402'
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
 *  (gasless flow + on-chain refund button). `'signed_message'` and `'wc_attempt'`
 *  are legacy pre-x402 rows shown read-only — many optional fields are absent. */
interface CompletedOrder {
  source: 'x402' | 'signed_message' | 'wc_attempt'
  paymentReference: string | null
  pretixOrderCode: string | null
  txHash: string | null
  payer: string
  completedAt: number
  chainId?: number
  totalUsd?: string
  tokenSymbol?: string | null
  cryptoAmount?: string
  gasCostWei?: string
  env: string
  refundStatus?: string
  refundTxHash?: string
  refundMeta?: Record<string, unknown>
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
  metadata?: { ticketIds: number[]; addonIds?: number[]; email: string }
  env: string
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

interface OrdersResponse {
  success: boolean
  env: string
  pretixBaseUrl: string
  pretixOrgSlug: string
  pretixEventSlug: string
  stats: { pending: number; completed: number; x402Count?: number; legacyCount?: number }
  completed: CompletedOrder[]
  pending: PendingOrder[]
  wallet?: WalletInfo | null
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
    case 'signed_message': return 'Daimo'
  }
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
  return `${eth.toFixed(6)} ETH`
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

function CryptoAmountCell({ cryptoAmount, tokenSymbol }: { cryptoAmount?: string; tokenSymbol?: string }) {
  if (!cryptoAmount) return <span>—</span>
  const token = tokenSymbol || 'USDC'
  return (
    <span className={css['token-chain']}>
      <span>{cryptoAmount}</span>
      <Logo src={TOKEN_ICONS[token]} alt={token} />
      <span>{token}</span>
    </span>
  )
}

function chainName(chainId?: number) {
  if (chainId == null) return '—'
  return CHAIN_NAMES[chainId] || String(chainId)
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
  order: X402CompletedOrder
  secret: string
  onClose: () => void
  onRefunded: () => void
}) {
  const { address, chain } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const [step, setStep] = useState<'confirm' | 'switching' | 'signing' | 'waiting' | 'done' | 'error'>('confirm')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refundChainId = order.chainId || 8453
  const refundAmount = order.totalUsd || '0'
  const usdcConfig = getUsdcConfigForChainId(refundChainId)

  async function callRefundApi(action: string, body: Record<string, unknown>) {
    const res = await fetch('/api/x402/admin/refund/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': secret },
      body: JSON.stringify({ paymentReference: order.paymentReference, action, ...body }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error || 'API call failed')
    return json
  }

  async function handleRefund() {
    if (!address || !usdcConfig) return

    try {
      // 1. Initiate — CAS prevents double-refund
      setStep('signing')
      await callRefundApi('initiate', {
        chainId: refundChainId,
        amount: refundAmount,
        adminAddress: address,
      })

      // 2. Switch chain if needed
      if (chain?.id !== refundChainId) {
        setStep('switching')
        await switchChainAsync({ chainId: refundChainId })
      }

      // 3. Send USDC transfer
      setStep('signing')
      const hash = await writeContractAsync({
        address: usdcConfig.tokenAddress as `0x${string}`,
        abi: ERC20_TRANSFER_ABI,
        functionName: 'transfer',
        args: [order.payer as `0x${string}`, parseUnits(refundAmount, 6)],
        chainId: refundChainId,
      })
      setTxHash(hash)

      // 4. Wait for confirmation
      setStep('waiting')
      // writeContractAsync returns after tx is submitted; we confirm via API
      await callRefundApi('confirm', { txHash: hash })

      setStep('done')
      setTimeout(() => {
        onRefunded()
        onClose()
      }, 1500)
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || 'Unknown error'
      setError(msg)
      setStep('error')

      // If we already initiated, mark as failed
      try {
        await callRefundApi('fail', { error: msg })
      } catch {
        // best-effort
      }
    }
  }

  return (
    <div className={css['modal-overlay']} onClick={onClose}>
      <div className={css['modal-card']} onClick={e => e.stopPropagation()}>
        <h3 className={css['modal-title']}>Refund Order</h3>
        <div className={css['modal-details']}>
          <div className={css['modal-row']}>
            <span className={css['modal-label']}>Pretix Order</span>
            <span className={css['modal-value']}>{order.pretixOrderCode}</span>
          </div>
          <div className={css['modal-row']}>
            <span className={css['modal-label']}>Amount</span>
            <span className={css['modal-value']}>${refundAmount} USDC</span>
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
  order: X402CompletedOrder
  secret: string
  isConnected: boolean
  onRefunded: () => void
}) {
  const [showModal, setShowModal] = useState(false)

  if (order.refundStatus === 'confirmed') {
    return (
      <span className={css['badge-refunded']}>
        Refunded
        {order.refundTxHash && (
          <>
            {' '}
            <a
              className={css.link}
              href={txExplorerUrl(order.refundTxHash, order.chainId)}
              target="_blank"
              rel="noopener noreferrer"
            >
              (tx)
            </a>
          </>
        )}
      </span>
    )
  }

  if (order.refundStatus === 'pending') {
    return <span className={css['badge-pending']}>Processing...</span>
  }

  if (order.refundStatus === 'failed') {
    return (
      <>
        <button
          className={css['refund-btn']}
          onClick={() => setShowModal(true)}
          disabled={!isConnected || !order.totalUsd}
          title={!isConnected ? 'Connect wallet to refund' : !order.totalUsd ? 'No amount to refund' : 'Issue USDC refund'}
        >
          Refund
        </button>
        {showModal && (
          <RefundModal order={order} secret={secret} onClose={() => setShowModal(false)} onRefunded={onRefunded} />
        )}
      </>
    )
  }

  return (
    <>
      <button
        className={css['refund-btn']}
        onClick={() => setShowModal(true)}
        disabled={!isConnected || !order.totalUsd}
        title={!isConnected ? 'Connect wallet to refund' : !order.totalUsd ? 'No amount to refund' : 'Issue USDC refund'}
      >
        Refund
      </button>
      {showModal && (
        <RefundModal order={order} secret={secret} onClose={() => setShowModal(false)} onRefunded={onRefunded} />
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
  const [search, setSearch] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Date range filter — default to last 7 days
  const [dateFrom, setDateFrom] = useState(() => new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
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

  function setDatePreset(preset: 'today' | '7d' | '30d' | 'all') {
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
    }
  }

  function isActivePreset(preset: 'today' | '7d' | '30d' | 'all') {
    if (preset === 'all') return !dateFrom && !dateTo
    const now = new Date()
    const to = now.toISOString().slice(0, 10)
    if (dateTo !== to) return false
    if (preset === 'today') return dateFrom === to
    if (preset === '7d') return dateFrom === new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10)
    if (preset === '30d') return dateFrom === new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
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
            cmp = formatTokenChainText(a.tokenSymbol, a.chainId).localeCompare(formatTokenChainText(b.tokenSymbol, b.chainId))
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

  const totalRevenue = useMemo(() =>
    activeCompleted.reduce((sum, o) => sum + (o.totalUsd ? parseFloat(o.totalUsd) : 0), 0),
    [activeCompleted]
  )

  const totalRefunded = useMemo(() =>
    refundedOrders.reduce((sum, o) => sum + (o.totalUsd ? parseFloat(o.totalUsd) : 0), 0),
    [refundedOrders]
  )

  const totalGasSponsored = useMemo(() => {
    const prices = data?.wallet?.prices
    if (!prices) return null
    let total = 0
    for (const o of filteredCompleted) {
      if (!o.gasCostWei) continue
      const eth = Number(BigInt(o.gasCostWei)) / 1e18
      const price = o.chainId === 137 ? prices.POL : prices.ETH
      if (price) total += eth * price
    }
    return total
  }, [filteredCompleted, data?.wallet?.prices])

  const walletTotalUsd = useMemo(() => {
    const w = data?.wallet
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
  }, [data?.wallet])

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
          case 'chain':
            cmp = (a.expectedChainId ?? 0) - (b.expectedChainId ?? 0)
            break
        }
        return pendingSortDir === 'asc' ? cmp : -cmp
      })
    }
    return list
  }, [data?.pending, q, dateFrom, dateTo, pendingSort, pendingSortDir])

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
    const headers = ['Pretix Order', 'Amount (USD)', 'Crypto Amount', 'Token', 'Chain', 'Gas Cost (ETH)', 'Tx Hash', 'Payer', 'Completed At', 'Refund Status', 'Refund Tx Hash']
    const rows = filteredCompleted.map(o => [
      o.pretixOrderCode,
      o.totalUsd || '',
      o.cryptoAmount || '',
      o.tokenSymbol || 'USDC',
      chainName(o.chainId),
      o.gasCostWei ? formatGasCost(o.gasCostWei, o.chainId, data?.wallet?.prices) : '',
      o.txHash,
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
    const headers = ['Payment Ref', 'Amount', 'Payer', 'Email', 'Chain', 'Created At', 'Expires At', 'Status']
    const rows = filteredPending.map(o => [
      o.paymentReference,
      o.totalUsd,
      o.intendedPayer,
      o.metadata?.email ?? '',
      chainName(o.expectedChainId),
      formatDate(o.createdAt),
      formatDate(o.expiresAt),
      o.expiresAt < now ? 'EXPIRED' : 'ACTIVE',
    ])
    const date = new Date().toISOString().slice(0, 10)
    exportCsv(`x402-pending-${date}.csv`, headers, rows)
  }

  // Not authed — login prompt
  if (!authed) {
    return (
      <div className={css.page}>
        <Head>
          <title>x402 Admin</title>
        </Head>
        <div className={css.login}>
          <div className={css['login-card']}>
            <h1 className={css['login-title']}>x402 Payment Monitor</h1>
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
        <title>x402 Admin{data?.env ? ` (${data.env})` : ''}</title>
      </Head>

      {/* Header */}
      <div className={css.header}>
        <div className={css['header-left']}>
          <h1 className={css.title}>x402 Payment Monitor</h1>
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
              <p className={css['stat-label']}>Refunded</p>
              <p className={css['stat-value']}>{refundedOrders.length}</p>
            </div>
            <div className={css['stat-card']}>
              <p className={css['stat-label']}>Total Revenue</p>
              <p className={css['stat-value']}>${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className={css['stat-card']}>
              <p className={css['stat-label']}>Gas Sponsored</p>
              <p className={css['stat-value']}>{totalGasSponsored != null ? `$${totalGasSponsored.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</p>
            </div>
            <div className={css['stat-card']}>
              <p className={css['stat-label']}>Total Refunded</p>
              <p className={css['stat-value']}>${totalRefunded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
          {data?.wallet && (
            <div className={css.wallet}>
          <div className={css['wallet-header']}>
            <span className={css['wallet-title']}>Destination Wallet</span>
            <a
              className={`${css.mono} ${css['wallet-addr']}`}
              href={`https://zapper.xyz/account/${data.wallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {data.wallet.address}
            </a>
            {walletTotalUsd != null && (
              <span className={css['wallet-total']}>
                ~${walletTotalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
          <div className={css['wallet-chains']}>
            {data.wallet.balances.map(chain => {
              const nativeSym = chain.chainId === 137 ? 'POL' : 'ETH'
              return (
                <div key={chain.chainId} className={css['wallet-chain']}>
                  <div className={css['wallet-chain-name']}>
                    <Logo src={NETWORK_LOGOS[chain.chainId]} alt={CHAIN_NAMES[chain.chainId] || chain.network} />
                    {CHAIN_NAMES[chain.chainId] || chain.network}
                  </div>
                  <div className={css['wallet-chain-bals']}>
                    <span className={css['wallet-token']}>
                      <Logo src={TOKEN_ICONS[nativeSym]} alt={nativeSym} size={14} />
                      <span className={css['wallet-token-val']}>{Number(chain.ethBalance).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</span>
                      <span className={css['wallet-token-sym']}>{nativeSym}</span>
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
          )}
        </div>
      )}

      {/* Revenue Chart */}
      {data?.completed && data.completed.length > 0 && (
        <RevenueChart orders={data.completed} />
      )}

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
        {(['today', '7d', '30d', 'all'] as const).map(p => (
          <button
            key={p}
            className={`${css['preset-btn']} ${isActivePreset(p) ? css['preset-btn-active'] : ''}`}
            onClick={() => setDatePreset(p)}
          >
            {p === 'all' ? 'All' : p === 'today' ? 'Today' : p}
          </button>
        ))}
      </div>

      {/* Completed Orders */}
      <div className={css.section}>
        <div className={css['section-header']}>
          <h2 className={css['section-title']}>Completed Orders ({activeCompleted.length})</h2>
          <button className={css['export-btn']} onClick={exportCompletedCsv} disabled={filteredCompleted.length === 0}>
            Export CSV
          </button>
        </div>
        <div className={css['table-wrap']}>
          {activeCompleted.length === 0 ? (
            <div className={css.empty}>No completed orders</div>
          ) : (
            <table className={css.table}>
              <thead>
                <tr>
                  <th>Type</th>
                  <SortableTh label="Pretix Order" sortKey="pretixOrder" currentSort={completedSort} currentDir={completedSortDir} onSort={toggleCompletedSort} />
                  <SortableTh label="Amount" sortKey="amount" currentSort={completedSort} currentDir={completedSortDir} onSort={toggleCompletedSort} />
                  <th>Crypto Amount</th>
                  <SortableTh label="Chain" sortKey="tokenChain" currentSort={completedSort} currentDir={completedSortDir} onSort={toggleCompletedSort} />
                  <th>Sponsored Gas</th>
                  <th>Tx Hash</th>
                  <th>Payer</th>
                  <SortableTh label="Completed At" sortKey="completedAt" currentSort={completedSort} currentDir={completedSortDir} onSort={toggleCompletedSort} />
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
                    <td className={undefined}>{o.totalUsd ? `$${o.totalUsd}` : '—'}</td>
                    <td><CryptoAmountCell cryptoAmount={o.cryptoAmount} tokenSymbol={o.tokenSymbol ?? undefined} /></td>
                    <td className={undefined}><ChainCell chainId={o.chainId} /></td>
                    <td className={css.mono}>{o.gasCostWei ? formatGasCost(o.gasCostWei, o.chainId, data?.wallet?.prices) : '—'}</td>
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
                    </td>
                    <td className={undefined}>{formatDate(o.completedAt)}</td>
                    <td>
                      {o.source === 'x402' ? (
                        <RefundActionCell
                          order={o as X402CompletedOrder}
                          secret={secret}
                          isConnected={isConnected}
                          onRefunded={() => fetchOrders(secret)}
                        />
                      ) : (
                        <span className={css.muted} title="On-chain refund flow is only available for x402 payments">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
                  <th className={css['col-sorted-header']}>Refunded At <span className={css['sort-arrow']}>↓</span></th>
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
                    <td><CryptoAmountCell cryptoAmount={o.cryptoAmount} tokenSymbol={o.tokenSymbol} /></td>
                    <td><ChainCell chainId={o.chainId} /></td>
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
                      ) : '—'}
                    </td>
                    <td>{o.refundMeta?.refundedAt ? formatDate(Math.floor(new Date(o.refundMeta.refundedAt as string).getTime() / 1000)) : '—'}</td>
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
          <h2 className={css['section-title']}>Pending Orders ({filteredPending.length})</h2>
          <button className={css['export-btn']} onClick={exportPendingCsv} disabled={filteredPending.length === 0}>
            Export CSV
          </button>
        </div>
        <div className={css['table-wrap']}>
          {filteredPending.length === 0 ? (
            <div className={css.empty}>No pending orders</div>
          ) : (
            <table className={css.table}>
              <thead>
                <tr>
                  <th>Payment Ref</th>
                  <SortableTh label="Amount" sortKey="amount" currentSort={pendingSort} currentDir={pendingSortDir} onSort={togglePendingSort} />
                  <th>Payer</th>
                  <th>Email</th>
                  <SortableTh label="Chain" sortKey="chain" currentSort={pendingSort} currentDir={pendingSortDir} onSort={togglePendingSort} />
                  <SortableTh label="Expires At" sortKey="expiresAt" currentSort={pendingSort} currentDir={pendingSortDir} onSort={togglePendingSort} />
                </tr>
              </thead>
              <tbody>
                {filteredPending.map(o => {
                  const isExpired = o.expiresAt < now
                  return (
                    <tr key={o.paymentReference}>
                      <td className={css.mono}>
                        <Copyable value={o.paymentReference}>{truncate(o.paymentReference)}</Copyable>
                      </td>
                      <td className={undefined}>${o.totalUsd}</td>
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
                        <span className={css['token-chain']}>
                          {o.expectedChainId != null && <Logo src={NETWORK_LOGOS[o.expectedChainId]} alt={chainName(o.expectedChainId)} />}
                          {chainName(o.expectedChainId)}
                        </span>
                      </td>
                      <td className={undefined}>
                        {formatDate(o.expiresAt)}
                        {isExpired && <span className={css.expired}> EXPIRED</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
