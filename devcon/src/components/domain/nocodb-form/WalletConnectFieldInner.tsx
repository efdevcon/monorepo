import React, { useEffect, useRef, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, type Config, useAccount, useDisconnect, useSignMessage } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { SiweMessage } from 'siwe'
import { Wallet } from 'lucide-react'
// Importing appkit-config runs createAppKit() (module side-effect), registering the
// AppKit singleton that useAppKit() requires. This is only pulled in when the wallet
// field is actually rendered (the parent loads this module via next/dynamic), so
// non-builder forms never mount AppKit/wagmi.
import { wagmiAdapter } from 'context/appkit-config'
import { useBuilderConnect, checkAutoDiscount } from 'context/BuilderConnectContext'
import { rhfFieldName } from './rhf-key'

interface Props {
  columnName: string
  label: string
  required?: boolean
  description?: string
  // When true, render only the button/connected state (no label/description) —
  // used inside the combined "Connections" block, which owns the heading.
  hideHeader?: boolean
}

const queryClient = new QueryClient()

// The verified address + signed proof are kept in sessionStorage so a page
// refresh doesn't drop the connection (the proof is a 1h server-signed token).
const STORAGE_KEY = 'builder:wallet'
const STORAGE_TTL_MS = 55 * 60 * 1000 // restore only while the proof is still valid

function WalletWidget({ columnName, label, required, description, hideHeader }: Props) {
  const { setValue, watch } = useFormContext()
  const { walletProof, setWalletProof, reportDiscount } = useBuilderConnect()
  const { open } = useAppKit()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { signMessageAsync } = useSignMessage()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Set when the user clicks Connect here, so we can auto-prompt the signature
  // the instant the wallet connects (connect + verify become one flow, with no
  // missable second click). We never auto-fire for a session merely restored on
  // mount — that would pop an unexpected signature prompt on page load.
  const autoVerify = useRef(false)
  const fieldKey = rhfFieldName(columnName)
  const stored = watch(fieldKey) as string | undefined

  // Restore a previously-verified wallet after a refresh.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as { address?: string; proof?: string; ts?: number }
      if (saved.address && saved.proof && saved.ts && Date.now() - saved.ts < STORAGE_TTL_MS) {
        setValue(fieldKey, saved.address, { shouldValidate: true })
        setWalletProof(saved.proof)
        checkAutoDiscount(saved.address).then(reportDiscount)
      } else {
        sessionStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // ignore malformed/unavailable storage
    }
  }, [fieldKey, setValue, setWalletProof, reportDiscount])

  // Once a user-initiated connect lands (address available, not yet verified),
  // kick off the signature automatically so the user doesn't have to find and
  // click a second "Verify" button.
  useEffect(() => {
    if (autoVerify.current && isConnected && address && !walletProof && !busy) {
      autoVerify.current = false
      verify()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, walletProof, busy])

  function connect() {
    setError(null)
    autoVerify.current = true // auto-sign as soon as the wallet connects
    open()
  }

  function clearWallet() {
    try {
      disconnect()
    } catch {
      // ignore
    }
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    setValue(fieldKey, '', { shouldValidate: true })
    setWalletProof(null)
    setError(null)
  }

  async function verify() {
    setError(null)
    if (!isConnected || !address) {
      autoVerify.current = true
      open()
      return
    }
    setBusy(true)
    try {
      const nonceRes = await fetch('/api/builder/wallet/nonce/')
      const { nonceToken, nonce } = await nonceRes.json()
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Connect your wallet to your Devcon builder application.',
        uri: window.location.origin,
        version: '1',
        chainId: 1,
        nonce,
      }).prepareMessage()
      const signature = await signMessageAsync({ message })
      const verifyRes = await fetch('/api/builder/wallet/verify/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature, nonceToken }),
      })
      const json = await verifyRes.json()
      if (!json.success) {
        setError(json.error || 'Verification failed')
        return
      }
      setValue(fieldKey, json.address, { shouldValidate: true })
      setWalletProof(json.proof)
      checkAutoDiscount(json.address).then(reportDiscount)
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ address: json.address, proof: json.proof, ts: Date.now() }))
      } catch {
        // ignore storage failures — in-memory state still works for this session
      }
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Could not verify wallet')
    } finally {
      setBusy(false)
    }
  }

  const connected = Boolean(stored && walletProof)
  // Shortened form (0x1234…cdef) so the verified pill doesn't overflow on
  // narrow screens; the full address is shown from `sm:` up.
  const shortStored = stored && stored.length > 12 ? `${stored.slice(0, 6)}…${stored.slice(-4)}` : stored

  return (
    <div className="flex flex-col gap-2">
      {!hideHeader && (
        <>
          <label className="text-base font-bold text-[#160b2b] leading-6">
            {label}
            {required && <span className="text-[#b42124] ml-0.5">*</span>}
          </label>
          {description ? <p className="text-sm text-[#594d73] leading-5">{description}</p> : null}
        </>
      )}
      {connected ? (
        <div className="flex items-center gap-2 w-full px-4 py-2.5 bg-[#f9f8fa] border border-[#dddae2] rounded-lg text-sm">
          <span className="text-[#594d73] shrink-0">Connected:</span>
          <Wallet className="w-4 h-4 text-[#7235ed] shrink-0" aria-hidden="true" />
          <span className="font-medium text-[#160b2b] truncate">{shortStored}</span>
          <button
            type="button"
            className="ml-auto shrink-0 font-medium text-[#7235ed] underline hover:opacity-80 transition-opacity"
            onClick={clearWallet}
          >
            Disconnect
          </button>
        </div>
      ) : isConnected ? (
        // Connected via the wallet, but not yet signed. The signature normally
        // auto-fires on connect; this loud prompt is the fallback if the user
        // dismissed it, so the required step can't be silently missed.
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-start gap-2 px-4 py-2.5 bg-[#fff8e6] border border-[#f0dca8] rounded-lg text-sm">
            <span className="text-[#9a6b00] leading-5">
              Wallet connected{address ? ` (${address.slice(0, 6)}…${address.slice(-4)})` : ''}.{' '}
              <span className="font-bold">One more step:</span> confirm ownership with a quick, free signature to add
              it to your application.
            </span>
          </div>
          <button
            type="button"
            onClick={verify}
            disabled={busy}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-[#7235ed] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6029d1] disabled:opacity-50 transition-colors"
          >
            {busy ? 'Check your wallet…' : 'Verify wallet'}
          </button>
          <button
            type="button"
            onClick={clearWallet}
            className="w-fit text-sm text-[#594d73] underline hover:text-[#160b2b] transition-colors"
          >
            Use a different wallet
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={connect}
          disabled={busy}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-[#7235ed] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6029d1] disabled:opacity-50 transition-colors"
        >
          {busy ? 'Connecting…' : 'Connect wallet'}
        </button>
      )}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  )
}

// Default export so the parent can lazy-load this module with next/dynamic.
// The wallet hooks (useAppKit/useAccount/useSignMessage) require these providers
// to be mounted above them; non-builder forms never load this module.
export default function WalletConnectFieldInner(props: Props) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config}>
      <QueryClientProvider client={queryClient}>
        <WalletWidget {...props} />
      </QueryClientProvider>
    </WagmiProvider>
  )
}
