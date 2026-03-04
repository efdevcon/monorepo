import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Head from 'next/head'
import css from './admin.module.scss'

const STORAGE_KEY = 'x402_admin_secret'
const POLL_INTERVAL = 30_000

interface CompletedOrder {
  paymentReference: string
  pretixOrderCode: string
  txHash: string
  payer: string
  completedAt: number
  chainId?: number
  totalUsd?: string
  tokenSymbol?: string
  cryptoAmount?: string
  gasCostWei?: string
  env: string
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
  stats: { pending: number; completed: number }
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
  return (
    <th className={css.sortable} onClick={() => onSort(sortKey)}>
      {label}
      <SortArrow active={currentSort === sortKey} dir={currentDir} />
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

export default function AdminPage() {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [inputSecret, setInputSecret] = useState('')
  const [loginError, setLoginError] = useState('')
  const [data, setData] = useState<OrdersResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Date range filter — default to "All" (show everything on load)
  const [dateFrom, setDateFrom] = useState(() => new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))

  // Sorting
  const [completedSort, setCompletedSort] = useState<string | null>(null)
  const [completedSortDir, setCompletedSortDir] = useState<SortDir>('desc')
  const [pendingSort, setPendingSort] = useState<string | null>(null)
  const [pendingSortDir, setPendingSortDir] = useState<SortDir>('desc')

  const fetchOrders = useCallback(
    async (key: string) => {
      setLoading(true)
      try {
        const res = await fetch('/api/x402/admin/orders', {
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
  function matchesSearch(fields: (string | undefined)[]) {
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

  const totalRevenue = useMemo(() =>
    filteredCompleted.reduce((sum, o) => sum + (o.totalUsd ? parseFloat(o.totalUsd) : 0), 0),
    [filteredCompleted]
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
    const headers = ['Pretix Order', 'Amount (USD)', 'Crypto Amount', 'Token', 'Chain', 'Gas Cost (ETH)', 'Tx Hash', 'Payer', 'Completed At']
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
              <p className={css['stat-value']}>{filteredCompleted.length}</p>
            </div>
            <div className={css['stat-card']}>
              <p className={css['stat-label']}>Total Revenue</p>
              <p className={css['stat-value']}>${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className={css['stat-card']}>
              <p className={css['stat-label']}>Gas Sponsored</p>
              <p className={css['stat-value']}>{totalGasSponsored != null ? `$${totalGasSponsored.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</p>
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
          <h2 className={css['section-title']}>Completed Orders ({filteredCompleted.length})</h2>
          <button className={css['export-btn']} onClick={exportCompletedCsv} disabled={filteredCompleted.length === 0}>
            Export CSV
          </button>
        </div>
        <div className={css['table-wrap']}>
          {filteredCompleted.length === 0 ? (
            <div className={css.empty}>No completed orders</div>
          ) : (
            <table className={css.table}>
              <thead>
                <tr>
                  <SortableTh label="Pretix Order" sortKey="pretixOrder" currentSort={completedSort} currentDir={completedSortDir} onSort={toggleCompletedSort} />
                  <SortableTh label="Amount" sortKey="amount" currentSort={completedSort} currentDir={completedSortDir} onSort={toggleCompletedSort} />
                  <SortableTh label="Token / Chain" sortKey="tokenChain" currentSort={completedSort} currentDir={completedSortDir} onSort={toggleCompletedSort} />
                  <th>Crypto Amount</th>
                  <th>Gas Cost</th>
                  <th>Tx Hash</th>
                  <th>Payer</th>
                  <SortableTh label="Completed At" sortKey="completedAt" currentSort={completedSort} currentDir={completedSortDir} onSort={toggleCompletedSort} />
                </tr>
              </thead>
              <tbody>
                {filteredCompleted.map(o => (
                  <tr key={o.paymentReference}>
                    <td>
                      <a
                        className={css.link}
                        href={`${data?.pretixBaseUrl}/${o.pretixOrderCode}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {o.pretixOrderCode}
                      </a>
                    </td>
                    <td>{o.totalUsd ? `$${o.totalUsd}` : '—'}</td>
                    <td><TokenChainCell tokenSymbol={o.tokenSymbol} chainId={o.chainId} /></td>
                    <td className={css.mono}>{o.cryptoAmount || '—'}</td>
                    <td className={css.mono}>{formatGasCost(o.gasCostWei, o.chainId, data?.wallet?.prices)}</td>
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
                    <td>{formatDate(o.completedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
                      <td>${o.totalUsd}</td>
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
                      <td>
                        <span className={css['token-chain']}>
                          {o.expectedChainId != null && <Logo src={NETWORK_LOGOS[o.expectedChainId]} alt={chainName(o.expectedChainId)} />}
                          {chainName(o.expectedChainId)}
                        </span>
                      </td>
                      <td>
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
