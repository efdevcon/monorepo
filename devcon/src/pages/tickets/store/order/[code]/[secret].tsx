import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Page from 'components/common/layouts/page'
import { Link } from 'components/common/link'
import { Download, CircleUser } from 'lucide-react'
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
  payment_url: string | null
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
  const [shareName, setShareName] = useState('')

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
  const isPending = order.status === 'n'
  const isExpired = order.status === 'e'
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
  // pi.amount is a raw on-chain base-units integer (USDC/USDT0 = 10^6, ETH = 10^18).
  // Divide by the token's decimals using BigInt to avoid float precision loss on
  // wei-scale ETH values; then trim zeros for a clean display.
  const cryptoAmount = rawCryptoAmount
    ? (() => {
        const rawStr = String(rawCryptoAmount).trim()
        const rawSymbol = pi?.token_symbol
        const decimals = rawSymbol === 'ETH' ? 18 : 6
        try {
          const n = BigInt(rawStr)
          const ZERO = BigInt(0)
          if (n === ZERO) return '0'
          // BigInt(`1${'0'.repeat(decimals)}`) keeps us off the literal-syntax
          // path (`10n ** N`) which requires tsconfig target: es2020.
          const base = BigInt('1' + '0'.repeat(decimals))
          const whole = n / base
          const frac = n % base
          if (frac === ZERO) return whole.toString()
          const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
          return `${whole}.${fracStr}`
        } catch {
          // Historical orders may have stored a pre-formatted decimal — fall back.
          const f = parseFloat(rawStr)
          if (isNaN(f)) return rawStr
          if (f < 0.0001) return f.toPrecision(4)
          if (f < 1) return f.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')
          return f.toFixed(4)
        }
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
            <h1 className={css['order-title']}>
              {isPaid ? 'Your order has been placed!' : 'Your order is being processed'}
            </h1>
            <p className={css['order-subtitle']}>
              {isPaid ? (
                <>
                  We&apos;ve sent a confirmation email to: <strong>{order.email}</strong>
                </>
              ) : (
                <>
                  Payment is pending. You&apos;ll receive a confirmation email at <strong>{order.email}</strong> once
                  completed.
                </>
              )}
            </p>
          </div>

          {/* Left: Ticket card */}
          <div className={css['ticket-card']}>
            <div
              className={`${css['ticket-banner']} ${
                isPaid ? css['ticket-banner--confirmed'] : isExpired ? css['ticket-banner--expired'] : css['ticket-banner--pending']
              }`}
            >
              <span className={css['ticket-banner-text']}>
                {isPaid ? 'Order Confirmed' : order.status === 'e' ? 'Order Expired' : 'Order Pending'}
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

              {isPaid && <hr className={css['ticket-dashed-divider']} />}

              {isPaid && (
                <>
                  <div className={css['share-section']}>
                    <div className={css['share-preview']}>
                      <img
                        src="/assets/images/dc8-social-ticket-preview.png"
                        alt="Social ticket preview"
                        className={css['share-preview-img']}
                      />
                    </div>
                    <div className={css['share-input-group']}>
                      <div className={css['share-text']}>
                        <h3 className={css['share-title']}>Share on socials</h3>
                        <p className={css['share-subtitle']}>Enter an ENS name to show your avatar, or any other name</p>
                      </div>
                      <div className={css['share-input-wrap']}>
                        <CircleUser size={20} />
                        <input
                          type="text"
                          placeholder="ENS or name"
                          value={shareName}
                          onChange={e => setShareName(e.target.value)}
                        />
                      </div>
                    </div>
                    <a
                      href="#"
                      className={css['share-btn']}
                      onClick={e => {
                        e.preventDefault()
                        const ticketName = encodeURIComponent(shareName.trim() || 'Anon').replace(/%20/g, '+')
                        // Cache buster lives in the path (not a query param) so every share is
                        // a unique URL — forces Twitter/Warpcast to re-scrape and re-fetch the OG.
                        // Trailing slash matches next.config.js `trailingSlash: true`, avoiding
                        // a 308 hop on Twitter's scrape.
                        const v = Date.now().toString(36)
                        window.open(`/ticket/${ticketName}/${v}/?share`, '_blank')
                      }}
                    >
                      View sharing link
                    </a>
                  </div>
                </>
              )}
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
                <span className={isPaid ? css['status-badge'] : isExpired ? css['status-badge-expired'] : css['status-badge-pending']}>
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
                    <span>
                      ({tokenSymbol} on {networkName})
                    </span>
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

            {isPending && order.payment_url && (
              <>
                <hr className={css['order-divider']} />
                <div className={css['pending-payment-section']}>
                  <p className={css['pending-payment-text']}>Your payment has not been completed yet.</p>
                  <a
                    href="#"
                    className={css['pending-payment-btn']}
                    onClick={e => {
                      e.preventDefault()
                      const returnUrl = `${window.location.origin}${router.asPath}`
                      const separator = order.payment_url!.includes('?') ? '&' : '?'
                      window.location.href = `${order.payment_url}${separator}return_url=${encodeURIComponent(
                        returnUrl
                      )}`
                    }}
                  >
                    Complete Payment
                  </a>
                </div>
              </>
            )}

            {/* Save ticket — only shown when paid */}
            {isPaid && (
              <>
                <hr className={css['order-divider']} />
                <div className={css['save-section']}>
                  <h3 className={css['summary-heading']}>Save Ticket</h3>
                  <div className={css['save-buttons']}>
                    {passbookUrl && (
                      <div className={css['wallet-row-wrapper']}>
                        <div className={css['wallet-row']}>
                          <a
                            href={passbookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={css['wallet-badge']}
                          >
                            <img src="/assets/images/add-to-google-wallet.svg" alt="Add to Google Wallet" />
                          </a>
                          <a
                            href={passbookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={css['wallet-badge']}
                          >
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
              </>
            )}
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
