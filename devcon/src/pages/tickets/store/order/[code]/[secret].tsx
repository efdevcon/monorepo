import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import Page from 'components/common/layouts/page'
import { Link } from 'components/common/link'
import { Download, CircleUser, Loader2 } from 'lucide-react'
import themes from '../../../../themes.module.scss'
import css from './confirmation.module.scss'

interface OrderPosition {
  id: number
  item: number
  itemName: string
  variation: number | null
  price: string
  attendee_name: string | null
  attendee_email: string | null
  secret: string
  isAddon: boolean
}

interface PaymentInfo {
  tx_hash?: string
  chain_id?: number
  token_symbol?: string
  token_address?: string
  amount?: string
  payer?: string
  payment_reference?: string
  block_number?: number | null
}

interface OrderData {
  code: string
  status: string
  email: string
  total: string
  datetime: string
  payment_provider: string | null
  positions: OrderPosition[]
  url: string
  payment_info: PaymentInfo | null
}

export default function OrderConfirmationPage() {
  const router = useRouter()
  const { code, secret } = router.query
  const orderCode = typeof code === 'string' ? code : ''
  const orderSecret = typeof secret === 'string' ? secret : ''

  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [xUsername, setXUsername] = useState('')
  const [shareName, setShareName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [shareHash, setShareHash] = useState<string | null>(null)
  const lastWarmedImageUrlRef = useRef('')

  const xUsernameKey = orderCode ? `devcon_x_username_${orderCode}` : ''
  const shareNameKey = orderCode ? `devcon_share_name_${orderCode}` : ''
  const shareHashKey = orderCode ? `devcon_share_hash_${orderCode}` : ''

  // Upload avatar + fetch display name from X profile
  const uploadAvatar = useCallback(async (username: string) => {
    if (!orderCode || !orderSecret || !username) return
    setUploading(true)
    try {
      const res = await fetch('/api/ticket/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: orderCode, secret: orderSecret, xUsername: username }),
      })
      const data = await res.json()
      if (data.success && data.hash) {
        setShareHash(data.hash)
        localStorage.setItem(shareHashKey, data.hash)

        // Prefill name with X display name if available and name is empty
        const currentName = localStorage.getItem(shareNameKey) || ''
        const resolvedName = currentName || data.displayName || ''
        if (data.displayName && !currentName) {
          setShareName(data.displayName)
          localStorage.setItem(shareNameKey, data.displayName)
        }

        // Warm the OG image cache so Twitter gets an instant hit
        const ticketName = encodeURIComponent(resolvedName || `@${username.replace(/^@/, '')}`).replace(/%20/g, '+')
        fetch(`/api/ticket/${ticketName}/${data.hash}/i.jpg`).catch(() => {})
      }
    } catch {
      // Silent failure — share link still works, just without avatar
    }
    setUploading(false)
  }, [orderCode, orderSecret, shareHashKey, shareNameKey])

  useEffect(() => {
    if (!orderCode) return
    const savedX = localStorage.getItem(xUsernameKey) || localStorage.getItem('devcon_x_username') || ''
    const savedName = localStorage.getItem(shareNameKey) || localStorage.getItem('devcon_share_name') || ''
    const savedHash = localStorage.getItem(shareHashKey)

    if (savedX) setXUsername(savedX)
    if (savedName) setShareName(savedName)
    if (savedHash) setShareHash(savedHash)
  }, [orderCode, shareHashKey, shareNameKey, xUsernameKey])

  const handleXUsernameChange = useCallback((val: string) => {
    setXUsername(val)
    if (orderCode) localStorage.setItem(xUsernameKey, val)

    // Invalidate current hash and name since profile changed
    if (shareHash) {
      setShareHash(null)
      setShareName('')
      if (orderCode) {
        localStorage.removeItem(shareHashKey)
        localStorage.removeItem(shareNameKey)
      }
    }
  }, [orderCode, shareHash, shareHashKey, shareNameKey, xUsernameKey])

  useEffect(() => {
    if (!orderCode || !orderSecret) return

    async function fetchOrder() {
      try {
        const res = await fetch(`/api/x402/tickets/order/${orderCode}?secret=${orderSecret}`)
        const data = await res.json()
        if (data.success) {
          setOrder(data.order)
        } else {
          setError(data.error || 'Failed to load order')
        }
      } catch {
        setError('Failed to load order')
      }
      setLoading(false)
    }

    fetchOrder()
  }, [orderCode, orderSecret])

  // When user edits name manually, warm that exact {name, hash} OG variant in advance.
  useEffect(() => {
    if (!shareHash || uploading) return
    const baseName = shareName.trim() || (xUsername ? `@${xUsername.replace(/^@/, '')}` : 'Anon')
    const ticketName = encodeURIComponent(baseName).replace(/%20/g, '+')
    const imageUrl = `/api/ticket/${ticketName}/${shareHash}/i.jpg`
    if (imageUrl === lastWarmedImageUrlRef.current) return

    const t = setTimeout(() => {
      fetch(imageUrl).catch(() => {})
      lastWarmedImageUrlRef.current = imageUrl
    }, 250)

    return () => clearTimeout(t)
  }, [shareHash, shareName, xUsername, uploading])

  if (loading) {
    return (
      <Page theme={themes['tickets']} hideFooter darkHeader>
        <div className={css['page-bg']}>
          <div className={css['loading']}>Loading order...</div>
        </div>
      </Page>
    )
  }

  if (error || !order) {
    return (
      <Page theme={themes['tickets']} hideFooter darkHeader>
        <div className={css['page-bg']}>
          <div className={css['error-layout']}>
            <h1>Order Not Found</h1>
            <p>{error || 'Could not find this order.'}</p>
            <Link to="/tickets/store" className={css['back-btn']}>
              Back to Store
            </Link>
          </div>
        </div>
      </Page>
    )
  }

  const statusLabels: Record<string, string> = {
    n: 'Pending',
    p: 'Paid',
    e: 'Expired',
    c: 'Canceled',
  }

  const isPaid = order.status === 'p'
  const pi = order.payment_info
  const isCrypto = !!pi?.tx_hash

  const BLOCK_EXPLORERS: Record<number, string> = {
    1: 'https://etherscan.io',
    10: 'https://optimistic.etherscan.io',
    42161: 'https://arbiscan.io',
    8453: 'https://basescan.org',
    84532: 'https://sepolia.basescan.org',
    137: 'https://polygonscan.com',
  }
  const CHAIN_NAMES: Record<number, string> = {
    1: 'Ethereum', 10: 'Optimism', 42161: 'Arbitrum', 8453: 'Base', 84532: 'Base Sepolia', 137: 'Polygon',
  }
  const SYMBOL_DISPLAY: Record<string, string> = { USDT0: 'USD₮0' }
  const chainId = pi?.chain_id ?? null
  const explorerBase = (chainId != null && BLOCK_EXPLORERS[chainId]) ? BLOCK_EXPLORERS[chainId] : 'https://etherscan.io'
  const tokenSymbol = pi?.token_symbol ? (SYMBOL_DISPLAY[pi.token_symbol] ?? pi.token_symbol) : null
  const networkName = chainId != null ? CHAIN_NAMES[chainId] ?? null : null

  const ticketPositions = order.positions.filter(p => !p.isAddon)
  const addonPositions = order.positions.filter(p => p.isAddon)

  function groupPositions(positions: OrderPosition[]) {
    const groups = new Map<string, { name: string; price: string; quantity: number }>()
    for (const pos of positions) {
      const key = `${pos.item}-${pos.variation || ''}`
      const existing = groups.get(key)
      if (existing) {
        existing.quantity += 1
      } else {
        const name = pos.itemName.replace(/\s*[–—-]\s*(.+)$/, ' ($1)')
        groups.set(key, { name, price: pos.price, quantity: 1 })
      }
    }
    return Array.from(groups.values())
  }

  const tickets = groupPositions(ticketPositions)
  const addons = groupPositions(addonPositions)

  const attendeeName = order.positions[0]?.attendee_name || 'Attendee'

  const orderDate = new Date(order.datetime)
  const day = orderDate.getDate()
  const month = orderDate.toLocaleDateString('en-US', { month: 'short' })
  const year = orderDate.getFullYear()
  const time = orderDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const formattedDate = `${day} ${month}, ${year} at ${time}`

  const rawCryptoAmount = pi?.amount || null
  // Parse the numeric value and format to a readable precision
  const cryptoAmount = rawCryptoAmount
    ? (() => {
        const n = parseFloat(rawCryptoAmount)
        if (isNaN(n)) return rawCryptoAmount
        if (n < 0.0001) return n.toPrecision(4)
        if (n < 1) return n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')
        return n.toFixed(4)
      })()
    : null
  const totalUsd = `$${parseFloat(order.total).toFixed(2)}`

  // Build download links from Pretix order URL + first ticket position
  const firstTicketPosition = ticketPositions[0]
  const orderBaseUrl = order.url?.replace(/\/?$/, '/')
  const pdfUrl = firstTicketPosition && orderBaseUrl
    ? `${orderBaseUrl}download/${firstTicketPosition.id}/pdf`
    : null
  const passbookUrl = firstTicketPosition && orderBaseUrl
    ? `${orderBaseUrl}download/${firstTicketPosition.id}/passbook`
    : null

  return (
    <Page theme={themes['tickets']} hideFooter darkHeader>
      <div className={css['page-bg']}>
        <div className={css['layout']}>
          {/* Mobile only: order header on top */}
          <div className={css['mobile-header']}>
            <h1 className={css['order-title']}>Your order has been placed!</h1>
            <p className={css['order-subtitle']}>
              We&apos;ve sent a confirmation email to: <strong>{order.email}</strong>
            </p>
          </div>

          {/* Left: Ticket card */}
          <div className={css['ticket-card']}>
            <div className={`${css['ticket-banner']} ${isPaid ? css['ticket-banner--confirmed'] : css['ticket-banner--pending']}`}>
              <span className={css['ticket-banner-text']}>
                {isPaid ? 'Order Confirmed' : statusLabels[order.status] || order.status}
              </span>
            </div>
            <div className={css['ticket-body']}>
              <div className={css['ticket-data']}>
                <div className={css['ticket-title-block']}>
                  <h2 className={css['ticket-event-name']}>Devcon India</h2>
                  <p className={css['ticket-event-meta']}>3–6 November · Jio World Centre, Mumbai</p>
                </div>

                <hr className={css['ticket-solid-divider']} />

                <div className={css['ticket-user-data']}>
                  <div className={css['ticket-section']}>
                    <span className={css['ticket-section-label']}>Name</span>
                    <span className={css['ticket-section-value']}>{attendeeName}</span>
                  </div>

                  {tickets.length > 0 && (
                    <div className={css['ticket-section']}>
                      <span className={css['ticket-section-label']}>Tickets</span>
                      {tickets.map((t, i) => (
                        <span key={i} className={css['ticket-section-item']}>
                          {t.quantity} x {t.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {addons.length > 0 && (
                    <div className={css['ticket-section']}>
                      <span className={css['ticket-section-label']}>Add-ons</span>
                      <div className={css['ticket-addons-list']}>
                        {addons.map((a, i) => (
                          <span key={i} className={css['ticket-section-item']}>
                            {a.quantity} x {a.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <hr className={css['ticket-dashed-divider']} />

              <div className={css['share-section']}>
                <div className={css['share-preview']}>
                  <img src="/assets/images/dc8-social-ticket-preview.png" alt="Social ticket preview" className={css['share-preview-img']} />
                </div>
                <div className={css['share-input-group']}>
                  <div className={css['share-text']}>
                    <h3 className={css['share-title']}>Share on socials</h3>
                    <p className={css['share-subtitle']}>Add name and/or X username to personalize</p>
                  </div>
                  <div className={css['share-input-wrap']}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Username (optional)"
                      value={xUsername}
                      onChange={e => handleXUsernameChange(e.target.value)}
                    />
                  </div>
                  {uploading && (
                    <div className={css['share-input-wrap']}>
                      <Loader2 size={20} className={css['spin']} />
                      <span style={{ fontSize: '0.875rem', color: '#888' }}>Fetching profile...</span>
                    </div>
                  )}
                  {!uploading && (shareHash || shareName) && (
                    <div className={css['share-input-wrap']}>
                      <CircleUser size={20} />
                      <input
                        type="text"
                        placeholder="Name (optional)"
                        value={shareName}
                        onChange={e => {
                          const val = e.target.value
                          setShareName(val)
                          if (orderCode) localStorage.setItem(shareNameKey, val)
                        }}
                      />
                    </div>
                  )}
                </div>
                {(() => {
                  const ticketName = encodeURIComponent(shareName || (xUsername ? `@${xUsername.replace(/^@/, '')}` : 'Anon')).replace(/%20/g, '+')
                  const hasUsername = !!xUsername.replace(/^@/, '')
                  const needsLoad = hasUsername && !shareHash && !uploading

                  return uploading ? (
                    <button className={css['share-btn']} disabled>
                      <Loader2 size={16} className={css['spin']} />
                      Fetching profile...
                    </button>
                  ) : needsLoad ? (
                    <button className={css['share-btn']} onClick={() => uploadAvatar(xUsername)}>
                      Load profile
                    </button>
                  ) : (
                    <a
                      href="#"
                      className={css['share-btn']}
                      onClick={e => {
                        e.preventDefault()
                        const base = shareHash
                          ? `/ticket/${ticketName}/${shareHash}/?share`
                          : `/ticket/${ticketName}/?share`
                        window.open(base, '_blank')
                      }}
                    >
                      View sharing link
                    </a>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Right: Order details */}
          <div className={css['order-column']}>
            {/* Desktop only: order header inside right column */}
            <div className={css['desktop-header']}>
              <h1 className={css['order-title']}>Your order has been placed!</h1>
              <p className={css['order-subtitle']}>
                We&apos;ve sent a confirmation email to: <strong>{order.email}</strong>
              </p>
            </div>

            <hr className={css['order-divider']} />

            {/* Order summary */}
            <div className={css['summary-section']}>
              <h3 className={css['summary-heading']}>Order Summary</h3>

              <div className={css['summary-row']}>
                <span className={css['summary-label']}>Status</span>
                <span className={isPaid ? css['status-badge'] : css['status-badge-pending']}>
                  {statusLabels[order.status] || order.status}
                </span>
              </div>

              <div className={css['summary-row']}>
                <span className={css['summary-label']}>Date:</span>
                <span className={css['summary-value']}>{formattedDate}</span>
              </div>

              <div className={css['summary-row']}>
                <span className={css['summary-label']}>Order ID:</span>
                <span className={css['summary-value-semi']}>{order.code}</span>
              </div>

              <div className={css['summary-row']}>
                <span className={css['summary-label']}>Payment</span>
                {isCrypto ? (
                  <span className={css['summary-value-payment']}>
                    <strong>Crypto </strong>
                    <span>({tokenSymbol} on {networkName})</span>
                  </span>
                ) : (
                  <span className={css['summary-value-semi']}>Card (Stripe)</span>
                )}
              </div>

              {pi?.tx_hash && (
                <div className={css['summary-row']}>
                  <span className={css['summary-label']}>Transaction</span>
                  <a
                    href={`${explorerBase}/tx/${pi.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={css['tx-link']}
                  >
                    {pi.tx_hash.slice(0, 10)}...{pi.tx_hash.slice(-8)}
                  </a>
                </div>
              )}

              <div className={css['summary-row']}>
                <span className={css['summary-label']}>Total</span>
                {isCrypto && cryptoAmount ? (
                  <span className={css['summary-value-semi']}>
                    {cryptoAmount} {tokenSymbol} ({totalUsd})
                  </span>
                ) : (
                  <span className={css['summary-value-semi']}>{totalUsd}</span>
                )}
              </div>
            </div>

            <hr className={css['order-divider']} />

            {/* Save ticket */}
            <div className={css['save-section']}>
              <h3 className={css['summary-heading']}>Save Ticket</h3>
              <div className={css['save-buttons']}>
                {passbookUrl && (
                  <div className={css['wallet-row-wrapper']}>
                    <div className={css['wallet-row']}>
                      <a href={passbookUrl} target="_blank" rel="noopener noreferrer" className={css['wallet-badge']}>
                        <img src="/assets/images/add-to-google-wallet.svg" alt="Add to Google Wallet" />
                      </a>
                      <a href={passbookUrl} target="_blank" rel="noopener noreferrer" className={css['wallet-badge']}>
                        <img src="/assets/images/add-to-apple-wallet.svg" alt="Add to Apple Wallet" />
                      </a>
                    </div>
                  </div>
                )}
                {pdfUrl && (
                  <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className={css['save-btn']}>
                    <Download size={18} />
                    Download (PDF)
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  )
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  }
}

export async function getStaticProps() {
  return {
    props: {},
  }
}
