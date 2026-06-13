import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, BadgeCheck, CircleX, Eye, Github, Loader2 } from 'lucide-react'
import { useAccount, useChainId, useDisconnect, useSignMessage } from 'wagmi'
import { getSession, signIn, signOut } from 'next-auth/react'
import { SiweMessage, generateNonce } from 'siwe'
import { appKit } from 'context/appkit-config'
import { pretixEventUrl, discountSoldOut } from 'config/ticketing'
import css from './VerifyDiscountModal.module.scss'

type VerifyDiscountModalProps = {
  isOpen: boolean
  onClose: () => void
}

// The community discounts surfaced in this modal. `type` matches the allowlist
// keys returned by /api/discounts/validate. `methods` is which identity can
// satisfy the discount (drives claim routing). Order follows the backend
// priority (core-devs > pg > past) so the GitHub "highest value wins" lock is
// deterministic and matches what /api/discounts/claim issues. (OSS Contributors
// moved to the Builder application form, so it's intentionally not listed here.)
type DiscountType = 'core-devs' | 'pg-projects' | 'past-attendees'
type Method = 'wallet' | 'github'

const DISCOUNTS: {
  type: DiscountType
  label: string
  discount: string
  methods: Method[]
  validMsg: string
  invalidMsg: string
}[] = [
  {
    type: 'core-devs',
    label: 'Core Devs / Protocol Guild',
    discount: 'FREE',
    methods: ['wallet', 'github'],
    validMsg: 'Core contributor verified!',
    invalidMsg: 'No Merge Pass, Protocol Guild, or core-dev match found.',
  },
  {
    type: 'pg-projects',
    label: 'Public Good Projects',
    discount: '50% off',
    methods: ['wallet'],
    validMsg: 'Valid contribution verified!',
    invalidMsg: 'No valid Public Goods contributions found.',
  },
  {
    type: 'past-attendees',
    label: 'Past POAP Holders',
    discount: '10% off',
    methods: ['wallet'],
    validMsg: 'Valid POAP found!',
    invalidMsg: 'No valid Devcon/nect POAPs found.',
  },
]

type Step = 'prompt' | 'checking' | 'results' | 'error'

// Deterministic gradient avatar standing in for the wallet's network image.
function avatarGradient(address: string): string {
  const a = address.toLowerCase()
  const h1 = parseInt(a.slice(2, 8) || '0', 16) % 360
  const h2 = parseInt(a.slice(8, 14) || '0', 16) % 360
  return `linear-gradient(135deg, hsl(${h1} 80% 60%), hsl(${h2} 75% 52%))`
}

export function VerifyDiscountModal({ isOpen, onClose }: VerifyDiscountModalProps) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { signMessageAsync } = useSignMessage()
  const chainId = useChainId()

  const [step, setStep] = useState<Step>('prompt')
  // Eligible discount types per verified identity. null = that identity hasn't
  // been checked yet.
  const [walletElig, setWalletElig] = useState<Set<DiscountType> | null>(null)
  const [githubElig, setGithubElig] = useState<Set<DiscountType> | null>(null)
  const [githubId, setGithubId] = useState<string | null>(null)
  const [selected, setSelected] = useState<DiscountType | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingMethod, setCheckingMethod] = useState<Method | null>(null)
  // Set when the user clicks "Connect wallet" and we open AppKit. Once the
  // wallet connects we auto-advance to the eligibility check.
  const [awaitingConnect, setAwaitingConnect] = useState(false)
  const [githubAuthing, setGithubAuthing] = useState(false)
  const githubPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Map a validate response to the subset of types we surface as discounts.
  const validate = useCallback(async (id: string): Promise<Set<DiscountType>> => {
    const res = await fetch(`/api/discounts/validate/${encodeURIComponent(id)}/`)
    const body = await res.json()
    const types: string[] = (body?.data?.discounts || []).map((d: { type: string }) => d.type)
    return new Set(DISCOUNTS.filter(d => types.includes(d.type)).map(d => d.type))
  }, [])

  const runWalletCheck = useCallback(
    async (addr: string) => {
      setCheckingMethod('wallet')
      setStep('checking')
      setError(null)
      try {
        setWalletElig(await validate(addr))
        setStep('results')
      } catch {
        setStep('error')
      }
    },
    [validate]
  )

  const runGithubCheck = useCallback(
    async (login: string) => {
      setCheckingMethod('github')
      setStep('checking')
      setError(null)
      try {
        setGithubId(login)
        setGithubElig(await validate(login))
        setStep('results')
      } catch {
        setStep('error')
      }
    },
    [validate]
  )

  // On open: reset transient UI state, then re-hydrate from any identity the
  // user already connected in a previous open (wallet lives in wagmi, the
  // GitHub identity in the NextAuth session) so we don't make them reconnect.
  useEffect(() => {
    if (!isOpen) return
    setSelected(null)
    setClaiming(false)
    setError(null)
    setAwaitingConnect(false)
    setGithubAuthing(false)

    const hasWallet = isConnected && !!address
    // Optimistic baseline so we never flash the previous open's results.
    setStep(hasWallet ? 'checking' : 'prompt')
    setCheckingMethod(hasWallet ? 'wallet' : null)
    if (!hasWallet) setWalletElig(null)

    let cancelled = false
    ;(async () => {
      let ghId: string | null = null
      try {
        const session = (await getSession()) as { id?: string; type?: string } | null
        if (session?.type === 'github' && session.id) ghId = session.id
      } catch {
        ghId = null
      }
      if (cancelled) return

      // Nothing connected → stay on the prompt.
      if (!hasWallet && !ghId) {
        setWalletElig(null)
        setGithubElig(null)
        setGithubId(null)
        setStep('prompt')
        return
      }

      setStep('checking')
      if (hasWallet && address) {
        try {
          const elig = await validate(address)
          if (!cancelled) setWalletElig(elig)
        } catch {
          if (!cancelled) setWalletElig(new Set<DiscountType>())
        }
      }
      if (ghId) {
        setGithubId(ghId)
        try {
          const elig = await validate(ghId)
          if (!cancelled) setGithubElig(elig)
        } catch {
          if (!cancelled) setGithubElig(new Set<DiscountType>())
        }
      } else {
        setGithubElig(null)
        setGithubId(null)
      }
      if (!cancelled) setStep('results')
    })()

    return () => {
      cancelled = true
    }
    // Intentionally only re-runs on open; reads the current wallet/session then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Wallet connected after the user asked to connect → run the check.
  useEffect(() => {
    if (isOpen && awaitingConnect && isConnected && address) {
      setAwaitingConnect(false)
      runWalletCheck(address)
    }
  }, [isOpen, awaitingConnect, isConnected, address, runWalletCheck])

  // Stop polling for the GitHub session if the modal closes mid-auth.
  useEffect(() => {
    if (isOpen) return
    if (githubPollRef.current) {
      clearInterval(githubPollRef.current)
      githubPollRef.current = null
    }
  }, [isOpen])

  // ── Combined eligibility helpers ──
  // Which identity should claim a given discount. Prefer wallet: its claim
  // endpoint (claim-wallet) honours the specific pick, whereas the GitHub
  // session endpoint always issues the highest-priority match.
  const viaFor = useCallback(
    (type: DiscountType): Method | null => {
      if (walletElig?.has(type)) return 'wallet'
      if (githubElig?.has(type)) return 'github'
      return null
    },
    [walletElig, githubElig]
  )

  // The single GitHub-claimable discount we offer. /api/discounts/claim issues
  // discounts[0] (first match in backend priority order) for the GitHub id, so
  // we only let the user select that one: the first GitHub-via discount in
  // list order. Any lower GitHub-only match is shown as "included".
  const githubLockType = DISCOUNTS.find(d => viaFor(d.type) === 'github' && !discountSoldOut(d.type))?.type ?? null

  const isSelectable = useCallback(
    (type: DiscountType): boolean => {
      if (discountSoldOut(type)) return false
      const via = viaFor(type)
      if (via === 'wallet') return true
      if (via === 'github') return type === githubLockType
      return false
    },
    [viaFor, githubLockType]
  )

  // Keep a sensible default selection: first selectable discount in priority
  // order. Re-runs as the user adds a second identity.
  useEffect(() => {
    if (step !== 'results') return
    if (selected && isSelectable(selected)) return
    const first = DISCOUNTS.find(d => isSelectable(d.type))?.type ?? null
    setSelected(first)
  }, [step, selected, isSelectable])

  if (!isOpen) return null

  const handleConnect = () => {
    if (isConnected && address) {
      runWalletCheck(address)
      return
    }
    setAwaitingConnect(true)
    appKit.open()
  }

  // Open GitHub OAuth in a centered popup and poll for the resulting session.
  // We use getSession()/signIn() (standalone, no SessionProvider needed) since
  // the app's NextAuth SessionProvider is not mounted.
  const handleGithubSignIn = () => {
    if (githubAuthing) return
    setGithubAuthing(true)
    setError(null)
    const w = 500
    const h = 650
    const left = Math.max(0, (window.screen.width - w) / 2)
    const top = Math.max(0, (window.screen.height - h) / 2)
    const popup = window.open('/signin', 'github-signin', `width=${w},height=${h},left=${left},top=${top}`)
    popup?.focus()

    const start = Date.now()
    if (githubPollRef.current) clearInterval(githubPollRef.current)
    githubPollRef.current = setInterval(async () => {
      let session: { id?: string; type?: string } | null = null
      try {
        session = await getSession()
      } catch {
        session = null
      }
      const closed = !popup || popup.closed
      if (session?.type === 'github' && session.id) {
        if (githubPollRef.current) clearInterval(githubPollRef.current)
        githubPollRef.current = null
        setGithubAuthing(false)
        popup?.close()
        runGithubCheck(session.id)
      } else if (closed || Date.now() - start > 120_000) {
        if (githubPollRef.current) clearInterval(githubPollRef.current)
        githubPollRef.current = null
        setGithubAuthing(false)
      }
    }, 1000)
  }

  const handleDisconnectWallet = () => {
    disconnect()
    setWalletElig(null)
    // Drop back to prompt if nothing else is verified.
    if (!githubElig) {
      setStep('prompt')
      setSelected(null)
    }
  }

  const handleGithubSignOut = async () => {
    try {
      await signOut({ redirect: false })
    } catch {
      // ignore: clearing local state below is what matters for the UI
    }
    setGithubElig(null)
    setGithubId(null)
    if (!walletElig) {
      setStep('prompt')
      setSelected(null)
    }
  }

  const handleClaim = async () => {
    if (!selected || claiming) return
    const via = viaFor(selected)
    setClaiming(true)
    setError(null)
    try {
      let voucher: string | undefined

      if (via === 'wallet') {
        if (!address) throw new Error('Wallet not connected')
        const message = new SiweMessage({
          domain: window.location.host,
          address,
          statement: 'Verify wallet ownership to claim your Devcon ticket discount.',
          uri: window.location.origin,
          version: '1',
          chainId: chainId || 1,
          nonce: generateNonce(),
        }).prepareMessage()
        const signature = await signMessageAsync({ message })
        const res = await fetch('/api/discounts/claim-wallet/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, signature, discountType: selected }),
        })
        const body = await res.json()
        if (!res.ok || !body?.success || !body?.data?.voucher) {
          // Surface the backend reason (e.g. "This discount is currently sold out.")
          setError(body?.error || 'We couldn’t claim your discount. Please try again.')
          setClaiming(false)
          return
        }
        voucher = body.data.voucher
      } else if (via === 'github') {
        if (!githubId) throw new Error('Not signed in to GitHub')
        const res = await fetch(`/api/discounts/claim/${encodeURIComponent(githubId)}/`)
        const body = await res.json()
        if (!res.ok || !body?.data?.voucher) {
          setError(body?.error || 'We couldn’t claim your discount. Please try again.')
          setClaiming(false)
          return
        }
        voucher = body.data.voucher
      } else {
        throw new Error('No verification for this discount')
      }

      // Hand off to the Pretix redeem flow, which applies the voucher discount.
      window.location.href = pretixEventUrl(`/redeem?voucher=${encodeURIComponent(voucher as string)}`)
    } catch {
      // Wallet signing rejected, network error, etc.
      setError('We couldn’t claim your discount. Please try again.')
      setClaiming(false)
    }
  }

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''
  const hasAnyValid = DISCOUNTS.some(d => viaFor(d.type) !== null)

  const footer =
    step !== 'prompt' && (address || githubId) ? (
      <div className={css['identityFooter']}>
        {address && (
          <div className={css['identityRow']}>
            <div className={css['identityInfo']}>
              <span className={css['identityLabel']}>Connected:</span>
              <span className={css['identityValueWrap']}>
                <span
                  className={css['walletAvatar']}
                  style={{ backgroundImage: avatarGradient(address) }}
                  aria-hidden="true"
                />
                <span className={css['identityValue']}>{shortAddress}</span>
              </span>
            </div>
            <button type="button" className={css['identityLink']} onClick={handleDisconnectWallet}>
              Disconnect
            </button>
          </div>
        )}
        {githubId && (
          <div className={css['identityRow']}>
            <div className={css['identityInfo']}>
              <span className={css['identityLabel']}>Signed in:</span>
              <span className={css['identityValueWrap']}>
                <Github className={css['githubMark']} size={18} aria-hidden="true" />
                <span className={css['identityValue']}>{githubId}</span>
              </span>
            </div>
            <button type="button" className={css['identityLink']} onClick={handleGithubSignOut}>
              Sign out
            </button>
          </div>
        )}
      </div>
    ) : null

  // Secondary "also verify" affordances on the results screen for the method
  // the user hasn't used yet.
  const alsoVerify =
    step === 'results' ? (
      <div className={css['alsoVerify']}>
        {walletElig === null && (
          <button type="button" className={css['primaryBtn']} onClick={handleConnect}>
            Also check with your wallet
          </button>
        )}
        {githubElig === null && (
          <button type="button" className={css['githubBtn']} onClick={handleGithubSignIn} disabled={githubAuthing}>
            <Github size={18} aria-hidden="true" />
            {githubAuthing ? 'Opening GitHub…' : 'Also check with GitHub'}
          </button>
        )}
      </div>
    ) : null

  return (
    <div className={css['overlay']} role="dialog" aria-modal="true" aria-label="Check for discounts">
      <div className={css['backdrop']} onClick={onClose} aria-hidden="true" />
      <div className={css['modal']}>
        <button type="button" className={css['close']} onClick={onClose} aria-label="Close">
          ×
        </button>

        {step === 'prompt' && (
          <div className={css['stackLg']}>
            <div className={css['stackMd']}>
              <h2 className={css['title']}>Check for discounts</h2>
              <p className={css['intro']}>
                Verify with your wallet or GitHub and we&apos;ll check whether you&apos;re eligible for:
              </p>
              <div className={css['checks']}>
                {[...DISCOUNTS]
                  // Available discounts first, sold-out ones sink to the bottom.
                  .sort((a, b) => Number(discountSoldOut(a.type)) - Number(discountSoldOut(b.type)))
                  .map(d => {
                    const soldOut = discountSoldOut(d.type)
                    return (
                      <div key={d.type} className={css['checkRow']}>
                        {soldOut ? (
                          <CircleX className={css['checkIconSoldOut']} size={24} strokeWidth={2} aria-hidden="true" />
                        ) : (
                          <BadgeCheck className={css['checkIcon']} size={24} strokeWidth={2} aria-hidden="true" />
                        )}
                        {soldOut ? (
                          <p className={css['checkText']}>
                            {d.label} <span className={css['soldOutTag']}>(Sold out)</span>
                          </p>
                        ) : (
                          <p className={css['checkText']}>
                            {d.label} - <strong>{d.discount}</strong>
                          </p>
                        )}
                      </div>
                    )
                  })}
              </div>
              <div className={css['divider']} />
              <div className={css['disclaimer']}>
                <Eye className={css['disclaimerIcon']} size={24} strokeWidth={2} aria-hidden="true" />
                <p className={css['disclaimerText']}>We only read your public data</p>
              </div>
            </div>
            <div className={css['stackSm']}>
              <button type="button" className={css['primaryBtn']} onClick={handleConnect}>
                Connect wallet
              </button>
              <button type="button" className={css['githubBtn']} onClick={handleGithubSignIn} disabled={githubAuthing}>
                <Github size={18} aria-hidden="true" />
                {githubAuthing ? 'Opening GitHub…' : 'Sign in with GitHub'}
              </button>
              <p className={css['footnote']}>Only one discount can be applied</p>
            </div>
          </div>
        )}

        {step === 'checking' && (
          <div className={css['stackMd']}>
            <h2 className={`${css['title']} ${css['titleCenter']}`}>
              {checkingMethod === 'github' ? 'Checking your GitHub account' : 'Checking on-chain history'}
            </h2>
            <div className={css['checkingSpinnerWrap']}>
              <Loader2 className={css['spinnerLg']} size={40} aria-hidden="true" />
            </div>
            {footer}
          </div>
        )}

        {step === 'results' && (
          <div className={css['stackMd']}>
            <div className={css['stackMd']}>
              <h2 className={`${css['title']} ${css['titleCenter']}`}>Here&apos;s what we found</h2>
              {hasAnyValid ? (
                <>
                  <div className={css['stackMd']}>
                    <p className={css['subtitle']}>Choose a discount to add to your cart:</p>
                    <div className={css['options']}>
                      {DISCOUNTS.map(opt => {
                        // Sold out wins over eligibility: never selectable.
                        if (discountSoldOut(opt.type)) {
                          return (
                            <div key={opt.type} className={`${css['option']} ${css['optionInvalid']}`}>
                              <div className={css['optionLabelWrap']}>
                                <p className={css['optionTitle']}>
                                  {opt.label} - <strong>{opt.discount}</strong>
                                </p>
                                <p className={`${css['optionStatus']} ${css['optionStatusInvalid']}`}>Sold out</p>
                              </div>
                            </div>
                          )
                        }
                        const via = viaFor(opt.type)
                        const valid = via !== null
                        if (!valid) {
                          return (
                            <div key={opt.type} className={`${css['option']} ${css['optionInvalid']}`}>
                              <div className={css['optionLabelWrap']}>
                                <p className={css['optionTitle']}>
                                  {opt.label} - <strong>{opt.discount}</strong>
                                </p>
                                <p className={`${css['optionStatus']} ${css['optionStatusInvalid']}`}>
                                  {opt.invalidMsg}
                                </p>
                              </div>
                            </div>
                          )
                        }
                        // Valid but not selectable = a lower GitHub-only match
                        // superseded by a higher one. Show as "included".
                        if (!isSelectable(opt.type)) {
                          return (
                            <div key={opt.type} className={`${css['option']} ${css['optionIncluded']}`}>
                              <div className={css['optionLabelWrap']}>
                                <p className={css['optionTitle']}>
                                  {opt.label} - <strong>{opt.discount}</strong>
                                </p>
                                <p className={`${css['optionStatus']} ${css['optionStatusValid']}`}>
                                  Eligible (a higher discount applies)
                                </p>
                              </div>
                            </div>
                          )
                        }
                        const sel = selected === opt.type
                        const faded = !!selected && !sel
                        return (
                          <button
                            key={opt.type}
                            type="button"
                            className={`${css['option']} ${sel ? css['optionSelected'] : ''} ${
                              faded ? css['optionFaded'] : ''
                            }`}
                            onClick={() => setSelected(opt.type)}
                            aria-pressed={sel}
                          >
                            <span className={`${css['radio']} ${sel ? css['radioChecked'] : ''}`}>
                              {sel && <span className={css['radioDot']} />}
                            </span>
                            <span className={css['optionLabelWrap']}>
                              <span className={css['optionTitle']}>
                                {opt.label} - <strong>{opt.discount}</strong>
                              </span>
                              <span className={`${css['optionStatus']} ${css['optionStatusValid']}`}>
                                {opt.validMsg}
                              </span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  {alsoVerify}
                  {error && (
                    <div className={css['errorBanner']}>
                      <CircleX className={css['errorBannerIcon']} size={20} strokeWidth={2} aria-hidden="true" />
                      <span>{error}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    className={css['primaryBtn']}
                    disabled={!selected || claiming}
                    onClick={handleClaim}
                  >
                    {claiming ? (
                      <>
                        <Loader2 className={css['spinner']} size={16} aria-hidden="true" />
                        {viaFor(selected as DiscountType) === 'github' ? 'Issuing voucher…' : 'Confirm in wallet…'}
                      </>
                    ) : (
                      <>
                        Add to cart &amp; checkout
                        <ArrowUpRight size={16} strokeWidth={2.5} aria-hidden="true" />
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className={css['stackMd']}>
                    <div className={css['options']}>
                      {DISCOUNTS.map(opt => (
                        <div key={opt.type} className={`${css['option']} ${css['optionInvalid']}`}>
                          <div className={css['optionLabelWrap']}>
                            <p className={css['optionTitle']}>
                              {opt.label} - <strong>{opt.discount}</strong>
                            </p>
                            <p className={`${css['optionStatus']} ${css['optionStatusInvalid']}`}>{opt.invalidMsg}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className={css['emptyText']}>
                      You may be eligible for other discounted tickets for Devcon 8 India. Check the Ticket Store for
                      more information.
                    </p>
                  </div>
                  {alsoVerify}
                </>
              )}
            </div>
            {footer}
          </div>
        )}

        {step === 'error' && (
          <div className={css['stackMd']}>
            <h2 className={`${css['title']} ${css['titleCenter']}`}>Something went wrong</h2>
            <p className={css['subtitle']}>We couldn&apos;t complete the check. Please try again.</p>
            <button
              type="button"
              className={css['primaryBtn']}
              onClick={() => {
                if (checkingMethod === 'github' && githubId) runGithubCheck(githubId)
                else if (address) runWalletCheck(address)
                else setStep('prompt')
              }}
            >
              Try again
            </button>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
