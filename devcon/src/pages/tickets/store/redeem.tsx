import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Page from 'components/common/layouts/page'
import { Link } from 'components/common/link'
import themes from '../../themes.module.scss'
import css from './checkout.module.scss'

interface ApplicableTicket {
  id: number
  name: string
  originalPrice: string
  discountedPrice: string
}

interface VoucherResult {
  valid: boolean
  code?: string
  priceMode?: string
  value?: string
  itemId?: number | null
  applicableTickets?: ApplicableTicket[]
  error?: string
}

export default function RedeemPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<VoucherResult | null>(null)
  const [addingToCart, setAddingToCart] = useState(false)

  const voucherCode = (router.query.voucher as string) || ''

  useEffect(() => {
    if (!router.isReady || !voucherCode) return

    async function validate() {
      setLoading(true)
      try {
        const res = await fetch('/api/x402/tickets/validate-voucher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: voucherCode }),
        })
        const data = await res.json()
        setResult(data)
      } catch {
        setResult({ valid: false, error: 'Failed to validate voucher. Please try again.' })
      }
      setLoading(false)
    }

    validate()
  }, [router.isReady, voucherCode])

  const handleAddToCart = (ticket: ApplicableTicket) => {
    setAddingToCart(true)

    // Build cart with the original ticket price — voucher discount is computed
    // separately on checkout from the voucher code, so we must not double-apply it
    const cartData = {
      items: [
        {
          ticketId: ticket.id,
          name: ticket.name,
          price: ticket.originalPrice,
          quantity: 1,
        },
      ],
      paymentInfo: null,
      savedAt: Date.now(),
      voucher: voucherCode,
    }

    localStorage.setItem('devcon-ticket-cart', JSON.stringify(cartData))
    router.push(`/tickets/store/checkout?voucher=${encodeURIComponent(voucherCode)}`)
  }

  return (
    <Page theme={themes['tickets']} hideFooter>
      <div className={css['checkout-layout']}>
        <main className={css['main']}>
          <Link to="/tickets/store" className={css['back-link']}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Back to Store</span>
          </Link>
          <h1 className={css['page-title']}>Redeem Voucher</h1>

          {!voucherCode && (
            <div className={css['section-card']}>
              <div className={css['section-body']}>
                <p>No voucher code provided. Please use a valid voucher link or go to the <Link to="/tickets/store">ticket store</Link>.</p>
              </div>
            </div>
          )}

          {voucherCode && loading && (
            <div className={css['section-card']}>
              <div className={css['section-body']}>
                <p className={css['status-text']}>Validating voucher code...</p>
              </div>
            </div>
          )}

          {voucherCode && !loading && result && !result.valid && (
            <div className={css['section-card']}>
              <div className={css['section-body']}>
                <div className={css['error-box']}>
                  <div>{result.error || 'Invalid voucher code'}</div>
                </div>
                <p style={{ marginTop: '1rem' }}>
                  The voucher code <strong>{voucherCode}</strong> could not be applied.
                  You can still browse the <Link to="/tickets/store">ticket store</Link> and purchase tickets at regular price.
                </p>
              </div>
            </div>
          )}

          {voucherCode && !loading && result?.valid && (
            <div className={css['section-card']}>
              <div className={css['section-body']}>
                <div className={css['description-block']}>
                  <p className={css['description-title']}>Voucher applied!</p>
                  <p className={css['description-sub']}>
                    Your voucher code <strong>{result.code}</strong> is valid.
                    {result.priceMode === 'percent' && ` You get ${parseFloat(result.value || '0')}% off.`}
                    {result.priceMode === 'subtract' && ` You get $${parseFloat(result.value || '0').toFixed(2)} off.`}
                    {result.priceMode === 'set' && ` Your ticket price is set to $${parseFloat(result.value || '0').toFixed(2)}.`}
                    {' '}Select a ticket below to continue.
                  </p>
                </div>

                {result.applicableTickets && result.applicableTickets.length > 0 ? (
                  <div className={css['swag-grid']}>
                    {result.applicableTickets.map((ticket) => {
                      const originalPrice = parseFloat(ticket.originalPrice)
                      const discountedPrice = parseFloat(ticket.discountedPrice)
                      const hasDiscount = discountedPrice < originalPrice
                      return (
                        <div key={ticket.id} className={css['redeem-card']}>
                          <div className={css['swag-info']}>
                            <h4>{ticket.name}</h4>
                            <p className={css['redeem-price']}>
                              {hasDiscount ? (
                                <>
                                  <span className={css['redeem-price-old']}>${originalPrice.toFixed(2)}</span>
                                  <span className={css['redeem-price-new']}>${discountedPrice.toFixed(2)}</span>
                                </>
                              ) : (
                                <strong>${originalPrice.toFixed(2)}</strong>
                              )}
                            </p>
                          </div>
                          <button
                            type="button"
                            className={css['btn-continue']}
                            onClick={() => handleAddToCart(ticket)}
                            disabled={addingToCart}
                          >
                            {addingToCart ? 'Adding...' : 'Add to Cart & Checkout'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p>No applicable tickets found for this voucher.</p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </Page>
  )
}

export async function getStaticProps() {
  return {
    props: {},
  }
}
