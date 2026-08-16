import React, { useState } from 'react'
import { ArrowRight, RotateCw } from 'lucide-react'
import { useDigiGoVerify, type DigiGoCredential } from '@digigo/verify/react'
import css from './VerificationModal.module.scss'
import { pretixEventUrl } from 'config/ticketing'

// Our own route, on our own origin — the one place the DigiGo API key is used.
const SESSION_ENDPOINT = '/api/tickets/digigo-session/'

type ErrorCode = 'NOT_INDIAN' | 'UNDER_18' | 'NO_VOUCHERS' | 'VERIFICATION_FAILED' | null

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

const STEPS = [
  {
    title: 'Get the new Aadhaar app',
    body: (
      <>
        Install UIDAI&apos;s <strong>new Aadhaar app</strong> on{' '}
        <a href="https://apps.apple.com/in/app/aadhaar/id6744029871" target="_blank" rel="noopener noreferrer">
          iOS
        </a>{' '}
        or{' '}
        <a
          href="https://play.google.com/store/apps/details?id=in.gov.uidai.pehchaan"
          target="_blank"
          rel="noopener noreferrer"
        >
          Android
        </a>
        . On first launch it sets up your profile with a quick face scan.
      </>
    ),
  },
  {
    title: 'Scan the QR',
    body: (
      <>
        Open the app, tap <strong>Scan</strong>, and point it at the code. It expires after a few minutes — regenerate
        it if it does.
      </>
    ),
  },
  {
    title: 'Approve the share',
    body: (
      <>
        Review the details being requested and confirm with <strong>Face Authentication</strong>. Your Aadhaar number is
        never shown or shared.
      </>
    ),
  },
  {
    title: "You're verified",
    body: <>DigiGo issues a signed credential that says only that you&apos;re Indian — nothing about who you are.</>,
  },
]

type DigiGoFlowProps = {
  onVoucher: (code: string) => void
}

/**
 * The QR flow itself. Split out so it mounts exactly when the modal opens: the
 * hook opens a DigiGo session on mount, and sessions are metered — a component
 * that renders `null` while closed would still have opened one for every
 * visitor to the store page.
 */
function DigiGoFlow({ onVoucher }: DigiGoFlowProps) {
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<ErrorCode>(null)
  const [redeeming, setRedeeming] = useState(false)

  const clearError = () => {
    setError(null)
    setErrorCode(null)
  }

  // The credential the browser receives is unverified — the proof goes to our
  // backend, which verifies it against DigiGo's public JWKS before issuing.
  const handleResult = async (credential: DigiGoCredential) => {
    setRedeeming(true)
    clearError()
    try {
      const res = await fetch('/api/tickets/redeem-digigo/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ proof: credential.proof }),
      })
      const data = await res.json()
      if (data.success && data.voucherCode) {
        onVoucher(data.voucherCode)
      } else {
        setError(data.reason || 'Verification failed. Please try again.')
        setErrorCode((data.error as ErrorCode) ?? 'VERIFICATION_FAILED')
      }
    } catch {
      setError('Could not reach the verification service. Please try again.')
      setErrorCode('VERIFICATION_FAILED')
    } finally {
      setRedeeming(false)
    }
  }

  const { status, qrDataUrl, timeLeft, regenerate } = useDigiGoVerify({
    sessionEndpoint: SESSION_ENDPOINT,
    onResult: handleResult,
  })

  const handleRetry = () => {
    clearError()
    regenerate()
  }

  return (
    <>
      <div className={css['digigo-layout']}>
        <div className={css['digigo-steps-col']}>
          <p className={css['digigo-kicker']}>How to verify</p>
          {STEPS.map((step, i) => (
            <div key={step.title} className={css['digigo-step']} data-n={i + 1}>
              <h3 className={css['digigo-step-title']}>{step.title}</h3>
              <p className={css['digigo-step-body']}>{step.body}</p>
            </div>
          ))}
        </div>

        <aside className={css['digigo-qr-col']}>
          <p className={css['digigo-kicker']}>Scan this</p>
          <div className={css['digigo-card']}>
            <div className={css['digigo-card-brand']}>DigiGo Verification</div>

            <div className={css['digigo-qr-box']}>
              {status === 'verified' ? (
                <span className={css['digigo-qr-ok']} aria-label="Verified">
                  ✓
                </span>
              ) : status === 'waiting' && qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="Aadhaar verification QR code" className={css['digigo-qr-img']} />
              ) : status === 'loading' ? (
                <div className={css['digigo-qr-shimmer']} aria-label="Generating QR code" />
              ) : (
                // Only a real timeout says "expired". A session that never
                // started (missing key, closed event) is unavailability.
                <span className={css['digigo-qr-dead']}>
                  {status === 'expired' ? 'QR expired' : 'Verification unavailable'}
                </span>
              )}
            </div>

            {status === 'verified' ? (
              <p className={css['digigo-card-status--ok']}>{redeeming ? 'Issuing your voucher…' : 'Verified · Indian'}</p>
            ) : (
              <>
                <p className={css['digigo-card-scan']}>Scan with your Aadhaar app to verify</p>
                <p className={css['digigo-card-status']}>
                  {status === 'waiting' ? (
                    <span>Waiting for scan · expires in {fmt(timeLeft)}</span>
                  ) : status === 'loading' ? (
                    <span>Preparing QR…</span>
                  ) : (
                    <button type="button" className={css['digigo-regen-btn']} onClick={handleRetry}>
                      <RotateCw size={13} aria-hidden />
                      Regenerate
                    </button>
                  )}
                </p>
              </>
            )}

            <div className={css['digigo-card-footer']}>Grievances: contact@digigo.club</div>
          </div>
        </aside>
      </div>

      {error && (
        <div className={css['self-aadhaar-notice']}>
          {errorCode === 'NO_VOUCHERS' && (
            <p>
              <strong className={css['error-title']}>Sorry, the India Resident discount is currently unavailable</strong>
            </p>
          )}
          <p>{error}</p>
        </div>
      )}
      {error && errorCode !== 'NO_VOUCHERS' && (
        <button type="button" className={css['reset-btn']} onClick={handleRetry}>
          Try again
        </button>
      )}
    </>
  )
}

type DigiGoVerificationModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function DigiGoVerificationModal({ isOpen, onClose }: DigiGoVerificationModalProps) {
  const [voucher, setVoucher] = useState<string | null>(null)

  if (!isOpen) return null

  const handleClose = () => {
    setVoucher(null)
    onClose()
  }

  // Direct link into the Pretix store's voucher redeem flow, which unlocks and
  // applies the India Resident ticket.
  const claimUrl = voucher ? pretixEventUrl(`/redeem?voucher=${encodeURIComponent(voucher)}`) : ''

  return (
    <div
      className={`${css['overlay']} ${css['self-overlay']}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="digigo-verification-title"
    >
      <div className={css['backdrop']} onClick={handleClose} aria-hidden="true" />
      <div className={`${css['modal']} ${css['self-modal']} ${voucher ? '' : css['digigo-modal']}`}>
        <button
          type="button"
          className={`${css['close']} ${css['self-close']}`}
          onClick={handleClose}
          aria-label="Close"
        >
          &times;
        </button>

        {voucher ? (
          <div className={css['self-padded']}>
            <h2 id="digigo-verification-title" className={css['success-title']}>
              You&apos;re verified!
            </h2>
            <div className={css['success-text-block']}>
              <p className={css['success-intro']}>
                Your DigiGo credential was verified and you&apos;re eligible for the India Resident ticket. Continue to
                the store to claim it.
              </p>
            </div>
            <a href={claimUrl} className={css['voucher-cta']}>
              Claim your India Resident ticket
              <ArrowRight size={20} aria-hidden />
            </a>
            <p className={css['privacy']}>No personal data is shared!</p>
          </div>
        ) : (
          <div className={css['self-content']}>
            <h2 id="digigo-verification-title" className={css['self-title']}>
              Verification via DigiGo
            </h2>

            <p className={css['self-intro']}>
              DigiGo proves your Indian residency using UIDAI&apos;s new Aadhaar app. The ticket store only ever
              receives a signed result — Indian or not — never your Aadhaar number, name, or photo.
            </p>

            <hr className={css['self-divider']} aria-hidden="true" />

            <DigiGoFlow onVoucher={setVoucher} />

            <p className={css['self-privacy']}>No personal data is shared!</p>
          </div>
        )}
      </div>
    </div>
  )
}
