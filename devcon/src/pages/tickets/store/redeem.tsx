import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Page from 'components/common/layouts/page'
import { Link } from 'components/common/link'
import { ArrowLeft, Copy, Send, Loader2 } from 'lucide-react'
import Image from 'next/image'
import DevconLogo from 'assets/images/dc-8/dc8-logo.png'
import themes from '../../themes.module.scss'
import css from './checkout.module.scss'
import { TICKETING } from 'config/ticketing'

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

  // Reserve mode state (when shop is closed)
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [sending, setSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const voucherCode = (router.query.voucher as string) || ''
  const isShopOpen = TICKETING.isShopOpen

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

  // ── Reserve mode helpers ──

  const firstTicket = result?.applicableTickets?.[0]
  const discountedPrice = firstTicket ? formatPrice(parseFloat(firstTicket.discountedPrice)) : '—'
  const originalPrice = firstTicket ? formatPrice(parseFloat(firstTicket.originalPrice)) : '—'

  const handleCopyCode = async () => {
    if (!voucherCode || typeof navigator?.clipboard?.writeText !== 'function') return
    await navigator.clipboard.writeText(voucherCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  const handleSendEmail = async () => {
    setEmailError('')

    if (!email.trim()) {
      setEmailError('Email address is required.')
      return
    }
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }
    if (email !== confirmEmail) {
      setEmailError('Email addresses do not match.')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/tickets/send-voucher-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), voucherCode }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setEmailError(data.error || 'Failed to send email. Please try again.')
        setSending(false)
        return
      }

      setEmailSent(true)
    } catch {
      setEmailError('Failed to send email. Please try again.')
    }
    setSending(false)
  }

  // ── Reserve: email sent success view ──

  if (!isShopOpen && emailSent) {
    return (
      <Page theme={themes['tickets']} hideFooter darkHeader>
        <div className={css['checkout-layout'] + ' ' + css['checkout-layout-centered']}>
          <main className={css['main']}>
            <Link to="/" className={css['back-link']}>
              <ArrowLeft size={20} />
              <span>Back to Home</span>
            </Link>
            <h1 className={css['page-title']}>Voucher code sent successfully!</h1>

            <p className={css['reserve-subtitle']}>
              We&apos;ve sent the email containing your code to: <strong>{email}</strong>
            </p>

            <hr className={css['reserve-divider']} />

            <div className={css['reserve-card']}>
              <div className={css['section-body']}>
                <h3 className={css['reserve-card-title']}>What happens next?</h3>

                <div className={css['reserve-next-text']}>
                  <p>
                    Your voucher code <strong>{voucherCode}</strong> has been reserved and is linked to your Aadhaar ID.
                  </p>
                  <p>
                    <strong>We&apos;ll notify you before tickets go live</strong>, so you&apos;re ready to secure yours
                    early.
                  </p>
                  <p>
                    When tickets go live,{' '}
                    <strong>we&apos;ll send you a reminder with a direct link</strong> to purchase your discounted{' '}
                    <strong>${discountedPrice}</strong> ticket.
                  </p>
                  <p>
                    Thank you, we&apos;ll be in touch!
                    <br />
                    The Devcon Team 💜
                  </p>
                </div>
              </div>
            </div>

            <div className={css['redeem-logo']}>
              <Image src={DevconLogo} alt="Devcon 8 India" width={146} height={64} />
            </div>
          </main>
        </div>
      </Page>
    )
  }

  // ── Shared: loading, error, no voucher states ──

  const backLink = isShopOpen ? '/tickets/store' : '/tickets'
  const backLabel = isShopOpen ? 'Back to Tickets' : 'Back to Tickets'
  const pageTitle = isShopOpen ? 'Redeem voucher' : 'Voucher code reserved'
  const noVoucherLink = isShopOpen ? '/tickets/store' : '/tickets'
  const noVoucherLabel = isShopOpen ? 'ticket store' : 'tickets page'

  return (
    <Page theme={themes['tickets']} hideFooter darkHeader>
      <div className={css['checkout-layout'] + ' ' + css['checkout-layout-centered']}>
        <main className={css['main']}>
          <Link to={backLink} className={css['back-link']}>
            <ArrowLeft size={20} />
            <span>{backLabel}</span>
          </Link>
          <h1 className={css['page-title']}>{pageTitle}</h1>

          {!voucherCode && (
            <div className={css['section-card']}>
              <div className={css['section-body']}>
                <p>
                  No voucher code provided. Please use a valid voucher link or go to the{' '}
                  <Link to={noVoucherLink}>{noVoucherLabel}</Link>.
                </p>
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
                      If you believe this is an error, please{' '}
                      <a href="mailto:support@devcon.org" style={{ color: '#7235ed', fontWeight: 600 }}>
                        contact support
                      </a>
                      . You can also browse the <Link to="/tickets/store">ticket store</Link> to purchase tickets at
                      regular price.
                    </p>
                  </>
                ) : result.error?.includes('expired') ? (
                  <>
                    <p>
                      The voucher code <strong>{voucherCode}</strong> has expired and can no longer be used.
                    </p>
                    <p>
                      You can still browse the <Link to="/tickets/store">ticket store</Link> and purchase tickets at
                      regular price.
                    </p>
                  </>
                ) : (
                  <p>
                    The voucher code <strong>{voucherCode}</strong> could not be validated. Please check your code and
                    try again.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Shop open: redeem flow ── */}
          {isShopOpen && voucherCode && !loading && result?.valid && (
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
                      {result.priceMode === 'percent' && (
                        <>
                          {' '}
                          with a <strong>{parseFloat(result.value || '0')}% discount</strong>
                        </>
                      )}
                      {result.priceMode === 'subtract' && (
                        <>
                          {' '}
                          with <strong>${formatPrice(parseFloat(result.value || '0'))} off</strong>
                        </>
                      )}
                      {result.priceMode === 'set' && (
                        <>
                          {' '}
                          to <strong>${formatPrice(parseFloat(result.value || '0'))}</strong>
                        </>
                      )}
                      . Add a ticket to your cart to continue.
                    </p>
                  </div>
                </div>

                <hr className={css['redeem-divider']} />

                {result.applicableTickets && result.applicableTickets.length > 0 ? (
                  <div className={css['swag-grid']}>
                    {result.applicableTickets.map(ticket => {
                      const origPrice = parseFloat(ticket.originalPrice)
                      const discPrice = parseFloat(ticket.discountedPrice)
                      const hasDiscount = discPrice < origPrice
                      return (
                        <div key={ticket.id} className={css['redeem-card']}>
                          <div className={css['redeem-card-details']}>
                            <h4 className={css['redeem-ticket-name']}>{ticket.name}</h4>
                            <p className={css['redeem-ticket-desc']}>
                              Full conference access including talks and workshops, swag bag, plus coffee, lunch and
                              snacks all week.
                            </p>
                          </div>
                          <div className={css['redeem-card-footer']}>
                            <div className={css['redeem-price-row']}>
                              <span className={css['redeem-price-current']}>
                                ${hasDiscount ? formatPrice(discPrice) : formatPrice(origPrice)}
                              </span>
                              {hasDiscount && (
                                <span className={css['redeem-price-original']}>${formatPrice(origPrice)}</span>
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

          {/* ── Shop closed: reserve flow ── */}
          {!isShopOpen && voucherCode && !loading && result?.valid && (
            <div className={css['reserve-card']}>
              <div className={css['section-body']}>
                <h3 className={css['reserve-card-title']}>Your voucher is locked in</h3>

                <p className={css['reserve-description']}>
                  Voucher code <strong>{result.code}</strong> is reserved and linked to your Aadhaar ID. When tickets go
                  on sale, you&apos;ll pay <strong>${discountedPrice}</strong> instead of ${originalPrice} when using
                  this code.
                </p>

                <button type="button" className={css['reserve-copy-btn']} onClick={handleCopyCode}>
                  <Copy size={16} />
                  <span>{copied ? 'Copied!' : 'Copy code'}</span>
                </button>

                <hr className={css['reserve-divider']} />

                <span className={css['reserve-email-label']}>Send voucher via Email</span>
                <span className={css['reserve-email-help']}>
                  Enter your email to get your code sent to your inbox, plus a heads-up the moment tickets go live.
                </span>

                <div className={css['reserve-email-row']}>
                  <input
                    type="email"
                    className={css['reserve-email-input']}
                    placeholder="Email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                  <input
                    type="email"
                    className={css['reserve-email-input']}
                    placeholder="Confirm email"
                    value={confirmEmail}
                    onChange={e => setConfirmEmail(e.target.value)}
                  />
                </div>

                {emailError && <p className={css['field-error']}>{emailError}</p>}

                <button
                  type="button"
                  className={css['reserve-send-btn']}
                  onClick={handleSendEmail}
                  disabled={sending}
                >
                  {sending ? (
                    <>
                      <Loader2 className={css['loading-spinner']} size={18} />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Send voucher code</span>
                    </>
                  )}
                </button>
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
