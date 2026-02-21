import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { SelfAppBuilder, getUniversalLink } from '@selfxyz/qrcode'
import type { SelfApp } from '@selfxyz/qrcode'
import css from './VerificationModal.module.scss'

const SelfQRcodeWrapper = dynamic(() => import('@selfxyz/qrcode').then((mod) => mod.SelfQRcodeWrapper), {
  ssr: false,
})

const SELF_ENDPOINT = process.env.NEXT_PUBLIC_SELF_ENDPOINT || '/api/tickets/redeem-self'
const SELF_SCOPE = process.env.NEXT_PUBLIC_SELF_SCOPE || 'devcon-india-local-discount'

type SelfVerificationModalProps = {
  isOpen: boolean
  onClose: () => void
  useStaging: boolean
  setUseStaging: (value: boolean) => void
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
  }, [])

  return isMobile
}

export function SelfVerificationModal({ isOpen, onClose, useStaging, setUseStaging }: SelfVerificationModalProps) {
  const [userId, setUserId] = useState(() => crypto.randomUUID())
  const [voucher, setVoucher] = useState<string | null>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('selfVoucher')
    }
    return null
  })
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [selfApp, setSelfApp] = useState<SelfApp | null>(null)
  const [universalLink, setUniversalLink] = useState('')
  const [pollingForVoucher, setPollingForVoucher] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!isOpen) return

    try {
      const app = new SelfAppBuilder({
        appName: 'Devcon India Tickets',
        scope: SELF_SCOPE,
        endpoint: SELF_ENDPOINT,
        endpointType: useStaging ? 'staging_https' : 'https',
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
  }, [isOpen, userId, useStaging])

  const handleSuccess = async () => {
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
      } catch {
        // ignore and retry
      }
      await new Promise(r => setTimeout(r, delayMs))
    }
    setError('Verification timed out. Please try again.')
  }

  const handleReset = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('selfVoucher')
    }
    setVoucher(null)
    setError(null)
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
    <div className={css['overlay']} role="dialog" aria-modal="true" aria-labelledby="self-verification-title">
      <div className={css['backdrop']} onClick={onClose} aria-hidden="true" />
      <div className={css['modal']}>
        <button type="button" className={css['close']} onClick={onClose} aria-label="Close">
          &times;
        </button>

        {voucher ? (
          <>
            <h2 id="self-verification-title" className={css['success-title']}>
              Proof successfully submitted!
            </h2>
            <p className={css['success-intro']}>
              Your identity was successfully verified via Self. Your discount code is unique to your identity and can be
              found below.
            </p>
            <p className={css['success-note']}>
              <strong>Note:</strong> This code must be entered at checkout to purchase your discount Devcon ticket.
            </p>
            <div className={css['voucher-card']}>
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
                    <svg
                      className={css['voucher-copy-icon']}
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
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
                <svg
                  className={css['voucher-cta-icon']}
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>
            <button type="button" className={css['reset-btn']} onClick={handleReset}>
              Test another QR code
            </button>
            <p className={css['privacy']}>No personal data is shared — only a zero-knowledge proof!</p>
          </>
        ) : (
          <>
            <h2 id="self-verification-title" className={css['title']}>
              Verification via Self
            </h2>

            <p className={css['intro']}>
              Self allows you to prove your identity using your Aadhaar card without revealing personal data. The
              verification uses zero-knowledge proofs — your information never leaves your device.
            </p>

            <h3 className={css['heading']}>How it works</h3>
            <ol className={css['steps']}>
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
              <li>Scan your Aadhaar card&apos;s NFC chip using the Self app</li>
              {isMobile ? (
                <li>Tap the button below to open the Self app and share your proof</li>
              ) : (
                <li>Scan the QR code below with the Self app to share your proof</li>
              )}
            </ol>

            <div className={`${css['test-mode']} ${useStaging ? css['test-mode--test'] : css['test-mode--real']}`}>
              <div className={css['test-mode-inner']}>
                <span className={css['test-mode-label']}>Self mode</span>
                <span className={css['test-mode-badge']} aria-live="polite">
                  {useStaging ? 'Test' : 'Production'}
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
                Switch to {useStaging ? 'production' : 'test'}
              </button>
            </div>

            {error && <p className={css['error']}>{error}</p>}

            {isMobile ? (
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
                    // Start polling after a short delay to give Self app time to process
                    setPollingForVoucher(true)
                    setError(null)
                    setTimeout(() => {
                      handleSuccess().finally(() => setPollingForVoucher(false))
                    }, 3000)
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
                      setError(null)
                      handleSuccess().finally(() => setPollingForVoucher(false))
                    }}
                  >
                    I&apos;ve verified — check status
                  </button>
                )}
              </div>
            ) : (
              <>
                <h3 className={css['heading']}>Scan QR code with Self app</h3>
                <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
                  {selfApp ? (
                    <SelfQRcodeWrapper selfApp={selfApp} onSuccess={handleSuccess} onError={(data) => setError(data.reason || 'Verification failed')} darkMode={false} />
                  ) : (
                    <div
                      style={{
                        width: 256,
                        height: 256,
                        background: '#f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 8,
                      }}
                    >
                      <p style={{ color: '#666', fontSize: '0.875rem' }}>Loading QR Code...</p>
                    </div>
                  )}
                </div>
              </>
            )}

            <p className={css['privacy']}>No personal data is shared — only a zero-knowledge proof!</p>
          </>
        )}
      </div>
    </div>
  )
}
