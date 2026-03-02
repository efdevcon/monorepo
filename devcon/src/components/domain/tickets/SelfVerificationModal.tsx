import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { SelfAppBuilder, getUniversalLink } from '@selfxyz/qrcode'
import type { SelfApp } from '@selfxyz/qrcode'
import { Copy, ArrowRight } from 'lucide-react'
import css from './VerificationModal.module.scss'

const SelfQRcodeWrapper = dynamic(() => import('@selfxyz/qrcode').then((mod) => mod.SelfQRcodeWrapper), {
  ssr: false,
})

const SELF_ENDPOINT = process.env.NEXT_PUBLIC_SELF_ENDPOINT || '/api/tickets/redeem-self'
const SELF_SCOPE = process.env.NEXT_PUBLIC_SELF_SCOPE || 'devcon-india-local-discount'
const ALLOW_STAGING = process.env.NEXT_PUBLIC_SELF_STAGING === 'true'

type ErrorCode = 'INVALID_ID' | 'NOT_INDIAN' | 'UNDER_18' | null

function parseError(reason?: string): { message: string; code: ErrorCode } {
  if (!reason) return { message: 'Verification failed', code: null }
  if (reason.includes('[InvalidId]') || reason.includes('Aadhaar'))
    return { message: reason, code: 'INVALID_ID' }
  if (reason.includes('[InvalidRoot]'))
    return { message: reason, code: null }
  if (reason.includes('Indian residents') || reason.includes('Nationality'))
    return { message: reason, code: 'NOT_INDIAN' }
  if (reason.includes('18') || reason.includes('age') || reason.includes('older'))
    return { message: reason, code: 'UNDER_18' }
  return { message: reason, code: null }
}

type SelfVerificationModalProps = {
  isOpen: boolean
  onClose: () => void
  useStaging: boolean
  setUseStaging: (value: boolean) => void
  discountCode?: string
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
  }, [])

  return isMobile
}

export function SelfVerificationModal({ isOpen, onClose, useStaging, setUseStaging, discountCode }: SelfVerificationModalProps) {
  const [userId, setUserId] = useState(() => crypto.randomUUID())
  const [voucher, setVoucher] = useState<string | null>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('selfVoucher')
    }
    return null
  })
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<ErrorCode>(null)

  const setErrorFromReason = (reason?: string) => {
    const { message, code } = parseError(reason)
    setError(message)
    setErrorCode(code)
  }

  const clearError = () => {
    setError(null)
    setErrorCode(null)
  }
  const [copied, setCopied] = useState(false)
  const [selfApp, setSelfApp] = useState<SelfApp | null>(null)
  const [universalLink, setUniversalLink] = useState('')
  const [pollingForVoucher, setPollingForVoucher] = useState(false)
  const hasOpenedSelfApp = React.useRef(false)
  const isMobile = useIsMobile()

  const effectiveStaging = ALLOW_STAGING && useStaging

  useEffect(() => {
    if (!isOpen) return

    try {
      let endpoint = SELF_ENDPOINT
      const params: string[] = []
      if (effectiveStaging) params.push('staging=true')
      if (discountCode) params.push(`discountCode=${encodeURIComponent(discountCode)}`)
      if (params.length > 0) endpoint = `${endpoint}?${params.join('&')}`

      const app = new SelfAppBuilder({
        appName: 'Devcon India Tickets',
        scope: SELF_SCOPE,
        endpoint,
        endpointType: effectiveStaging ? 'staging_https' : 'https',
        userId,
        userIdType: 'uuid',
        disclosures: {
          nationality: true,
          issuing_state: true,
          minimumAge: 18,
        },
      } as Partial<SelfApp>).build()

      setSelfApp(app)
      setUniversalLink(getUniversalLink(app))
    } catch (e) {
      console.error('Failed to initialize Self app:', e)
      setError('Failed to initialize verification. Please try again.')
    }
  }, [isOpen, userId, effectiveStaging, discountCode])

  const handleSuccess = async () => {
    clearError()
    const maxAttempts = 10
    const delayMs = 2000
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const res = await fetch(`/api/tickets/self-voucher?userId=${encodeURIComponent(userId)}`)
        const data = await res.json()
        if (res.ok && data.voucherCode) {
          setVoucher(data.voucherCode)
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('selfVoucher', data.voucherCode)
          }
          return
        }
        if (res.ok && data.error && data.reason) {
          setErrorFromReason(data.reason)
          return
        }
      } catch {
        // ignore and retry
      }
      await new Promise(r => setTimeout(r, delayMs))
    }
    setError('Verification timed out. Please try again.')
  }

  // When the user returns from the Self app, start polling automatically
  useEffect(() => {
    if (!isOpen) return
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasOpenedSelfApp.current && !pollingForVoucher && !voucher) {
        hasOpenedSelfApp.current = false
        setPollingForVoucher(true)
        clearError()
        handleSuccess().finally(() => setPollingForVoucher(false))
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [isOpen, pollingForVoucher, voucher])

  // Background polling fallback: the Self SDK WebSocket does not relay backend
  // verification errors (only proof_generation_failed and proof_verified exist).
  // Poll self-voucher periodically so the frontend picks up errors/vouchers
  // regardless of WebSocket behaviour.
  useEffect(() => {
    if (!isOpen || voucher || error) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/tickets/self-voucher?userId=${encodeURIComponent(userId)}`)
        const data = await res.json()
        if (res.ok && data.voucherCode) {
          setVoucher(data.voucherCode)
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('selfVoucher', data.voucherCode)
          }
        } else if (res.ok && data.error && data.reason) {
          setErrorFromReason(data.reason)
        }
      } catch {
        // ignore
      }
    }

    const id = setInterval(poll, 3000)
    return () => clearInterval(id)
  }, [isOpen, userId, voucher, error])

  const handleReset = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('selfVoucher')
    }
    setVoucher(null)
    clearError()
    setCopied(false)
    setSelfApp(null)
    setUniversalLink('')
    setUserId(crypto.randomUUID())
  }

  const handleCopyCode = async () => {
    if (!voucher || typeof navigator?.clipboard?.writeText !== 'function') return
    await navigator.clipboard.writeText(voucher)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div
      className={`${css['overlay']} ${css['self-overlay']}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="self-verification-title"
    >
      <div className={css['backdrop']} onClick={onClose} aria-hidden="true" />
      <div className={`${css['modal']} ${css['self-modal']}`}>
        <button type="button" className={`${css['close']} ${css['self-close']}`} onClick={onClose} aria-label="Close">
          &times;
        </button>

        {voucher ? (
          <div className={css['self-padded']}>
            <h2 id="self-verification-title" className={css['success-title']}>
              Proof successfully submitted!
            </h2>
            <div className={css['success-text-block']}>
              <p className={css['success-intro']}>
                Your Self proof was successfully generated and submitted. Your discount code is unique to your identity
                and can be found below.
              </p>
              <p className={css['success-note']}>
                <strong>Note:</strong> This code must be entered at checkout to purchase your discounted Devcon ticket.
              </p>
            </div>
            <hr className={css['self-divider']} aria-hidden="true" />
            <div className={css['voucher-card']}>
              <div className={css['voucher-card-inner']}>
                <p className={css['voucher-card-label']}>YOUR DISCOUNT CODE</p>
                <div className={css['voucher-code-row']}>
                  <span className={css['voucher-code']}>{voucher}</span>
                  <button
                    type="button"
                    className={css['voucher-copy']}
                    onClick={handleCopyCode}
                    aria-label={copied ? 'Copied' : 'Copy code'}
                    title={copied ? 'Copied' : 'Copy to clipboard'}
                  >
                    {copied ? (
                      <span className={css['voucher-copy-text']}>Copied</span>
                    ) : (
                      <Copy size={20} aria-hidden />
                    )}
                  </button>
                </div>
              </div>
              <a
                href={
                  process.env.NEXT_PUBLIC_PRETIX_CHECKOUT_URL
                    ? `${process.env.NEXT_PUBLIC_PRETIX_CHECKOUT_URL}redeem?voucher=${voucher}`
                    : `/en/tickets/store/redeem?voucher=${voucher}`
                }
                className={css['voucher-cta']}
              >
                Go to Ticket Store
                <ArrowRight size={20} aria-hidden />
              </a>
            </div>
            <p className={css['privacy']}>No personal data is shared!</p>
          </div>
        ) : (
          <div className={css['self-content']}>
            <div className={css['eth-banner']}>
              <p className={css['eth-banner-text']}>Thanks &ndash; ETH Mumbai ticket confirmed!</p>
            </div>
            <h2 id="self-verification-title" className={css['self-title']}>
              Verification via Self
            </h2>

            <p className={css['self-intro']}>
              Self allows you to prove your identity using your Aadhaar card without revealing personal data. The
              verification uses zero-knowledge proofs — your information never leaves your device.
            </p>

            <hr className={css['self-divider']} aria-hidden="true" />

            <div className={css['self-howto']}>
              <h3 className={css['self-heading']}>How to use</h3>
              <ol className={css['self-steps']}>
                <li>
                  Download the Self app on{' '}
                  <a
                    href="https://apps.apple.com/app/self-zk-proofs/id6478563710"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    iOS
                  </a>{' '}
                  or{' '}
                  <a
                    href="https://play.google.com/store/apps/details?id=com.proofofpassportapp&pli=1"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Android
                  </a>
                </li>
                <li>Scan your Aadhaar card&apos;s NFC using the Self app</li>
                {isMobile ? (
                  <li>Tap the button below to open the Self app and share your proof</li>
                ) : (
                  <li>
                    <span className={css['self-steps-highlight']}>Scan the QR code below</span> with the Self app to share your proof
                  </li>
                )}
              </ol>
            </div>

            {ALLOW_STAGING && (
              <div
                className={`${css['test-mode']} ${effectiveStaging ? css['test-mode--test'] : css['test-mode--real']}`}
              >
                <div className={css['test-mode-inner']}>
                  <span className={css['test-mode-label']}>Self mode</span>
                  <span className={css['test-mode-badge']} aria-live="polite">
                    {effectiveStaging ? 'Test' : 'Production'}
                  </span>
                </div>
                <button
                  type="button"
                  className={css['test-mode-btn']}
                  onClick={() => {
                    setUseStaging(!useStaging)
                    handleReset()
                  }}
                >
                  Switch to {effectiveStaging ? 'production' : 'test'}
                </button>
              </div>
            )}

            {error && errorCode === null && <p className={css['error']}>{error}</p>}
            {errorCode === 'INVALID_ID' && (
              <p className={css['self-aadhaar-notice']}>
                <strong>Aadhaar cards only.</strong> Passport and other document types are not supported.
              </p>
            )}
            {errorCode === 'NOT_INDIAN' && (
              <p className={css['self-aadhaar-notice']}>
                Sorry, your nationality is not Indian. This offer is currently exclusive to Indian residents with an
                Aadhaar card, who attended ETH Mumbai.
              </p>
            )}
            {errorCode === 'UNDER_18' && (
              <div className={css['self-aadhaar-notice']}>
                <p>
                  <strong>Sorry, we can&apos;t issue you a code.</strong>
                </p>
                <p>
                  Your Self proof was successfully submitted however, the zero-knowledge proof provided shows that
                  you&apos;re not over 18 years old.
                </p>
                <p>
                  Devcon India will have unique, lower cost tickets for Youths aged 5-17 later this year. We recommend
                  waiting until then to purchase a ticket.
                </p>
                <p>We apologize for any inconvenience.</p>
              </div>
            )}
            {(error || errorCode) && (
              <button type="button" className={css['reset-btn']} onClick={handleReset}>
                Try again
              </button>
            )}

            {!error && !errorCode && (
              isMobile ? (
                <div className={css['continue-wrap']}>
                  <a
                    href={universalLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={css['redeem-btn']}
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      textDecoration: 'none',
                      pointerEvents: universalLink ? 'auto' : 'none',
                      opacity: universalLink ? 1 : 0.6,
                    }}
                    onClick={() => {
                      hasOpenedSelfApp.current = true
                      clearError()
                    }}
                  >
                    Open Self App
                  </a>
                  {pollingForVoucher && (
                    <p style={{ textAlign: 'center', margin: '1rem 0 0', fontSize: '0.9rem', color: '#666' }}>
                      Checking verification status...
                    </p>
                  )}
                  {!pollingForVoucher && !voucher && (
                    <button
                      type="button"
                      className={css['reset-btn']}
                      style={{ marginTop: '0.75rem' }}
                      onClick={() => {
                        setPollingForVoucher(true)
                        clearError()
                        handleSuccess().finally(() => setPollingForVoucher(false))
                      }}
                    >
                      I&apos;ve verified — check status
                    </button>
                  )}
                </div>
              ) : (
                <div className={css['self-qr-wrap']}>
                  {selfApp ? (
                    <SelfQRcodeWrapper
                      selfApp={selfApp}
                      onSuccess={handleSuccess}
                      onError={data => setErrorFromReason(data.reason)}
                      darkMode={false}
                    />
                  ) : (
                    <div className={css['self-qr-placeholder']}>
                      <p>Loading QR Code...</p>
                    </div>
                  )}
                </div>
              )
            )}

            <p className={css['self-privacy']}>No personal data is shared!</p>

          </div>
        )}
      </div>
    </div>
  )
}
