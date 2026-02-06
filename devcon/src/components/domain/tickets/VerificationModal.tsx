import React, { useEffect, useState } from 'react'
import { LaunchProveModal, useAnonAadhaar } from '@anon-aadhaar/react'
import { deserialize } from '@anon-aadhaar/core'
import type { AnonAadhaarCore } from '@anon-aadhaar/core'
import css from './VerificationModal.module.scss'

const NULLIFIER_SEED = Number(process.env.NEXT_PUBLIC_NULLIFIER_SEED ?? '1')

type VerificationModalProps = {
  isOpen: boolean
  onClose: () => void
  useTestAadhaar: boolean
  setUseTestAadhaar: (value: boolean) => void
  onReset?: () => void
}

export function VerificationModal({
  isOpen,
  onClose,
  useTestAadhaar,
  setUseTestAadhaar,
  onReset,
}: VerificationModalProps) {
  const [anonAadhaar] = useAnonAadhaar()
  const [voucher, setVoucher] = useState<string | null>(null)
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proofCore, setProofCore] = useState<AnonAadhaarCore | null>(null)
  const [copied, setCopied] = useState(false)

  const isLoggedIn = anonAadhaar.status === 'logged-in'

  useEffect(() => {
    if (!isLoggedIn) return
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('anonAadhaar') : null
    if (!raw) return
    try {
      const data = JSON.parse(raw)
      const proofs = data?.anonAadhaarProofs
      if (!proofs || typeof proofs !== 'object') return
      const keys = Object.keys(proofs)
      if (keys.length === 0) return
      const lastPcd = proofs[keys[keys.length - 1]]?.pcd
      if (!lastPcd) return
      deserialize(lastPcd).then((core) => setProofCore(core))
    } catch {
      // ignore
    }
  }, [isLoggedIn])

  const handleReset = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('anonAadhaar')
    }
    setVoucher(null)
    setProofCore(null)
    setError(null)
    setCopied(false)
    onReset?.()
  }

  const handleCopyCode = async () => {
    if (!voucher || typeof navigator?.clipboard?.writeText !== 'function') return
    await navigator.clipboard.writeText(voucher)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRedeem = async () => {
    if (!proofCore) return
    setIsRedeeming(true)
    setError(null)
    try {
      const res = await fetch('/api/tickets/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonAadhaarProof: proofCore }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Redeem failed')
      setVoucher(data.voucherCode)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsRedeeming(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className={css['overlay']} role="dialog" aria-modal="true" aria-labelledby="verification-title">
      <div className={css['backdrop']} onClick={onClose} aria-hidden="true" />
      <div className={css['modal']}>
        <button type="button" className={css['close']} onClick={onClose} aria-label="Close">
          ×
        </button>

        {voucher ? (
          <>
            <h2 id="verification-title" className={css['success-title']}>
              Proof successfully submitted!
            </h2>
            <p className={css['success-intro']}>
              Your AnonAadhaar proof was successfully generated and submitted. Your discount code is unique to your
              Aadhaar ID and can be found below.
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
                    <svg className={css['voucher-copy-icon']} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
              <a
                href={`https://tickets.devcon.org/redeem?voucher=${voucher}`}
                target="_blank"
                rel="noopener noreferrer"
                className={css['voucher-cta']}
              >
                Go to Ticket Store
                <svg className={css['voucher-cta-icon']} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>
            {onReset && (
              <button type="button" className={css['reset-btn']} onClick={handleReset}>
                Test another QR code
              </button>
            )}
            <p className={css['privacy']}>No Aadhaar data ever leaves your device!</p>
          </>
        ) : (
          <>
            <h2 id="verification-title" className={css['title']}>
              Verification
            </h2>

            <p className={css['intro']}>
              Anon Aadhaar allows you to create a proof of your Aadhaar ID without revealing any personal data. This
              process is local to your browser for privacy and QR images are not uploaded to any server.
            </p>
            <p className={css['note']}>Note: Internet speed may affect processing time.</p>

            <h3 className={css['heading']}>Generate a QR code</h3>
            <ol className={css['steps']}>
              <li>
                Open the mAadhaar app on{' '}
                <a href="https://apps.apple.com/in/app/maadhaar/id1435469474" target="_blank" rel="noopener noreferrer">
                  iOS
                </a>{' '}
                or{' '}
                <a
                  href="https://play.google.com/store/apps/details?id=in.gov.uidai.mAadhaarPlus"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Android
                </a>
                .
              </li>
              <li>Enter your Aadhaar number and OTP verification</li>
              <li>Save the QR as an image using &apos;Share&apos;</li>
            </ol>

            <h3 className={css['heading']}>Upload your Aadhaar QR</h3>
            <p className={css['file-hint']}>Use the Continue button below to open the upload flow.</p>

            <div className={`${css['test-mode']} ${useTestAadhaar ? css['test-mode--test'] : css['test-mode--real']}`}>
              <div className={css['test-mode-inner']}>
                <span className={css['test-mode-label']}>Aadhaar mode</span>
                <span className={css['test-mode-badge']} aria-live="polite">
                  {useTestAadhaar ? 'Test' : 'Real'}
                </span>
              </div>
              <button
                type="button"
                className={css['test-mode-btn']}
                onClick={() => setUseTestAadhaar(!useTestAadhaar)}
              >
                Switch to {useTestAadhaar ? 'real' : 'test'}
              </button>
            </div>

            {!isLoggedIn ? (
              <div className={css['continue-wrap']}>
                <LaunchProveModal
                  nullifierSeed={NULLIFIER_SEED}
                  buttonStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: 'none',
                    fontWeight: 500,
                    backgroundColor: '#333',
                    color: '#fff',
                    padding: '14px 24px',
                    fontSize: '1rem',
                    width: '100%',
                    cursor: 'pointer',
                  }}
                  buttonTitle="Continue"
                />
              </div>
            ) : (
              <div className={css['redeem-wrap']}>
                {error && <p className={css['error']}>{error}</p>}
                <button
                  type="button"
                  className={css['redeem-btn']}
                  onClick={handleRedeem}
                  disabled={!proofCore || isRedeeming}
                >
                  {isRedeeming ? 'Redeeming…' : 'Redeem voucher'}
                </button>
                {onReset && (
                  <button type="button" className={css['reset-btn']} onClick={handleReset}>
                    Test another QR code
                  </button>
                )}
              </div>
            )}

            <p className={css['privacy']}>No Aadhaar data ever leaves your device!</p>
          </>
        )}
      </div>
    </div>
  )
}
