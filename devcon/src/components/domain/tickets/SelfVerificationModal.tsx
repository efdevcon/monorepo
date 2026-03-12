import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { SelfAppBuilder, getUniversalLink } from '@selfxyz/qrcode'
import type { SelfApp } from '@selfxyz/qrcode'
import { Copy, ArrowRight } from 'lucide-react'
import css from './VerificationModal.module.scss'
import { TICKETING } from 'config/ticketing'

const SelfQRcodeWrapper = dynamic(() => import('@selfxyz/qrcode').then((mod) => mod.SelfQRcodeWrapper), {
  ssr: false,
})

const SELF_ENDPOINT = process.env.NEXT_PUBLIC_SELF_ENDPOINT || '/api/tickets/redeem-self'
const SELF_SCOPE = TICKETING.self.scope
const ALLOW_STAGING = TICKETING.self.staging

type ErrorCode = 'INVALID_ID' | 'NOT_INDIAN' | 'UNDER_18' | 'NO_VOUCHERS' | null

function parseError(reason?: string): { message: string; code: ErrorCode } {
  if (!reason) return { message: 'Verification failed', code: null }
  if (reason.includes('No vouchers available') || reason.includes('no vouchers') || reason.includes('last Early Access'))
    return { message: reason, code: 'NO_VOUCHERS' }
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
  earlyAccess?: string
  email?: string
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
  }, [])

  return isMobile
}

export function SelfVerificationModal({ isOpen, onClose, useStaging, setUseStaging, earlyAccess, email }: SelfVerificationModalProps) {
  const [userId, setUserId] = useState(() => crypto.randomUUID())
  const [voucher, setVoucher] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
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
      if (earlyAccess) params.push(`earlyAccess=${encodeURIComponent(earlyAccess)}`)
      if (email) params.push(`email=${encodeURIComponent(email)}`)
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
  }, [isOpen, userId, effectiveStaging, earlyAccess, email])

  const handleSuccess = async () => {
    clearError()
    const maxAttempts = 10
    const delayMs = 2000
    let lastError: string | undefined
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const res = await fetch(`/api/tickets/self-voucher?userId=${encodeURIComponent(userId)}`)
        const data = await res.json()
        if (res.ok && data.voucherCode) {
          clearError()
          setVoucher(data.voucherCode)
          return
        }
        if (res.ok && data.error && data.reason) {
          // Don't stop immediately — a parallel backend request may still be assigning the voucher.
          // Keep polling; only show the error after all attempts are exhausted.
          lastError = data.reason
        }
      } catch {
        // ignore and retry
      }
      await new Promise(r => setTimeout(r, delayMs))
    }
    if (lastError) {
      setErrorFromReason(lastError)
    } else {
      setError('Verification timed out. Please try again.')
    }
  }

  // Send email when voucher is obtained, regardless of which code path found it
  useEffect(() => {
    if (!voucher || !email || emailSent) return
    fetch('/api/tickets/send-voucher-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, voucherCode: voucher }),
    })
      .then(res => res.json())
      .then(data => { if (data.success) setEmailSent(true) })
      .catch(() => { /* Non-fatal — voucher is still shown */ })
  }, [voucher, email, emailSent])

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
  // Errors are only surfaced after several consecutive polls with no voucher,
  // to avoid killing the polling loop during a backend race condition.
  const bgErrorCount = React.useRef(0)
  useEffect(() => {
    if (!isOpen || voucher || error) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/tickets/self-voucher?userId=${encodeURIComponent(userId)}`)
        const data = await res.json()
        if (res.ok && data.voucherCode) {
          bgErrorCount.current = 0
          setVoucher(data.voucherCode)
        } else if (res.ok && data.error && data.reason) {
          bgErrorCount.current++
          // Only surface the error after 3 consecutive error polls (~9s)
          // to give a parallel backend request time to store the voucher
          if (bgErrorCount.current >= 3) {
            setErrorFromReason(data.reason)
          }
        }
      } catch {
        // ignore
      }
    }

    const id = setInterval(poll, 3000)
    return () => clearInterval(id)
  }, [isOpen, userId, voucher, error])

  const handleReset = () => {
    setVoucher(null)
    setEmailSent(false)
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
              {TICKETING.isShopOpen ? 'Proof successfully submitted!' : 'Early Access voucher reserved!'}
            </h2>
            <div className={css['success-text-block']}>
              <p className={css['success-intro']}>
                Your Self proof was successfully generated and submitted. Your{' '}
                {TICKETING.isShopOpen ? 'discount' : 'early access'} code is unique to your identity and can be found
                below.
              </p>
              {emailSent && email && (
                <p className={css['success-intro']}>
                  We&apos;ve sent an email containing your code to: <strong>{email}</strong>
                </p>
              )}
              {TICKETING.isShopOpen ? (
                <p className={css['success-note']}>
                  <strong>Note:</strong> This code must be entered at checkout to purchase your discounted Devcon
                  ticket.
                </p>
              ) : (
                <p className={css['success-note']}>
                  <strong>We&apos;ll notify you before tickets go live</strong>, so you&apos;re ready to secure yours
                  early.
                </p>
              )}
            </div>
            <hr className={css['self-divider']} aria-hidden="true" />
            <div className={css['voucher-card']}>
              <div className={css['voucher-card-inner']}>
                <p className={css['voucher-card-label']}>YOUR VOUCHER CODE</p>
                <div className={css['voucher-code-row']}>
                  <span className={css['voucher-code']}>{voucher}</span>
                  <button
                    type="button"
                    className={css['voucher-copy']}
                    onClick={handleCopyCode}
                    aria-label={copied ? 'Copied' : 'Copy code'}
                    title={copied ? 'Copied' : 'Copy to clipboard'}
                  >
                    {copied ? <span className={css['voucher-copy-text']}>Copied</span> : <Copy size={20} aria-hidden />}
                  </button>
                </div>
              </div>
            </div>
            {!TICKETING.isShopOpen && (
              <p className={css['success-note']}>
                When tickets go live, <strong>please have your code ready</strong> to use at checkout. This is how
                you&apos;ll access the exclusive discounted price.
              </p>
            )}
            {TICKETING.isShopOpen && (
              <a
                href={
                  TICKETING.checkout.pretixRedirectUrl
                    ? `${TICKETING.checkout.pretixRedirectUrl}redeem?voucher=${voucher}`
                    : `/en/tickets/store/redeem?voucher=${voucher}`
                }
                className={css['voucher-cta']}
              >
                Go to Ticket Store
                <ArrowRight size={20} aria-hidden />
              </a>
            )}
            <p className={css['privacy']}>No personal data is shared!</p>
          </div>
        ) : (
          <div className={css['self-content']}>
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
                    href="https://apps.apple.com/in/app/self-zk-proofs/id6478563710"
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
                <li>
                  Download the mAadhaar app on{' '}
                  <a
                    href="https://apps.apple.com/in/app/maadhaar/id1435469474"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    iOS
                  </a>{' '}
                  or{' '}
                  <a
                    href="https://play.google.com/store/apps/details?id=in.gov.uidai.mAadhaarPlus"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Android
                  </a>{' '}
                  and generate a QR code
                </li>
                <li>In the Self app, add a new Indian ID of type &apos;Aadhaar&apos;</li>
                <li>Follow the instructions to complete registration</li>
                {isMobile ? (
                  <li>Tap the button below to open the Self app and share your proof</li>
                ) : (
                  <li>
                    <strong>Scan the QR code below</strong> with the Self app to share your proof
                  </li>
                )}
              </ol>
              <a
                href="https://ef-events.notion.site/Self-Aadhaar-Setup-Guide-31e638cdc415809f9d54c0042a8f6292"
                target="_blank"
                rel="noopener noreferrer"
                className={css['self-guide-link']}
              >
                Video setup guide and resources
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </a>
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
            {errorCode === 'NO_VOUCHERS' && (
              <div className={css['self-aadhaar-notice']}>
                <p>
                  <strong className={css['error-title']}>Sorry, all voucher codes have now been reserved</strong>
                </p>
                <p>
                  Your Self proof was successfully submitted however, the last Early Access codes have now been
                  reserved.
                </p>
                <p>
                  More local tickets will go on sale in May. <strong>Follow us on socials for updates</strong> so
                  you&apos;re ready to secure yours early.
                </p>
                <p>We apologize for any inconvenience.</p>
                <div className={css['social-links']}>
                  <a href="https://x.com/efdevcon" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                  <a
                    href="https://instagram.com/efdevcon"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                    </svg>
                  </a>
                  <a
                    href="https://farcaster.xyz/devcon"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Farcaster"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M4.775 2h14.19v20.177h-2.083v-9.242h-.02a5.012 5.012 0 0 0-9.984 0h-.02v9.242H4.775V2Z"
                        fill="currentColor"
                      />
                      <path
                        d="m1 4.864.846 2.864h.716v11.586a.65.65 0 0 0-.65.65v.782h-.13a.65.65 0 0 0-.652.65v.781h7.29v-.78a.65.65 0 0 0-.65-.651h-.13v-.781a.65.65 0 0 0-.652-.651h-.78V4.864H1ZM17.012 19.314a.65.65 0 0 0-.651.65v.782h-.13a.65.65 0 0 0-.651.65v.781h7.29v-.78a.65.65 0 0 0-.651-.651h-.13v-.781a.65.65 0 0 0-.651-.651V7.728h.716L23 4.864h-5.207v14.45h-.781Z"
                        fill="currentColor"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            )}
            {(error || errorCode) && errorCode !== 'NO_VOUCHERS' && (
              <button type="button" className={css['reset-btn']} onClick={handleReset}>
                Try again
              </button>
            )}

            {!error &&
              !errorCode &&
              (isMobile ? (
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
              ))}

            <p className={css['self-privacy']}>No personal data is shared!</p>
          </div>
        )}
      </div>
    </div>
  )
}
