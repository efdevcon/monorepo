import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Page from 'components/common/layouts/page'
import { Link } from 'components/common/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Image from 'next/image'
import DevconLogo from 'assets/images/dc-8/dc8-logo.png'
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

  const formatPrice = (n: number) => (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2))

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
    <Page theme={themes['tickets']} hideFooter darkHeader>
      <div className={css['checkout-layout'] + ' ' + css['checkout-layout-centered']}>
        <main className={css['main']}>
          <Link to="/tickets/store" className={css['back-link']}>
            <ArrowLeft size={20} />
            <span>Back to Tickets</span>
          </Link>
          <h1 className={css['page-title']}>Redeem voucher</h1>

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
                <div className={css['loading-box']}>
                  <Loader2 className={css['loading-spinner']} size={24} />
                  <span>Validating voucher code...</span>
                </div>
              </div>
            </div>
          )}

          {voucherCode && !loading && result && !result.valid && (
            <div className={css['section-card']}>
              <div className={css['section-body']}>
                <div className={css['payment-notice'] + ' ' + css['payment-notice-error']}>
                  {result.error || 'Invalid voucher code'}
                </div>
                {result.error?.includes('fully redeemed') ? (
                  <>
                    <p>
                      The voucher code <strong>{voucherCode}</strong> has already been used and cannot be applied again.
                    </p>
                    <p>
                      If you believe this is an error, please <a href="mailto:support@devcon.org" style={{ color: '#7235ed', fontWeight: 600 }}>contact support</a>.
                      You can also browse the <Link to="/tickets/store">ticket store</Link> to purchase tickets at regular price.
                    </p>
                  </>
                ) : result.error?.includes('expired') ? (
                  <>
                    <p>
                      The voucher code <strong>{voucherCode}</strong> has expired and can no longer be used.
                    </p>
                    <p>
                      You can still browse the <Link to="/tickets/store">ticket store</Link> and purchase tickets at regular price.
                    </p>
                  </>
                ) : (
                  <p>
                    The voucher code <strong>{voucherCode}</strong> could not be applied.
                    You can still browse the <Link to="/tickets/store">ticket store</Link> and purchase tickets at regular price.
                  </p>
                )}
              </div>
            </div>
          )}

          {voucherCode && !loading && result?.valid && (
            <div className={css['section-card']}>
              <div className={css['section-body']}>
                <div className={css['redeem-description']}>
                  <h3 className={css['redeem-heading']}>Voucher applied!</h3>
                  <div className={css['redeem-text']}>
                    <p>
                      Your voucher code <strong>{result.code}</strong> is ready to redeem.
                    </p>
                    <p>
                      Your ticket price has been updated
                      {result.priceMode === 'percent' && <> with a <strong>{parseFloat(result.value || '0')}% discount</strong></>}
                      {result.priceMode === 'subtract' && <> with <strong>${formatPrice(parseFloat(result.value || '0'))} off</strong></>}
                      {result.priceMode === 'set' && <> to <strong>${formatPrice(parseFloat(result.value || '0'))}</strong></>}
                      . Add a ticket to your cart to continue.
                    </p>
                  </div>
                </div>

                <hr className={css['redeem-divider']} />

                {result.applicableTickets && result.applicableTickets.length > 0 ? (
                  <div className={css['swag-grid']}>
                    {result.applicableTickets.map(ticket => {
                      const originalPrice = parseFloat(ticket.originalPrice)
                      const discountedPrice = parseFloat(ticket.discountedPrice)
                      const hasDiscount = discountedPrice < originalPrice
                      return (
                        <div key={ticket.id} className={css['redeem-card']}>
                          <div className={css['redeem-card-details']}>
                            <h4 className={css['redeem-ticket-name']}>{ticket.name}</h4>
                            <p className={css['redeem-ticket-desc']}>
                              Full conference access including talks and workshops, swag bag, plus coffee, lunch and snacks all week.
                            </p>
                          </div>
                          <div className={css['redeem-card-footer']}>
                            <div className={css['redeem-price-row']}>
                              <span className={css['redeem-price-current']}>
                                ${hasDiscount ? formatPrice(discountedPrice) : formatPrice(originalPrice)}
                              </span>
                              {hasDiscount && (
                                <span className={css['redeem-price-original']}>${formatPrice(originalPrice)}</span>
                              )}
                            </div>
                            <button
                              type="button"
                              className={css['redeem-btn']}
                              onClick={() => handleAddToCart(ticket)}
                              disabled={addingToCart}
                            >
                              {addingToCart ? 'Adding...' : 'Add to Cart & Checkout'}
                            </button>
                          </div>
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

          <div className={css['redeem-logo']}>
            <Image src={DevconLogo} alt="Devcon 8 India" width={146} height={64} />
          </div>
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
