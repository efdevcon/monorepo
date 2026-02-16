import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Page from 'components/common/layouts/page'
import { Link } from 'components/common/link'
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
}

function CheckIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}

export default function OrderConfirmationPage() {
  const router = useRouter()
  const { code, secret } = router.query

  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Extra context from query params (set by checkout redirect)
  const txHash = (router.query.tx as string) || null
  const chainId = router.query.chainId ? parseInt(router.query.chainId as string) : null
  const paymentSymbolRaw = (router.query.symbol as string) || 'USDC'
  const SYMBOL_DISPLAY: Record<string, string> = { USDT0: 'USD₮0' }
  const paymentSymbol = SYMBOL_DISPLAY[paymentSymbolRaw] ?? paymentSymbolRaw
  const paymentNetwork = (router.query.network as string) || null

  useEffect(() => {
    if (!code || !secret) return

    async function fetchOrder() {
      try {
        const res = await fetch(`/api/x402/tickets/order/${code}?secret=${secret}`)
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
  }, [code, secret])

  if (loading) {
    return (
      <Page theme={themes['tickets']} hideFooter>
        <div className={css['loading']}>Loading order...</div>
      </Page>
    )
  }

  if (error || !order) {
    return (
      <Page theme={themes['tickets']} hideFooter>
        <div className={css['error-layout']}>
          <h1>Order Not Found</h1>
          <p>{error || 'Could not find this order.'}</p>
          <Link to="/tickets/store" className={css['back-btn']}>
            Back to Store
          </Link>
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
  const isCrypto = !!txHash

  const BLOCK_EXPLORERS: Record<number, string> = {
    1: 'https://etherscan.io',
    10: 'https://optimistic.etherscan.io',
    42161: 'https://arbiscan.io',
    8453: 'https://basescan.org',
    84532: 'https://sepolia.basescan.org',
  }
  const explorerBase = (chainId != null && BLOCK_EXPLORERS[chainId]) ? BLOCK_EXPLORERS[chainId] : 'https://etherscan.io'
  const paymentLabel = isCrypto
    ? (paymentNetwork ? `Crypto (${paymentSymbol} on ${paymentNetwork})` : `Crypto (${paymentSymbol})`)
    : 'Card (Stripe)'

  // Group positions by item name for display
  const ticketGroups = new Map<string, { name: string; price: string; quantity: number }>()
  for (const pos of order.positions) {
    const key = `${pos.item}-${pos.variation || ''}`
    const existing = ticketGroups.get(key)
    if (existing) {
      existing.quantity += 1
    } else {
      ticketGroups.set(key, { name: pos.itemName, price: pos.price, quantity: 1 })
    }
  }
  const tickets = Array.from(ticketGroups.values())

  const orderDate = new Date(order.datetime)
  const formattedDate = orderDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Page theme={themes['tickets']} hideFooter>
      <div className={css['confirmation-layout']}>
        <Link to="/tickets/store" className={css['back-link']}>
          <BackIcon />
          <span>Back to Store</span>
        </Link>

        <div className={css['confirmation-card']}>
          {isPaid && (
            <div className={css['success-banner']}>
              <div className={css['success-icon']}>
                <CheckIcon />
              </div>
              <h1 className={css['success-title']}>Purchase Complete!</h1>
              <p className={css['success-subtitle']}>Your Devcon tickets have been confirmed.</p>
              <p className={css['success-email']}>
                Email confirmation sent to: <strong>{order.email}</strong>
              </p>
            </div>
          )}

          {!isPaid && (
            <div className={css['pending-banner']}>
              <h1 className={css['pending-title']}>Order {statusLabels[order.status] || order.status}</h1>
              <p className={css['pending-subtitle']}>Order code: {order.code}</p>
            </div>
          )}

          {/* Order Details */}
          <div className={css['section']}>
            <h3 className={css['section-title']}>Order Details</h3>
            <div className={css['details-card']}>
              <div className={css['detail-row']}>
                <span className={css['detail-label']}>Order Code</span>
                <span className={css['detail-value']}>{order.code}</span>
              </div>
              <div className={css['detail-row']}>
                <span className={css['detail-label']}>Date</span>
                <span className={css['detail-value']}>{formattedDate}</span>
              </div>
              <div className={css['detail-row']}>
                <span className={css['detail-label']}>Status</span>
                <span className={`${css['detail-value']} ${isPaid ? css['status-paid'] : ''}`}>
                  {statusLabels[order.status] || order.status}
                </span>
              </div>
              <div className={css['detail-row']}>
                <span className={css['detail-label']}>Payment</span>
                <span className={css['detail-value']}>{paymentLabel}</span>
              </div>
              {txHash && (
                <div className={css['detail-row']}>
                  <span className={css['detail-label']}>Transaction</span>
                  <a
                    href={`${explorerBase}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={css['detail-link']}
                  >
                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </a>
                </div>
              )}
              <div className={css['detail-row']}>
                <span className={css['detail-label']}>Total</span>
                <span className={css['detail-value-bold']}>${order.total}</span>
              </div>
            </div>
          </div>

          {/* Tickets */}
          {tickets.length > 0 && (
            <div className={css['section']}>
              <h3 className={css['section-title']}>Tickets</h3>
              <div className={css['details-card']}>
                {tickets.map((ticket, i) => (
                  <div key={i} className={css['item-row']}>
                    <div className={css['item-info']}>
                      <span className={css['item-name']}>{ticket.name}</span>
                      <span className={css['item-qty']}>x{ticket.quantity}</span>
                    </div>
                    <span className={css['item-price']}>${(parseFloat(ticket.price) * ticket.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attendees */}
          {order.positions.some(p => p.attendee_name || p.attendee_email) && (
            <div className={css['section']}>
              <h3 className={css['section-title']}>Attendees</h3>
              <div className={css['details-card']}>
                {order.positions.map((pos, i) => (
                  <div key={pos.id} className={css['detail-row']}>
                    <span className={css['detail-label']}>{pos.itemName} #{i + 1}</span>
                    <span className={css['detail-value']}>
                      {pos.attendee_name || pos.attendee_email || 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Swag */}
          <div className={css['section']}>
            <h3 className={css['section-title']}>Swag</h3>
            <div className={css['details-card']}>
              <div className={css['item-row']}>
                <span className={css['item-name']}>Swag item one</span>
                <span className={css['item-price']}>FREE</span>
              </div>
              <div className={css['item-row']}>
                <span className={css['item-name']}>Swag item two</span>
                <span className={css['item-price']}>FREE</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={css['actions']}>
            {order.url && (
              <a
                href={order.url}
                target="_blank"
                rel="noopener noreferrer"
                className={css['btn-primary']}
              >
                View Your Ticket
              </a>
            )}
            <Link to="/tickets/store" className={css['btn-secondary']}>
              Back to Store
            </Link>
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
