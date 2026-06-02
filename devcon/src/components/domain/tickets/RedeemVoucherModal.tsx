import React, { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import css from './VerificationModal.module.scss'
import { TICKETING, pretixEventUrl } from 'config/ticketing'

type RedeemVoucherModalProps = {
  isOpen: boolean
  onClose: () => void
}

// 'idle' before submit, 'validating' while the API call is in flight, then one
// of the two error states from the Figma. A valid code never settles into a
// state — it redirects away.
type RedeemStatus = 'idle' | 'validating' | 'invalid' | 'redeemed'

export function RedeemVoucherModal({ isOpen, onClose }: RedeemVoucherModalProps) {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<RedeemStatus>('idle')

  // Reset to a clean slate whenever the modal is dismissed.
  useEffect(() => {
    if (!isOpen) {
      setCode('')
      setStatus('idle')
    }
  }, [isOpen])

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const trimmed = code.trim()
  const hasError = status === 'invalid' || status === 'redeemed'
  const supportEmail = TICKETING.checkout.supportEmail || 'support@devcon.org'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trimmed || status === 'validating') return
    setStatus('validating')
    try {
      const res = await fetch('/api/x402/tickets/validate-voucher/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      })
      const data = await res.json()
      if (data.valid) {
        // Hand the voucher off to the Pretix redeem flow for the active env
        // (custom domain → /redeem, slug-based → /{organizer}/{event}/redeem).
        window.location.href = pretixEventUrl(`/redeem?voucher=${encodeURIComponent(trimmed)}`)
        return
      }
      // `validateVoucher` returns "Voucher has been fully redeemed" for a used
      // code; everything else (not found, expired, fetch failure) collapses to
      // the generic invalid state per the design's two error states.
      const reason = (data.error || '').toLowerCase()
      setStatus(reason.includes('redeemed') ? 'redeemed' : 'invalid')
    } catch {
      setStatus('invalid')
    }
  }

  return (
    <div className={css['overlay']} role="dialog" aria-modal="true" aria-labelledby="redeem-voucher-title">
      <div className={css['backdrop']} onClick={onClose} aria-hidden="true" />
      <div className={`${css['modal']} ${css['redeem-modal']}`}>
        <button type="button" className={css['close']} onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className={css['redeem-body']}>
          <h2 id="redeem-voucher-title" className={css['redeem-title']}>
            Redeem a voucher
          </h2>
          <div className={css['redeem-copy']}>
            <p className={css['redeem-intro']}>
              Enter your 16-digit voucher code to unlock a discounted Devcon ticket.
            </p>
            <p className={css['redeem-subintro']}>
              Voucher codes are provided by Devcon, our partners and grant programs. Each code can only be used once.
            </p>
          </div>
          <form className={css['redeem-panel']} onSubmit={handleSubmit}>
            <div className={css['redeem-field']}>
              <label htmlFor="redeem-voucher-input" className={css['redeem-field-label']}>
                Voucher code
              </label>
              <input
                id="redeem-voucher-input"
                type="text"
                className={`${css['redeem-input']} ${hasError ? css['redeem-input-error'] : ''}`}
                value={code}
                onChange={e => {
                  setCode(e.target.value)
                  if (hasError) setStatus('idle')
                }}
                placeholder="Enter your voucher code"
                autoComplete="off"
                autoFocus
              />
              {status === 'invalid' && (
                <p className={css['redeem-error']}>Invalid voucher code. Please check and try again.</p>
              )}
              {status === 'redeemed' && (
                <p className={css['redeem-error']}>
                  This voucher has been redeemed.{' '}
                  <a href={`mailto:${supportEmail}`} className={css['redeem-error-link']}>
                    Contact support
                  </a>{' '}
                  if you believe this to be an error.
                </p>
              )}
            </div>
            <button
              type="submit"
              className={css['redeem-submit']}
              disabled={!trimmed || status === 'validating'}
            >
              {status === 'validating' ? (
                <>
                  <Loader2 className={css['redeem-spinner']} size={18} aria-hidden="true" />
                  Validating…
                </>
              ) : (
                'Redeem voucher'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
