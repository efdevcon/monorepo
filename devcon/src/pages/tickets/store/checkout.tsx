import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Markdown from 'react-markdown'
import Page from 'components/common/layouts/page'
import { Link } from 'components/common/link'
import { Wallet, CheckCircle, Lock, ChevronUp, ChevronDown, ArrowLeft, Check, Loader2, Minus, Plus, Tag, Monitor, Smartphone, Shield } from 'lucide-react'
import themes from '../../themes.module.scss'
import css from './checkout.module.scss'
import { TICKETING } from 'config/ticketing'
import { isEmail } from 'utils/validators'
import { COUNTRIES } from 'utils/countries'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  WagmiProvider,
  useAccount,
  useDisconnect,
  useEnsName,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useWalletClient,
  useSendTransaction,
  usePublicClient,
} from 'wagmi'
import { mainnet } from 'viem/chains'
import type { Config } from 'wagmi'
import { useAppKit, useWalletInfo } from '@reown/appkit/react'
import { classifyConnection, connectionTypeLabel, connectionTypeIcon, walletLocationPhrase } from 'utils/walletConnection'
import { discoverNativeTransfer } from 'utils/discoverTx'
import { wagmiAdapter } from 'context/appkit-config'
import { QuestionInfo, TicketInfo } from 'types/pretix'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'


const queryClient = new QueryClient()

// ── Token & network icons ──

const TOKEN_ICONS: Record<string, string> = {
  USDC: 'https://storage.googleapis.com/zapper-fi-assets/tokens/ethereum/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
  ETH: 'https://storage.googleapis.com/zapper-fi-assets/tokens/ethereum/0x0000000000000000000000000000000000000000.png',
  USDT0: 'https://storage.googleapis.com/zapper-fi-assets/tokens/optimism/0x01bff41798a0bcf287b996046ca68b395dbc1071.png',
}

/** Map API symbol to display name (e.g. USDT0 → USD₮0) */
const SYMBOL_DISPLAY: Record<string, string> = {
  USDT0: 'USD₮0',
}
const displaySymbol = (sym: string) => SYMBOL_DISPLAY[sym] ?? sym

/** Format a high-decimal value (e.g. ETH) to up to 8 decimal places, trimming trailing zeros */
const formatEth = (raw: number | string, decimals: number) => {
  const value = Number(raw) / 10 ** decimals
  // toFixed(8) then strip trailing zeros
  return value.toFixed(8).replace(/\.?0+$/, '')
}

const NETWORK_LOGOS: Record<number, string> = {
  1: 'https://storage.googleapis.com/zapper-fi-assets/networks/ethereum-icon.png',
  10: 'https://storage.googleapis.com/zapper-fi-assets/networks/optimism-icon.png',
  42161: 'https://storage.googleapis.com/zapper-fi-assets/networks/arbitrum-icon.png',
  8453: 'https://storage.googleapis.com/zapper-fi-assets/networks/base-icon.png',
  137: 'https://storage.googleapis.com/zapper-fi-assets/networks/polygon-icon.png',
  84532: 'https://storage.googleapis.com/zapper-fi-assets/networks/base-icon.png',
}

// ── Cart types (must match store page) ──

interface CartItem {
  ticketId: number
  name: string
  price: string
  quantity: number
}

interface PaymentInfo {
  network: string
  chainId: number
  tokenAddress: string
  tokenSymbol: string
  tokenDecimals: number
  /** Crypto-payment discount percentage as a string (e.g. "10%"), or `null`
   *  when the discount is disabled. `null` means "no discount" — not "use
   *  the FE default." */
  discountForCrypto: string | null
}

interface CartData {
  items: CartItem[]
  paymentInfo: PaymentInfo
  savedAt: number
  voucher?: string
}

interface PaymentDetails {
  network: string
  chainId: number
  tokenAddress: string
  tokenSymbol: string
  tokenDecimals: number
  amount: string
  amountFormatted: string
  recipient: string
  paymentReference: string
  expiresAt: number
}

/** Payment option from POST /api/x402/tickets/payment-options */
interface PaymentOptionSigningRequest {
  method: 'eth_signTypedData_v4' | 'eth_sendTransaction'
  params: unknown[]
}
interface PaymentOption {
  asset: string
  symbol: string
  name: string
  chain: string
  chainId: string
  decimals: number
  amount: string
  balance: string
  sufficient: boolean
  signingRequest?: PaymentOptionSigningRequest
  priceUsd?: number
  expiresAt: number
}

// ── Helpers ──
function tokenAddressFromOption(option: PaymentOption): string {
  const m = option.asset.match(/\/erc20:(0x[a-fA-F0-9]+)$/)
  return m ? m[1] : ''
}

// ── Icons ──

// Icons are imported from lucide-react at the top of the file

// ── Constants ──

const BLOCK_EXPLORERS: Record<number, string> = {
  1: 'https://etherscan.io',
  10: 'https://optimistic.etherscan.io',
  42161: 'https://arbiscan.io',
  8453: 'https://basescan.org',
  84532: 'https://sepolia.basescan.org',
  137: 'https://polygonscan.com',
}

// Per-chain block time (ms). Drives the verify-poll cadence so we don't
// spin-poll Ethereum's 12s blocks or hammer Arbitrum's sub-second blocks.
const BLOCK_TIME_MS: Record<number, number> = {
  1: 12_000, // Ethereum
  10: 2_000, // Optimism
  137: 2_000, // Polygon
  8453: 2_000, // Base
  42161: 250, // Arbitrum
}

/** Polling cadence: 1.5 s floor (don't hammer fast L2s), 2 s ceiling
 *  (don't sit idle on L1 — receipt indexing typically resolves within a
 *  few seconds of inclusion regardless of the 12 s block cadence). */
function pollIntervalMs(chainId: number | undefined): number {
  const blockTime = (chainId && BLOCK_TIME_MS[chainId]) ?? 4_000
  return Math.max(1_500, Math.min(2_000, Math.floor(blockTime / 2)))
}

/** Poll budget = enough for `requiredConfs + 1` blocks of waiting; capped at 90s. */
function pollMaxDurationMs(chainId: number | undefined, requiredConfs: number): number {
  const blockTime = (chainId && BLOCK_TIME_MS[chainId]) ?? 4_000
  return Math.min(90_000, blockTime * (requiredConfs + 1) + 4_000)
}

/** Detect Safe (multisig smart wallets). For Safes, `eth_sendTransaction` over
 *  WalletConnect resolves with a *safeTxHash* — an off-chain hash of the Safe
 *  transaction object — instead of the on-chain tx hash. We have to bridge
 *  through the Safe Transaction Service to recover the executed hash. */
function isSafeWallet(connector: { id?: string; name?: string } | undefined): boolean {
  if (!connector) return false
  if (connector.id === 'safe') return true
  return Boolean(connector.name?.toLowerCase().includes('safe'))
}

/** Per-chain Safe Transaction Service host (free, no auth). Returns null for
 *  chains where Safe doesn't operate a tx service. */
function safeTxServiceHost(chainId: number | undefined): string | null {
  switch (chainId) {
    case 1: return 'safe-transaction-mainnet.safe.global'
    case 10: return 'safe-transaction-optimism.safe.global'
    case 137: return 'safe-transaction-polygon.safe.global'
    case 8453: return 'safe-transaction-base.safe.global'
    case 42161: return 'safe-transaction-arbitrum.safe.global'
    default: return null
  }
}

/** Poll Safe Tx Service until `transactionHash` is non-null (Safe has executed
 *  the multisig and broadcast). Resolves with the on-chain tx hash, rejects
 *  on timeout. Budget defaults to 30 minutes — multisigs (e.g. 2/3) can sit
 *  waiting for co-signers; this is the upper bound the user is expected to
 *  keep the page open. Beyond that, admin manual-verify is the recovery path. */
async function pollSafeTxService(
  chainId: number | undefined,
  safeTxHash: string,
  budgetMs = 30 * 60_000
): Promise<string> {
  const host = safeTxServiceHost(chainId)
  if (!host) {
    throw new Error(`Safe Transaction Service not available for chain ${chainId}`)
  }
  const startedAt = Date.now()
  // Track consecutive 404/422s. Safe's indexer takes a few seconds to ingest
  // a new safeTxHash, so a brief 404 burst is normal. But if the address
  // isn't actually a Safe (e.g., a different smart-wallet type) the API
  // will 404 forever — bail out after ~45s so the user sees a clear error
  // instead of waiting 30 minutes.
  let consecutiveNotFound = 0
  while (Date.now() - startedAt < budgetMs) {
    try {
      const res = await fetch(`https://${host}/api/v1/multisig-transactions/${safeTxHash}/`)
      if (res.ok) {
        const data = await res.json()
        if (typeof data.transactionHash === 'string' && data.transactionHash.startsWith('0x')) {
          return data.transactionHash
        }
        consecutiveNotFound = 0
      } else if (res.status === 404 || res.status === 422) {
        consecutiveNotFound++
        if (consecutiveNotFound >= 15) {
          throw new Error(
            'Transaction not found in Safe Transaction Service — your wallet may not be a Safe, or the transaction has not been broadcast yet.'
          )
        }
      } else {
        consecutiveNotFound = 0
      }
    } catch (err) {
      // Re-throw the bail-out error; treat anything else as a transient blip.
      if (err instanceof Error && err.message.includes('not found in Safe')) throw err
    }
    await new Promise(r => setTimeout(r, 8_000))
  }
  throw new Error(
    'Safe transaction timed out — please complete the signing in your Safe and click Retry verification with the on-chain tx hash.'
  )
}

/** Poll Safe Messages Service until `preparedSignature` is non-null (Safe has
 *  collected enough owner signatures to satisfy its threshold and assembled
 *  the ERC-1271-compatible signature). Used for multisig Safes where
 *  `eth_signTypedData_v4` returns a 32-byte safeMessageHash instead of a
 *  complete signature.
 *
 *  Resolves with the prepared signature (a hex blob the relayer can pass
 *  through to the Safe contract's `isValidSignature`). */
async function pollSafeMessagesService(
  chainId: number | undefined,
  safeAddress: string,
  safeMessageHash: string,
  budgetMs = 30 * 60_000
): Promise<string> {
  const host = safeTxServiceHost(chainId)
  if (!host) {
    throw new Error(`Safe Transaction Service not available for chain ${chainId}`)
  }
  const startedAt = Date.now()
  while (Date.now() - startedAt < budgetMs) {
    try {
      const res = await fetch(
        `https://${host}/api/v1/safes/${safeAddress}/messages/${safeMessageHash}/`
      )
      if (res.ok) {
        const data = await res.json()
        if (typeof data.preparedSignature === 'string' && data.preparedSignature.startsWith('0x')) {
          return data.preparedSignature
        }
      }
    } catch {
      // Network blip — keep polling
    }
    await new Promise(r => setTimeout(r, 15_000))
  }
  throw new Error(
    'Safe message timed out — please ensure all required signers have signed in their Safe and try again.'
  )
}

const SECTION_ORDER = ['swag', 'contact', 'attendee', 'payment', 'faq'] as const

const FAQ_ITEMS = [
  {
    q: 'I plan on bringing my child to Devcon with me. Do they need a ticket?',
    a: 'If your child is between the ages of 5-17, they will need a Youth ticket, which can be purchased at any time at devcon.org/tickets. Children under the age of 5 do not need a ticket. A Youth Ticket will not be valid for anyone 18+.',
  },
  {
    q: 'When will General ticket sales start?',
    a: 'Early Bird tickets are on sale now. General admission waves will be announced.',
  },
  {
    q: 'Will there be opportunities to obtain discounted tickets?',
    a: 'Yes. Self-claiming discounts for Indian locals are available via AnonAadhaar. Additional discount categories open 1 May.',
  },
  {
    q: 'If I buy a ticket, and then I am accepted to Speak, can I get a refund for the original ticket I purchased?',
    a: 'Yes, if you are accepted as a speaker, you can request a refund for your original ticket purchase.',
  },
  {
    q: 'If I am accepted for a discount after buying a full-priced ticket, can I get refund of the difference?',
    a: 'Yes, we will process a partial refund for the difference between your original ticket price and the discounted price.',
  },
  {
    q: 'I need a Visa invitation Letter. How can I obtain one?',
    a: 'Visa invitation letters will be available for ticket holders closer to the event date. Details will be shared via email.',
  },
  {
    q: 'When will I get my ticket?',
    a: 'Your ticket will be sent to the email address provided during checkout shortly after purchase.',
  },
  {
    q: 'Can I purchase tickets with crypto?',
    // FAQ string varies based on whether the crypto discount is active. When
    // `cryptoDiscountPercent` is 0 the discount is disabled everywhere — the
    // answer drops the "% discount" claim.
    a: TICKETING.payment.cryptoDiscountPercent > 0
      ? `Yes! We accept crypto payments with a ${TICKETING.payment.cryptoDiscountPercent}% discount. You can pay using all major wallets and tokens.`
      : 'Yes! We accept crypto payments. You can pay using all major wallets and tokens.',
  },
  {
    q: 'How can I cancel my order?',
    a: 'You can request a cancellation by contacting our support team. Refund policies apply.',
  },
  {
    q: 'What if I only need to cancel some tickets on an order with multiple?',
    a: 'You can request a partial cancellation by contacting our support team.',
  },
  {
    q: 'Tickets are sold out - How can I attend?',
    a: 'Join the waitlist and follow our social channels for announcements about additional ticket releases.',
  },
]

// ── Main page wrapper with providers ──

export default function CheckoutPage() {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config}>
      <QueryClientProvider client={queryClient}>
        <CheckoutContent />
      </QueryClientProvider>
    </WagmiProvider>
  )
}

// ── Checkout content ──

function CheckoutContent() {
  // When true, the "crypto" payment button skips the in-page x402 picker and
  // redirects to Pretix's hosted checkout — which dispatches to our installed
  // WalletConnect plugin (the wc_inject UI). Used as a kill switch for the
  // in-page x402 flow if anything goes wrong with it.
  const forcePretixRedirect = TICKETING.checkout.forcePretixRedirect
  const supportEmail = (TICKETING.checkout as { supportEmail?: string }).supportEmail || ''
  const { address, isConnected, chain, connector } = useAccount()
  // Reown AppKit hook — exposes the *actual* wallet on the other side of a
  // WalletConnect session (e.g. "Rainbow", "MetaMask Mobile") rather than
  // the generic "WalletConnect" connector name. For injected connections
  // it mirrors the extension's announced metadata. May be undefined for a
  // brief window right after a restored session reconnects.
  const { walletInfo } = useWalletInfo()
  const connectionKind = classifyConnection(connector)
  const connectedWalletName = walletInfo?.name || connector?.name
  const connectedWalletIcon = walletInfo?.icon || connector?.icon
  // Some wallets (Bitget has been the worst offender, but it's a generic
  // problem with self-hosted icon CDNs) return an `icon` URL that 4xxs,
  // times out, or is malformed. Without a fallback the buyer sees the
  // browser's broken-image glyph next to a perfectly working connection.
  // Tracking the failure per-icon (keyed by URL) lets us swap to the
  // gradient placeholder without re-rendering on every network blip.
  const [iconLoadFailedFor, setIconLoadFailedFor] = useState<string | null>(null)
  const iconBroken = Boolean(connectedWalletIcon && iconLoadFailedFor === connectedWalletIcon)
  // Reverse-resolve the connected address to an ENS name on Ethereum
  // mainnet (UNS / other namespaces aren't supported by viem's resolver).
  // Pinned to chainId=1 regardless of which chain the user is currently on
  // — `.eth` reverse records only live on mainnet. Cached automatically by
  // wagmi/React Query so the call only fires once per address. Renders the
  // truncated 0x… while loading or if no name is set.
  const { data: ensName } = useEnsName({
    address,
    chainId: mainnet.id,
    query: { enabled: Boolean(address) },
  })
  // DEMO HARDCODE: rebrand `d.krux.eth` → `d.devcon.eth` for the demo.
  // The `title={address}` on the rendered `<span>` still surfaces the real
  // 0x on hover, so this is purely a visual substitution. REMOVE AFTER DEMO.
  const displayEnsName = ensName === 'd.krux.eth' ? 'd.devcon.eth' : ensName
  const { open } = useAppKit()
  const { disconnect } = useDisconnect()
  const { switchChain, switchChainAsync, isPending: isSwitchingChain } = useSwitchChain()
  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // ── Section accordion ──
  const [openSection, setOpenSection] = useState<string | null>('swag')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)
  const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'fiat'>('crypto')

  // ── Cart from localStorage ──
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)

  // ── Questions & tickets (add-ons) from API ──
  const [questions, setQuestions] = useState<QuestionInfo[]>([])
  const [tickets, setTickets] = useState<TicketInfo[]>([])
  const [attendeeNameAsked, setAttendeeNameAsked] = useState(false)
  const [attendeeNameRequired, setAttendeeNameRequired] = useState(false)

  // ── Add-on selections: Map<addonItemId, { quantity, variationId? }> ──
  const [selectedAddons, setSelectedAddons] = useState<Map<number, { quantity: number; variationId?: number }>>(new Map())

  // ── Form state ──
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [newsletter, setNewsletter] = useState(false)
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({})
  const [showContactErrors, setShowContactErrors] = useState(false)
  const [showAttendeeErrors, setShowAttendeeErrors] = useState(false)
  /** Flips true when the user clicks Continue on the Swag section with at
   *  least one addon picked at quantity ≥ 1 but no variation chosen. Drives
   *  red borders on the size dropdown + an inline error message. Auto-clears
   *  on the next successful Continue. */
  const [showSwagErrors, setShowSwagErrors] = useState(false)
  // ── Payment flow state ──
  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [orderSummary, setOrderSummary] = useState<any>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)
  // Set true after verify succeeds — used to hide the Pay button during the
  // short window between "verified" and the actual router.push navigation.
  const [paymentSucceeded, setPaymentSucceeded] = useState(false)

  // Gasless state
  const [authorizationData, setAuthorizationData] = useState<any>(null)
  const [isExecutingGasless, setIsExecutingGasless] = useState(false)
  // True during the verifyPayment poll (between tx broadcast and order confirmation).
  // Used to lock token/network selection until verification resolves.
  const [isVerifying, setIsVerifying] = useState(false)
  // Confirmation progress surfaced from the plugin's `confirmations` /
  // `confirmations_required` fields. Used to render "Confirming on-chain (1/3)…"
  // in place of the old retry-counter ("3/12 attempts") UI which was misleading
  // — it implied the system was approaching failure when it was actually just
  // waiting on the chain to mine more blocks.
  const [confirmProgress, setConfirmProgress] = useState<{ current: number; required: number } | null>(null)
  // EIP-191 signature binding payer wallet to the payment reference.
  // Only populated for the native ETH path (USDC/USDT0 are bound via EIP-3009).
  const [ethPayerSignature, setEthPayerSignature] = useState<string | null>(null)

  // Hash-recovery escape hatch for native ETH sends. Some wallets (Binance
  // Wallet on macOS, intermittently Bitget Mobile/TokenPocket) broadcast the
  // tx successfully but never return the hash through the WC session, leaving
  // sendTransactionAsync hanging forever. When the watchdog can't auto-find
  // the tx via Alchemy assetTransfers within ~4min, we surface a manual hash
  // input as a last resort.
  const [needsManualHash, setNeedsManualHash] = useState(false)
  const [manualHashInput, setManualHashInput] = useState('')
  const [manualHashError, setManualHashError] = useState<string | null>(null)
  const [manualHashSubmitting, setManualHashSubmitting] = useState(false)
  const manualHashResolverRef = useRef<((hash: `0x${string}`) => void) | null>(null)
  // Holds the expected (to, value) so submitManualHash can validate the
  // pasted hash matches the order before accepting it. Cleared when recovery
  // ends or the order is cancelled.
  const expectedTxRef = useRef<{ to: string; value: bigint } | null>(null)
  // Guard against concurrent verifyPayment polls. Two callers can race for
  // the same hash — the recovery wrapper (when discovery/manual wins) and
  // the useWaitForTransactionReceipt useEffect (when the wallet eventually
  // returns the same hash anyway). Both end up polling the same backend
  // verify endpoint and racing setIsVerifying / navigation; this ref
  // suppresses the second caller for an in-flight hash.
  const verifyingHashRef = useRef<string | null>(null)

  // Payment options (multi-chain)
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([])
  const [paymentOptionsLoading, setPaymentOptionsLoading] = useState(false)
  const [selectedOption, setSelectedOption] = useState<PaymentOption | null>(null)
  const [tokenFilter, setTokenFilter] = useState<string | null>(null)

  const paymentOptionsAutoLoadedRef = useRef<string | null>(null)
  const tokenFilterAutoSelectedRef = useRef(false)
  /** Payer address frozen at the moment a payment is initiated. Read by
   *  verifyPayment instead of the live `useAccount().address` because a
   *  multisig Safe co-signer often needs to switch wallets/accounts mid-flow
   *  to provide the next signature — that switch tears down the WC session
   *  and zeros out the live address. The on-chain tx still mines under the
   *  Safe address regardless of which owner-EOA is currently connected, so
   *  freezing the payer at flow-start keeps verify pointed at the right
   *  account. */
  const payerAddressRef = useRef<string | null>(null)
  /** Mirror of `ethPayerSignature` state — read by callers that fire in the
   *  same async chain as the `setEthPayerSignature` call (notably the Safe
   *  ETH path: signMessage → setEthPayerSignature → sendTransaction →
   *  pollSafeTxService → verifyPayment, all within one async closure with
   *  no re-render between). The state's closure value is stale at that
   *  point; the ref always holds the latest. */
  const ethPayerSignatureRef = useRef<string | null>(null)

  // Voucher state
  const [discountOpen, setDiscountOpen] = useState(false)
  const [voucherInput, setVoucherInput] = useState('')
  const [voucherData, setVoucherData] = useState<{
    valid: boolean
    code?: string
    priceMode?: string
    value?: string
    itemId?: number | null
    applicableTickets?: { id: number; name: string; originalPrice: string; discountedPrice: string }[]
  } | null>(null)
  const [voucherError, setVoucherError] = useState<string | null>(null)
  const [voucherLoading, setVoucherLoading] = useState(false)
  const [mobileOrderOpen, setMobileOrderOpen] = useState(false)
  const [mobileInlineSummaryOpen, setMobileInlineSummaryOpen] = useState(false)
  const voucherValidationRef = useRef(0)
  const autoCheckoutTriggeredRef = useRef<string | null>(null)
  // Set true when /purchase returns 404 'x402 flow not enabled for this event'.
  // Suppresses the auto-checkout retry loop and surfaces a clear notice
  // instead of the generic "Failed to create purchase" the buyer would
  // otherwise see when an admin has toggled x402 off for this event.
  const [cryptoDisabledForEvent, setCryptoDisabledForEvent] = useState(false)

  // Wagmi hooks
  const { data: writeData, isPending: isWritePending, error: writeError } = useWriteContract()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const [isSigningDirect, setIsSigningDirect] = useState(false)
  const [directSignError, setDirectSignError] = useState<string | null>(null)
  /** Smart-wallet (any contract wallet) flag from on-chain `getCode`. Drives
   *  the Safe-bridge fallback in the ETH-send path — useful even for non-Safe
   *  smart wallets, because we want to *try* Safe Tx Service polling and let
   *  the API itself say no via a 404. */
  const [isSmartWallet, setIsSmartWallet] = useState(false)
  /** Safe-specific flag: true only when the connected address is registered
   *  with Safe Transaction Service. Used for the user-facing notice so the
   *  copy is Safe-flavored rather than generic-smart-wallet-flavored. */
  const [isSafeAddress, setIsSafeAddress] = useState(false)
  /** Safe owner threshold (signatures required). 1 = single-sig, ≥2 = multi-
   *  sig. Drives the "open in a separate tab" guidance, which only matters
   *  when co-signers are involved. */
  const [safeThreshold, setSafeThreshold] = useState<number | null>(null)
  // `onReplaced` fires when the wallet user clicks "Speed Up" (reason: 'repriced'),
  // sends a different tx at the same nonce ('replaced'), or clicks "Cancel"
  // ('cancelled'). The hook then resolves with the new tx's receipt — we read
  // `data.transactionHash` (NOT `writeData`/`sendTxHash`) so verify always
  // targets the hash that actually mined.
  // Detect smart wallets and Safes at connect time. Two parallel signals:
  //   1. `getCode(address)` non-empty → some contract wallet (Safe, CSW, etc.)
  //   2. Safe Transaction Service `/api/v1/safes/<addr>/` 200 → confirmed Safe
  // The smart-wallet flag drives the ETH-send fallback path (best-effort Safe
  // Tx Service polling). The Safe flag drives the user-facing notice copy so
  // it specifically says "Safe" rather than "smart wallet" (less confusing
  // for buyers using an actual Safe; non-Safe smart wallets are rare in
  // ticket purchases anyway).
  useEffect(() => {
    if (!isConnected || !address || !publicClient) {
      setIsSmartWallet(false)
      setIsSafeAddress(false)
      return
    }
    let cancelled = false
    publicClient
      .getCode({ address: address as `0x${string}` })
      .then(code => {
        if (cancelled) return
        setIsSmartWallet(Boolean(code && code !== '0x'))
      })
      .catch(() => {
        if (cancelled) return
        setIsSmartWallet(false)
      })
    const host = safeTxServiceHost(chain?.id)
    if (host) {
      fetch(`https://${host}/api/v1/safes/${address}/`)
        .then(async r => {
          if (cancelled) return
          if (!r.ok) {
            setIsSafeAddress(false)
            setSafeThreshold(null)
            return
          }
          setIsSafeAddress(true)
          const data = await r.json().catch(() => null)
          setSafeThreshold(typeof data?.threshold === 'number' ? data.threshold : null)
        })
        .catch(() => {
          if (cancelled) return
          setIsSafeAddress(false)
          setSafeThreshold(null)
        })
    } else {
      setIsSafeAddress(false)
      setSafeThreshold(null)
    }
    return () => {
      cancelled = true
    }
  }, [isConnected, address, publicClient, chain?.id])

  function handleReplaced(replacement: { reason: string }) {
    if (replacement.reason === 'cancelled') {
      setPurchaseError(`Transaction was cancelled ${walletLocationPhrase(connectionKind, connectedWalletName)} — please retry.`)
      setPaymentStatus(null)
      setIsVerifying(false)
    }
  }
  const { isLoading: isTxLoading, isSuccess: isTxSuccess, data: writeReceipt } = useWaitForTransactionReceipt({
    hash: writeData,
    onReplaced: handleReplaced,
  })
  const { sendTransactionAsync, data: sendTxHash, isPending: isSendTxPending } = useSendTransaction()
  const { isLoading: isSendTxReceiptLoading, isSuccess: isSendTxSuccess, data: sendTxReceipt } = useWaitForTransactionReceipt({
    hash: sendTxHash,
    onReplaced: handleReplaced,
  })

  // ── Voucher validation ──
  async function validateVoucherCode(code: string) {
    const generation = ++voucherValidationRef.current
    setVoucherLoading(true)
    setVoucherError(null)
    setVoucherData(null)
    try {
      const resp = await fetch('/api/x402/tickets/validate-voucher/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await resp.json()
      if (generation !== voucherValidationRef.current) return
      if (data.valid) {
        setVoucherData(data)
      } else {
        setVoucherError(data.error || 'Invalid voucher code')
      }
    } catch {
      if (generation !== voucherValidationRef.current) return
      setVoucherError('Failed to validate voucher')
    }
    setVoucherLoading(false)
  }

  // ── Load cart from localStorage ──
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('devcon-ticket-cart')
      if (raw) {
        const data: CartData = JSON.parse(raw)
        setCartItems(data.items || [])
        setPaymentInfo(data.paymentInfo || null)
        if (data.voucher) {
          setVoucherInput(data.voucher)
          validateVoucherCode(data.voucher)
        }
      }
    } catch {
      // ignore
    }
  }, [])

  // ── Auto-read voucher from URL query param (overrides cart voucher) ──
  useEffect(() => {
    if (!router.isReady) return
    const urlVoucher = router.query.voucher as string
    if (urlVoucher) {
      setVoucherInput(urlVoucher)
      validateVoucherCode(urlVoucher)
    }
  }, [router.isReady])

  // ── Load saved form data from localStorage ──
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem('devcon-checkout-form')
      if (saved) {
        const data = JSON.parse(saved)
        if (data.firstName) setFirstName(data.firstName)
        if (data.lastName) setLastName(data.lastName)
        if (data.email) setEmail(data.email)
        if (data.confirmEmail) setConfirmEmail(data.confirmEmail)
        if (data.answers) setAnswers(data.answers)
      }
    } catch {
      // ignore
    }
  }, [])

  // ── Validate cached answers against current Pretix questions ──
  // Drops any answer whose option ID no longer exists for that question
  useEffect(() => {
    if (questions.length === 0) return
    setAnswers(prev => {
      const validated: Record<number, string | string[]> = {}
      for (const [qIdStr, value] of Object.entries(prev)) {
        const qId = Number(qIdStr)
        const question = questions.find(q => q.id === qId)
        if (!question) continue // question no longer exists, drop it
        if (question.type === 'C' || question.type === 'M') {
          const validOptionIds = new Set(question.options.map(o => String(o.id)))
          if (Array.isArray(value)) {
            const filtered = value.filter(v => validOptionIds.has(String(v)))
            if (filtered.length > 0) validated[qId] = filtered
          } else if (validOptionIds.has(String(value))) {
            validated[qId] = value
          }
          // else: stale option ID, drop it
        } else {
          // Free text, boolean, etc. — always valid
          validated[qId] = value
        }
      }
      return validated
    })
  }, [questions])

  // ── Save form data to localStorage when it changes ──
  useEffect(() => {
    if (typeof window === 'undefined' || !mounted) return
    const data = { firstName, lastName, email, confirmEmail, answers }
    localStorage.setItem('devcon-checkout-form', JSON.stringify(data))
  }, [firstName, lastName, email, confirmEmail, answers, mounted])

  // ── Fetch questions & tickets (with add-ons) from API ──
  useEffect(() => {
    async function fetchTicketData() {
      try {
        const res = await fetch('/api/x402/tickets/')
        const data = await res.json()
        if (data.success) {
          setQuestions(data.data.questions || [])
          setTickets(data.data.tickets || [])
          if (data.data.attendeeNameAsked != null) setAttendeeNameAsked(data.data.attendeeNameAsked)
          if (data.data.attendeeNameRequired != null) setAttendeeNameRequired(data.data.attendeeNameRequired)
        }
      } catch {
        // questions/tickets will just be empty
      }
    }
    fetchTicketData()
  }, [])

  // ── Auto-load payment options when crypto tab is active and we have payment ref + wallet (e.g. user connected after 402)
  useEffect(() => {
    const ref = paymentDetails?.paymentReference
    if (
      paymentMethod === 'crypto' &&
      ref &&
      address &&
      paymentOptions.length === 0 &&
      !paymentOptionsLoading &&
      paymentOptionsAutoLoadedRef.current !== ref
    ) {
      paymentOptionsAutoLoadedRef.current = ref
      fetchPaymentOptions()
    }
    if (!ref) paymentOptionsAutoLoadedRef.current = null
  }, [paymentMethod, paymentDetails?.paymentReference, address, paymentOptions.length, paymentOptionsLoading])

  // ── Auto-select token filter tab for symbol with highest USD value ──
  useEffect(() => {
    if (tokenFilterAutoSelectedRef.current) return
    if (paymentOptions.length === 0) return

    const uniqueSymbols = [...new Set(paymentOptions.map(o => o.symbol))]

    // If only 1 symbol, auto-select it directly
    if (uniqueSymbols.length === 1) {
      tokenFilterAutoSelectedRef.current = true
      setTokenFilter(uniqueSymbols[0])
      const bestOpt = paymentOptions.find(o => Boolean(o.signingRequest) && o.sufficient)
      if (bestOpt) selectPaymentOption(bestOpt)
      return
    }

    const usdBySymbol = new Map<string, number>()
    for (const opt of paymentOptions) {
      const usdValue = opt.symbol === 'ETH' && opt.priceUsd
        ? (Number(opt.balance) / 1e18) * opt.priceUsd
        : Number(opt.balance) / 10 ** opt.decimals
      usdBySymbol.set(opt.symbol, (usdBySymbol.get(opt.symbol) ?? 0) + usdValue)
    }

    let bestSymbol: string | null = null
    let bestValue = -1
    for (const [sym, val] of usdBySymbol) {
      if (val > bestValue) {
        bestValue = val
        bestSymbol = sym
      }
    }

    if (bestSymbol) {
      tokenFilterAutoSelectedRef.current = true
      setTokenFilter(bestSymbol)
      const bestOpt = paymentOptions.find(o => o.symbol === bestSymbol && Boolean(o.signingRequest) && o.sufficient)
      if (bestOpt) selectPaymentOption(bestOpt)
    }
  }, [paymentOptions])

  // ── Handle direct payment tx success ──
  // Use `writeReceipt.transactionHash` (NOT `writeData`) so we verify the tx
  // that actually mined — including any wallet-side speed-up or replacement
  // that produced a different hash at the same nonce.
  useEffect(() => {
    if (isTxSuccess && writeReceipt && paymentDetails) {
      const minedHash = writeReceipt.transactionHash
      if (writeData && minedHash !== writeData) {
        console.info('[checkout] write tx replaced/sped-up:', writeData, '→', minedHash)
      }
      setTxHash(minedHash)
      verifyPayment(minedHash)
    }
  }, [isTxSuccess, writeReceipt])

  // ── Handle native ETH send tx success ──
  useEffect(() => {
    if (isSendTxSuccess && sendTxReceipt && paymentDetails) {
      const minedHash = sendTxReceipt.transactionHash
      if (sendTxHash && minedHash !== sendTxHash) {
        console.info('[checkout] sendTx replaced/sped-up:', sendTxHash, '→', minedHash)
      }
      setTxHash(minedHash)
      verifyPayment(minedHash)
    }
  }, [isSendTxSuccess, sendTxReceipt])

  /**
   * Sign EIP-712 typed data directly via eth_signTypedData_v4.
   * Formats data for optimal wallet interpretation (hex chainId, EIP712Domain type, string values).
   */
  async function signEIP712Direct(typedData: {
    domain: { name?: string; version?: string; chainId?: number | string; verifyingContract?: string }
    types: Record<string, Array<{ name: string; type: string }>>
    primaryType: string
    message: Record<string, unknown>
  }): Promise<string> {
    if (!walletClient || !address) throw new Error('Wallet not connected')

    const chainIdNum = typeof typedData.domain.chainId === 'string'
      ? parseInt(typedData.domain.chainId, (typedData.domain.chainId as string).startsWith('0x') ? 16 : 10)
      : Number(typedData.domain.chainId ?? 0)

    // Include EIP712Domain type explicitly and put primaryType first for better wallet recognition
    const types: Record<string, Array<{ name: string; type: string }>> = {
      [typedData.primaryType]: typedData.types[typedData.primaryType],
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
    }

    const jsonStr = JSON.stringify({
      types,
      primaryType: typedData.primaryType,
      domain: {
        ...typedData.domain,
        chainId: `0x${chainIdNum.toString(16)}`,
      },
      message: Object.fromEntries(
        Object.entries(typedData.message).map(([k, v]) => [
          k,
          typeof v === 'bigint' ? v.toString() : String(v),
        ])
      ),
    })

    const sig = (await walletClient.request({
      method: 'eth_signTypedData_v4',
      params: [address, jsonStr],
    } as any)) as string

    // Multisig Safe path: when threshold > 1, the Safe app stores the
    // typed-data message in Safe Tx Service and returns the safeMessageHash
    // (32 bytes / 66 chars including 0x) instead of a complete signature. The
    // dapp must poll Safe Messages API until co-signers have signed and the
    // assembled `preparedSignature` is available — that's what the relayer
    // submits to the Safe contract's ERC-1271 `isValidSignature`.
    //
    // Length-based discrimination: a real ECDSA sig is 65 bytes (132 chars +
    // 0x), an ERC-1271 sig is even longer; only a bare hash is 32 bytes (66
    // chars + 0x). So short = "this is a hash, not a sig".
    if (typeof sig === 'string' && sig.length === 66 && sig.startsWith('0x')) {
      setPaymentStatus('Waiting for Safe owners to sign — this may take a while...')
      return await pollSafeMessagesService(chainIdNum, address as string, sig)
    }
    return sig
  }

  // ── Get applicable questions for selected tickets ──
  const ticketIds = cartItems.map(c => c.ticketId)
  const applicableQuestions = questions.filter(
    q => q.appliesToItems.length === 0 || q.appliesToItems.some(id => ticketIds.includes(id))
  )

  // ── Get available add-ons for selected tickets ──
  // Collect all add-on categories across selected tickets (deduplicated by categoryId)
  const availableAddons = (() => {
    const seen = new Set<number>()
    const result: TicketInfo['addons'] = []
    for (const cartItem of cartItems) {
      const ticket = tickets.find(t => t.id === cartItem.ticketId)
      if (!ticket) continue
      for (const addon of ticket.addons) {
        if (!seen.has(addon.categoryId)) {
          seen.add(addon.categoryId)
          result.push(addon)
        }
      }
    }
    return result
  })()

  // Flat list of all available add-on items (for price lookup in summary)
  const allAddonItems = availableAddons.flatMap(a => a.items)

  // Fingerprint for detecting add-on selection changes (used in reset + auto-checkout effects)
  const addonFingerprint = JSON.stringify(Array.from(selectedAddons.entries()).sort((a, b) => a[0] - b[0]))

  // Lookup: addon item id → parent category (so we can read priceIncluded).
  // An item can appear in only one addon-category for a given ticket, so the
  // first hit is authoritative.
  const addonCategoryByItemId = new Map<number, TicketInfo['addons'][number]>()
  for (const cat of availableAddons) {
    for (const it of cat.items) {
      if (!addonCategoryByItemId.has(it.id)) addonCategoryByItemId.set(it.id, cat)
    }
  }

  // Add-on subtotal
  const addonSubtotal = Array.from(selectedAddons.entries()).reduce((sum, [itemId, data]) => {
    const item = allAddonItems.find(i => i.id === itemId)
    if (!item || data.quantity <= 0) return sum
    // Free as an addon to the selected ticket — Pretix's `price_included: true`
    // on the parent ticket's addon-category entry overrides item.default_price.
    const category = addonCategoryByItemId.get(itemId)
    if (category?.priceIncluded) return sum
    // If a variation is selected, use variation price; otherwise use item price
    let price = parseFloat(item.price)
    if (data.variationId) {
      const variation = item.variations.find(v => v.id === data.variationId)
      if (variation) price = parseFloat(variation.price)
    }
    return sum + price * data.quantity
  }, 0)

  // ── Derived cart values ──
  const ticketSubtotal = cartItems.reduce((sum, c) => sum + parseFloat(c.price) * c.quantity, 0)
  const subtotal = ticketSubtotal + addonSubtotal

  // Voucher discount (computed from server-provided discounted prices)
  const voucherDiscount = (() => {
    if (!voucherData?.valid || !voucherData.applicableTickets) return 0
    let discount = 0
    for (const cartItem of cartItems) {
      const applicable = voucherData.applicableTickets.find(t => t.id === cartItem.ticketId)
      if (applicable) {
        discount += (parseFloat(applicable.originalPrice) - parseFloat(applicable.discountedPrice)) * cartItem.quantity
      }
    }
    return +discount.toFixed(2)
  })()

  // API is source of truth when it ships a value (string OR explicit null).
  // Fall back to TICKETING config only when paymentInfo isn't loaded yet OR
  // the field is missing (older API response). `null` is a meaningful
  // "disabled" signal from the API and must NOT trigger the fallback.
  const apiDiscount = paymentInfo?.discountForCrypto
  const cryptoDiscountPercent =
    apiDiscount === undefined
      ? TICKETING.payment.cryptoDiscountPercent
      : apiDiscount === null
        ? 0
        : (parseInt(apiDiscount) || 0)
  // Single derived flag — every render site (badge, summary line, FAQ) gates
  // on this. When false, the discount is invisible everywhere (no "0%", no
  // "-$0", no SAVE badge, no FAQ mention).
  const cryptoDiscountEnabled = cryptoDiscountPercent > 0
  const cryptoDiscount = cryptoDiscountEnabled && paymentMethod === 'crypto' && !forcePretixRedirect
    ? +((subtotal - voucherDiscount) * cryptoDiscountPercent / 100).toFixed(2)
    : 0
  const totalUsdNum = +(subtotal - voucherDiscount - cryptoDiscount).toFixed(2)
  const totalUsd = totalUsdNum.toFixed(2)

  // ── GST/VAT ──
  // Ticket prices are tax-inclusive. Discounts reduce the taxable base, so GST is
  // computed on the *post-discount* total — the actual tax remitted to the customer.
  const vatPercent = TICKETING.tax.vatPercent
  const vatLabel = TICKETING.tax.label
  const totalExclGst = vatPercent > 0 ? +(totalUsdNum / (1 + vatPercent / 100)).toFixed(2) : totalUsdNum
  const gstAmount = +(totalUsdNum - totalExclGst).toFixed(2)
  const showGstBreakdown = gstAmount > 0

  // ── Wallet error helper ──
  function humanizeWalletError(e: unknown): string {
    const msg = (e as Error).message || ''
    if (/user (rejected|denied|cancelled|refused)/i.test(msg) || /request.rejected/i.test(msg)) {
      return 'Transaction rejected — please try again when ready.'
    }
    // Wallet-side RPC hiccups: Zerion (and others) route their pre-tx reads
    // through shared Reown/erpc upstream pools, which periodically rate-limit
    // or return missing-data errors. The wallet surfaces these as opaque blobs
    // — map the known signatures to a clear retry prompt.
    if (
      /header not found/i.test(msg) ||
      /ErrUpstreamsExhausted|ErrEndpointMissingData|ErrUpstreamRequest/i.test(msg) ||
      /upstream connect error/i.test(msg) ||
      /rate.?limited|too many requests/i.test(msg) ||
      /-32014/.test(msg) ||
      /(syntax error at index 0|invalid chars)[\s\S]*upstream/i.test(msg)
    ) {
      return "Your wallet's network connection was unstable while preparing the transaction. Please try again."
    }
    return msg || 'Something went wrong'
  }

  function humanizeRelayerError(msg?: string, category?: string): string {
    if (category === 'relayer_insufficient_funds') {
      return 'Payment processor is temporarily unavailable on this network. Please pick a different network below and try again.'
    }
    if (category === 'gas_price_too_high') {
      return 'Network fees are currently high. Please try again in a minute or switch to another network.'
    }
    if (!msg) return 'Failed to execute transfer'
    if (/relayer cannot afford tx/i.test(msg)) return 'Payment processor is temporarily unavailable on this network. Please pick a different network below and try again.'
    if (/gas price .* exceeds cap/i.test(msg)) return 'Network fees are currently high. Please try again in a minute or switch to another network.'
    if (/simulation reverted/i.test(msg)) return 'This transaction would fail on-chain. Please check your balance and try again.'
    if (/nonce has already been used/i.test(msg)) return 'This authorization has already been used. Please start a new payment.'
    if (/^insufficient /i.test(msg)) return msg // already human-readable ("Insufficient USDC balance: ...")
    return 'Failed to execute transfer. Please try again.'
  }

  // ── Native-ETH send with hash-recovery ──
  // Wraps `sendTransactionAsync` so that wallets which broadcast a tx but fail
  // to return the hash (Binance Wallet on macOS being the canonical example,
  // and a class of WC-implementation bugs more generally) don't strand the UI
  // in "Confirm in wallet…" forever after the buyer's funds have already left.
  //
  // Three paths race for the hash:
  //   1. Wallet → returns hash via WC/injected (the happy path, ~always wins)
  //   2. Auto-discovery → after a 45s grace, polls Alchemy assetTransfers
  //      every 8s for an outgoing native-ETH transfer matching from/to/value
  //      since `fromBlock`. Fires until the hash is found or 4min elapse.
  //   3. Manual hash entry → after the auto window expires, an input field
  //      appears so the buyer can paste the hash from their wallet history.
  //
  // Whichever path resolves first wins; the others are no-ops afterwards.
  // Errors from the wallet path (genuine rejections, RPC failures) reject
  // the outer promise and bypass recovery.
  async function sendNativeEthWithRecovery(args: {
    to: `0x${string}`
    value: bigint
    data: `0x${string}`
    chainId: number
    payer: string
  }): Promise<`0x${string}`> {
    // Snapshot the chain head before sending so the discovery poll has a
    // tight lower bound. If we can't read it (publicClient temporarily
    // unavailable), fall back to scanning recent history — Alchemy capped
    // at maxCount=1000 will still return our match if it lands.
    let preBlock: bigint | undefined
    try {
      preBlock = await publicClient?.getBlockNumber()
    } catch {
      preBlock = undefined
    }

    expectedTxRef.current = { to: args.to.toLowerCase(), value: args.value }

    const startedAt = Date.now()
    let resolved = false
    let resolveOuter!: (h: `0x${string}`) => void
    let rejectOuter!: (e: unknown) => void
    const result = new Promise<`0x${string}`>((res, rej) => {
      resolveOuter = res
      rejectOuter = rej
    })
    const cleanup = () => {
      manualHashResolverRef.current = null
      setNeedsManualHash(false)
    }
    // Wallet path resolution: hand the hash back and let the existing
    // useWaitForTransactionReceipt → verifyPayment useEffect run.
    const finishFromWallet = (h: `0x${string}`) => {
      if (resolved) return
      resolved = true
      console.info('[checkout] tx-hash recovery: WALLET path won', { hash: h, elapsedMs: Date.now() - startedAt })
      cleanup()
      resolveOuter(h)
    }
    // Recovery path resolution (Alchemy or manual): wagmi never saw this
    // hash, so the receipt useEffect will never fire. Trigger verify here.
    const finishFromRecovery = (h: `0x${string}`, source: 'discovery' | 'manual') => {
      if (resolved) return
      resolved = true
      console.info(`[checkout] tx-hash recovery: ${source.toUpperCase()} path won`, { hash: h, elapsedMs: Date.now() - startedAt })
      cleanup()
      setTxHash(h)
      verifyPayment(h)
      resolveOuter(h)
    }
    const fail = (e: unknown) => {
      if (resolved) return
      resolved = true
      console.info('[checkout] tx-hash recovery: WALLET path FAILED', { error: e, elapsedMs: Date.now() - startedAt })
      cleanup()
      rejectOuter(e)
    }

    manualHashResolverRef.current = (h) => finishFromRecovery(h, 'manual')

    // Path 1: the wallet
    sendTransactionAsync({
      to: args.to,
      value: args.value,
      data: args.data,
    })
      .then(h => finishFromWallet(h as `0x${string}`))
      .catch(e => fail(e))

    // Path 2 + 3: discovery + manual fallback
    const GRACE_MS = 20_000
    const POLL_MS = 8_000
    const TOTAL_MS = 60_000
    let announcedDiscovery = false

    const tick = async () => {
      if (resolved) return
      if (!announcedDiscovery) {
        announcedDiscovery = true
        console.info('[checkout] tx-hash recovery: discovery polling started', { graceMs: GRACE_MS, pollMs: POLL_MS, totalMs: TOTAL_MS })
        setPaymentStatus('Looking for your transaction on chain — please do not close this window…')
      }
      try {
        const found = await discoverNativeTransfer({
          chainId: args.chainId,
          payer: args.payer,
          to: args.to,
          value: args.value,
          fromBlock: preBlock,
        })
        console.info('[checkout] tx-hash recovery: discovery poll result', { found: found ?? null, elapsedMs: Date.now() - startedAt })
        if (found) {
          finishFromRecovery(found, 'discovery')
          return
        }
      } catch (err) {
        console.info('[checkout] tx-hash recovery: discovery poll error', err)
      }
      if (resolved) return
      if (Date.now() - startedAt < TOTAL_MS) {
        setTimeout(tick, POLL_MS)
      } else {
        // Auto window exhausted. Surface the manual entry but keep listening
        // — the wallet might still resolve, and the manualHashResolverRef is
        // wired up the same way.
        console.info('[checkout] tx-hash recovery: auto window exhausted, surfacing manual hash entry')
        setPaymentStatus(null)
        setNeedsManualHash(true)
      }
    }
    setTimeout(tick, GRACE_MS)

    return result
  }

  // ── Manual-hash submit ──
  // Validates the hash on-chain (from=payer, to=expected, value=expected)
  // before accepting, then hands it to whatever recovery flow is awaiting it.
  async function submitManualHash() {
    const raw = manualHashInput.trim()
    setManualHashError(null)
    if (!/^0x[0-9a-fA-F]{64}$/.test(raw)) {
      setManualHashError('That doesn\'t look like a transaction hash. It should be 0x followed by 64 hex characters.')
      return
    }
    if (!publicClient) {
      setManualHashError('Wallet not connected — cannot verify the hash.')
      return
    }
    if (!expectedTxRef.current || !manualHashResolverRef.current) {
      setManualHashError('No payment is currently waiting for a hash.')
      return
    }
    const expectedPayer = (payerAddressRef.current ?? address ?? '').toLowerCase()
    const expected = expectedTxRef.current

    setManualHashSubmitting(true)
    try {
      const tx = await publicClient.getTransaction({ hash: raw as `0x${string}` })
      if (!tx) {
        setManualHashError('Transaction not found on chain. Make sure you pasted the correct hash and that it has been broadcast.')
        return
      }
      if ((tx.from ?? '').toLowerCase() !== expectedPayer) {
        setManualHashError('That transaction was sent from a different wallet than the one connected here.')
        return
      }
      if ((tx.to ?? '').toLowerCase() !== expected.to) {
        setManualHashError('That transaction was sent to a different address than the order recipient.')
        return
      }
      if (tx.value !== expected.value) {
        setManualHashError('That transaction\'s ETH amount does not match the order total.')
        return
      }
      manualHashResolverRef.current(raw as `0x${string}`)
      setManualHashInput('')
    } catch (e) {
      setManualHashError(
        (e instanceof Error && e.message) ||
        'Could not look up the transaction. Please try again in a moment.'
      )
    } finally {
      setManualHashSubmitting(false)
    }
  }

  // ── Payment state invalidation ──
  // Clears all payment-in-progress state so the user must re-initiate checkout.
  // Called whenever order inputs change after checkout has been started.
  function resetPaymentState() {
    setPaymentDetails(null)
    setPaymentOptions([])
    setSelectedOption(null)
    setOrderSummary(null)
    setPaymentStatus(null)
    setTxHash(null)
    setAuthorizationData(null)
    setPurchaseError(null)
    setDirectSignError(null)
    setTokenFilter(null)
    setPaymentSucceeded(false)
    setNeedsManualHash(false)
    setManualHashInput('')
    setManualHashError(null)
    setManualHashSubmitting(false)
    manualHashResolverRef.current = null
    expectedTxRef.current = null
    verifyingHashRef.current = null
    tokenFilterAutoSelectedRef.current = false
    paymentOptionsAutoLoadedRef.current = null
    autoCheckoutTriggeredRef.current = null
  }

  const isProcessing =
    purchaseLoading ||
    isSigningDirect ||
    isExecutingGasless ||
    isWritePending ||
    isTxLoading ||
    isSendTxPending ||
    isSendTxReceiptLoading ||
    isVerifying

  // Invalidate stale payment when user navigates away from payment section
  // (e.g. goes back to edit add-ons, contact details, etc.)
  useEffect(() => {
    if (openSection !== 'payment' && !isProcessing && paymentDetails) {
      resetPaymentState()
    }
  }, [openSection])

  // Invalidate stale payment when the order total changes
  // (e.g. voucher applied/removed from sidebar, payment method switched)
  useEffect(() => {
    if (!isProcessing && paymentDetails) {
      resetPaymentState()
    }
  }, [totalUsd, address, addonFingerprint])

  // ── Section helpers ──
  const [sectionWarning, setSectionWarning] = useState<string | null>(null)

  const toggleSection = (id: string) => {
    // Block forward jumps past 'swag' when an addon is picked at qty ≥ 1 but
    // its variation hasn't been chosen — same gating shape as the
    // contact/attendee mandatory-field guards below.
    const movingPastSwag = id !== 'swag' && id !== 'faq' && openSection !== id
    if (movingPastSwag && !swagSelectionsValid) {
      setSectionWarning('Please select a size for each add-on first.')
      setShowSwagErrors(true)
      setOpenSection('swag')
      return
    }
    if (id === 'payment' && openSection !== 'payment') {
      if (!contactDetailsFilled) {
        setSectionWarning('Please fill in your contact details first.')
        setShowContactErrors(true)
        setOpenSection('contact')
        return
      }
      const hasAttendeeErrors = applicableQuestions.some(q => q.required && isDependencyMet(q) && isFieldEmpty(q.id))
      if (hasAttendeeErrors) {
        setSectionWarning('Please complete all required attendee fields first.')
        setShowAttendeeErrors(true)
        setOpenSection('attendee')
        return
      }
    }
    setSectionWarning(null)
    setOpenSection(s => (s === id ? null : id))
  }

  const goToNextSection = (currentSectionId: string) => {
    setSectionWarning(null)
    const i = SECTION_ORDER.indexOf(currentSectionId as (typeof SECTION_ORDER)[number])
    if (i >= 0 && i < SECTION_ORDER.length - 1) {
      let next = SECTION_ORDER[i + 1]
      // Skip 'swag' section if no add-ons available
      if (next === 'swag' && availableAddons.length === 0) {
        const j = SECTION_ORDER.indexOf('swag')
        if (j < SECTION_ORDER.length - 1) next = SECTION_ORDER[j + 1]
      }
      setOpenSection(next)
    }
  }

  const namesFilled = !attendeeNameRequired || (firstName.trim() !== '' && lastName.trim() !== '')
  const contactDetailsFilled =
    namesFilled &&
    isEmail(email.trim()) &&
    email.trim() === confirmEmail.trim()

  /** True when ETH is the sole enabled crypto token — drives ETH-specific
   *  copy on the payment option. Computed via a non-narrowing runtime cast
   *  so changing the token list shape (`as const` vs typed alias) in
   *  `config/ticketing.ts` doesn't reintroduce TS2367. */
  const enabledTokensList = TICKETING.payment.enabledTokens as readonly string[]
  const isEthOnly = enabledTokensList.length === 1 && enabledTokensList[0] === 'ETH'

  /** True when every selected addon (quantity ≥ 1) that has variations has a
   *  variation chosen. Same gating semantics as `contactDetailsFilled` —
   *  blocks forward navigation past the Swag section. */
  const swagSelectionsValid = (() => {
    for (const [itemId, data] of selectedAddons.entries()) {
      if (data.quantity <= 0) continue
      const item = allAddonItems.find(i => i.id === itemId)
      if (!item || item.variations.length === 0) continue
      if (!data.variationId) return false
    }
    return true
  })()

  // Auto-trigger crypto checkout when prerequisites are met (only on payment section)
  useEffect(() => {
    if (
      openSection === 'payment' &&
      paymentMethod === 'crypto' &&
      !forcePretixRedirect &&
      contactDetailsFilled &&
      cartItems.length > 0 &&
      isConnected &&
      address &&
      !paymentDetails &&
      !isProcessing &&
      !cryptoDisabledForEvent
    ) {
      const key = `${address}-${totalUsd}-${addonFingerprint}`
      if (autoCheckoutTriggeredRef.current === key) return
      autoCheckoutTriggeredRef.current = key

      setPurchaseLoading(true)
      setPurchaseError(null)
      handleCryptoCheckout().finally(() => setPurchaseLoading(false))
    }
  }, [openSection, paymentMethod, forcePretixRedirect, contactDetailsFilled, cartItems.length, isConnected, address, paymentDetails, isProcessing, totalUsd, addonFingerprint, cryptoDisabledForEvent])

  // Add-on selection helpers
  const toggleAddon = (itemId: number) => {
    setSelectedAddons(prev => {
      const next = new Map(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.set(itemId, { quantity: 1 })
      }
      return next
    })
  }

  const setAddonQuantity = (itemId: number, qty: number) => {
    setSelectedAddons(prev => {
      const next = new Map(prev)
      if (qty <= 0) {
        next.delete(itemId)
      } else {
        const existing = next.get(itemId)
        next.set(itemId, { quantity: qty, variationId: existing?.variationId })
      }
      return next
    })
  }

  const setAddonVariation = (itemId: number, variationId: number | undefined) => {
    setSelectedAddons(prev => {
      const next = new Map(prev)
      if (!variationId) {
        next.delete(itemId)
      } else {
        next.set(itemId, { quantity: 1, variationId })
      }
      return next
    })
  }

  // ── Answer update helper ──
  const updateAnswer = (questionId: number, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const toggleMultiAnswer = (questionId: number, optionId: string) => {
    setAnswers(prev => {
      // Defensive: a previous render may have stored a single-select string
      // under this id (e.g. if the question type changed, or the value was
      // hydrated from a Pretix answer that's persisted as a comma-joined
      // string). Coerce non-array values into an array before .filter / spread.
      const raw = prev[questionId]
      const current: string[] = Array.isArray(raw)
        ? raw
        : typeof raw === 'string' && raw.length > 0
        ? raw.split(',').map(s => s.trim()).filter(Boolean)
        : []
      const next = current.includes(optionId) ? current.filter(v => v !== optionId) : [...current, optionId]
      return { ...prev, [questionId]: next }
    })
  }

  const isFieldEmpty = (questionId: number) => {
    const val = answers[questionId]
    if (val === undefined || val === null) return true
    if (Array.isArray(val)) return val.length === 0
    return typeof val === 'string' && val.trim() === ''
  }

  const getFieldErrorMessage = (q: { type: string; identifier?: string }) => {
    if (q.type === 'CC') return 'Please select a country.'
    if (q.type === 'C') return 'Please select an option.'
    if (q.type === 'B') return 'Please select a response.'
    if (q.type === 'M') return 'Please select at least one option.'
    return 'This field is required.'
  }

  const handleAttendeContinue = () => {
    // Also check contact details — if user somehow skipped them
    if (!contactDetailsFilled) {
      setShowContactErrors(true)
      setSectionWarning('Please fill in your contact details first.')
      setOpenSection('contact')
      return
    }
    const firstErrorQuestion = applicableQuestions.find(q => (q.required || q.dependsOn) && isDependencyMet(q) && isFieldEmpty(q.id))
    if (firstErrorQuestion) {
      setShowAttendeeErrors(true)
      setTimeout(() => {
        const el = document.querySelector(`[data-question-id="${firstErrorQuestion.id}"]`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
      return
    }
    setShowAttendeeErrors(false)
    goToNextSection('attendee')
  }

  // ── Purchase flow ──
  function isDependencyMet(q: QuestionInfo): boolean {
    if (!q.dependsOn) return true
    const parentAnswer = answers[q.dependsOn.questionId]
    const parentQuestion = questions.find(pq => pq.id === q.dependsOn!.questionId)
    if (!parentQuestion) return true
    const selectedIds = Array.isArray(parentAnswer) ? parentAnswer : parentAnswer ? [parentAnswer] : []
    const selectedIdentifiers = selectedIds
      .map(id => parentQuestion.options.find(o => String(o.id) === String(id))?.identifier)
      .filter(Boolean) as string[]
    return q.dependsOn.values.some(v => selectedIdentifiers.includes(v))
  }

  function buildFormattedAnswers() {
    return Object.entries(answers)
      .filter(([qId, v]) => {
        if (Array.isArray(v) && v.length === 0) return false
        if (typeof v === 'string' && v.trim() === '') return false
        // Exclude answers for hidden dependent questions
        const question = questions.find(q => q.id === parseInt(qId))
        if (question && !isDependencyMet(question)) return false
        return true
      })
      .map(([qId, answer]) => ({
        questionId: parseInt(qId),
        answer,
      }))
  }

  async function handleCheckout() {
    if (!contactDetailsFilled) {
      setPurchaseError('Please fill in all contact details')
      setOpenSection('contact')
      return
    }

    if (cartItems.length === 0) {
      setPurchaseError('No items in cart')
      return
    }

    if (paymentMethod === 'crypto' && !forcePretixRedirect && (!isConnected || !address)) {
      setPurchaseError('Please connect your wallet first')
      return
    }

    setPurchaseLoading(true)
    setPurchaseError(null)
    setPaymentStatus('Creating order...')

    if (paymentMethod === 'fiat') {
      await handleFiatCheckout()
    } else if (forcePretixRedirect) {
      await handleFiatCheckout('walletconnect')
    } else {
      await handleCryptoCheckout()
    }

    setPurchaseLoading(false)
  }

  async function fetchPaymentOptions(overrides?: { paymentReference: string; walletAddress: string }) {
    const ref = overrides?.paymentReference ?? paymentDetails?.paymentReference
    const addr = overrides?.walletAddress ?? address
    if (!ref || !addr) return
    setPaymentOptionsLoading(true)
    try {
      const optRes = await fetch('/api/x402/tickets/payment-options/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentReference: ref,
          walletAddress: addr,
        }),
      })
      const optData = await optRes.json()
      if (optData.options) {
        setPaymentOptions(optData.options)
      }
    } catch {
      // keep existing options on error
    }
    setPaymentOptionsLoading(false)
  }

  async function handleCryptoCheckout() {
    try {
      const formattedAnswers = buildFormattedAnswers()
      // Freeze the payer at flow-start. Multisig Safe co-signers may swap
      // wallets after the first signature, dropping the WC session and
      // zeroing useAccount().address — but the on-chain tx mines under this
      // (Safe) address regardless. verifyPayment reads from the ref so that
      // post-disconnect verify keeps working.
      payerAddressRef.current = address ?? null

      // Build add-ons array from selections
      const addons = Array.from(selectedAddons.entries())
        .filter(([_, data]) => data.quantity > 0)
        .map(([itemId, data]) => ({ itemId, quantity: data.quantity, ...(data.variationId && { variationId: data.variationId }) }))

      const res = await fetch('/api/x402/tickets/purchase/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          intendedPayer: address!,
          tickets: cartItems.map(c => ({ itemId: c.ticketId, quantity: c.quantity })),
          ...(addons.length > 0 && { addons }),
          ...(voucherData?.valid && voucherInput && { voucher: voucherInput }),
          answers: formattedAnswers,
          attendee: {
            ...(attendeeNameAsked && (firstName.trim() || lastName.trim()) && { name: { given_name: firstName, family_name: lastName } }),
            email,
          },
        }),
      })

      const data = await res.json()
      if (data.success && data.paymentRequired) {
        const payment = data.paymentDetails.payment
        setPaymentDetails(payment)
        setOrderSummary(data.orderSummary)
        setPaymentStatus(null)
        setSelectedOption(null)
        setPaymentOptions([])
        setTokenFilter(null)
        tokenFilterAutoSelectedRef.current = false

        if (isConnected && address) {
          await fetchPaymentOptions({
            paymentReference: payment.paymentReference,
            walletAddress: address,
          })
        }
      } else {
        // Per-event x402 toggle (plugin Fix 1) returns 404 with this exact
        // error string when an admin has disabled crypto checkout for the
        // event. Surface a clear message + flip the suppress-flag so the
        // auto-checkout effect doesn't immediately re-trigger on re-render.
        if (res.status === 404 && /x402 flow not enabled/i.test(data.error || '')) {
          setCryptoDisabledForEvent(true)
          setPurchaseError(
            'Crypto checkout is currently unavailable for this event. ' +
            'Please switch to card payment, or contact support if crypto was advertised for your purchase.'
          )
        } else {
          setPurchaseError(data.error || 'Failed to create purchase')
        }
        setPaymentStatus(null)
      }
    } catch {
      setPurchaseError('Failed to create purchase. Please try again.')
      setPaymentStatus(null)
    }
  }

  async function handleFiatCheckout(paymentProvider?: 'stripe' | 'walletconnect') {
    try {
      const formattedAnswers = buildFormattedAnswers()

      // Build add-ons array from selections
      const addons = Array.from(selectedAddons.entries())
        .filter(([_, data]) => data.quantity > 0)
        .map(([itemId, data]) => ({ itemId, quantity: data.quantity, ...(data.variationId && { variationId: data.variationId }) }))

      const res = await fetch('/api/x402/tickets/fiat-purchase/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          tickets: cartItems.map(c => ({ itemId: c.ticketId, quantity: c.quantity })),
          ...(addons.length > 0 && { addons }),
          ...(voucherData?.valid && voucherInput && { voucher: voucherInput }),
          answers: formattedAnswers,
          attendee: {
            ...(attendeeNameAsked && (firstName.trim() || lastName.trim()) && { name: { given_name: firstName, family_name: lastName } }),
            email,
          },
          ...(paymentProvider && { paymentProvider }),
        }),
      })

      const data = await res.json()
      if (data.success && data.paymentUrl) {
        // Build return URL pointing to the order confirmation page on the current domain
        const locale = router.locale || 'en'
        const returnPath = `/${locale}/tickets/store/order/${data.orderCode}/${data.orderSecret}/`
        const returnUrl = `${window.location.origin}${returnPath}`
        const separator = data.paymentUrl.includes('?') ? '&' : '?'
        const paymentUrlWithReturn = `${data.paymentUrl}${separator}return_url=${encodeURIComponent(returnUrl)}`

        setIsRedirecting(true)
        setPaymentStatus('Redirecting to payment...')
        localStorage.removeItem('devcon-ticket-cart')
        if (newsletter) {
          navigator.sendBeacon(
            '/api/subscribe/',
            new Blob([JSON.stringify({ email: email.trim() })], { type: 'application/json' })
          )
        }
        await new Promise(resolve => setTimeout(resolve, 1500))
        window.location.href = paymentUrlWithReturn
      } else {
        setPurchaseError(data.error || 'Failed to create order')
        setPaymentStatus(null)
      }
    } catch {
      setPurchaseError('Failed to create order. Please try again.')
      setPaymentStatus(null)
    }
  }

  async function initiateGaslessPayment(details: PaymentDetails) {
    if (!address || !walletClient) return

    setPaymentStatus('Preparing authorization...')
    setPurchaseError(null)
    setDirectSignError(null)
    setIsSigningDirect(true)

    try {
      const prepareRes = await fetch('/api/x402/tickets/relayer/prepare-authorization/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentReference: details.paymentReference,
          from: address,
        }),
      })

      const prepareData = await prepareRes.json()
      if (!prepareData.success) {
        setPurchaseError(prepareData.error || 'Failed to prepare authorization')
        setPaymentStatus(null)
        setIsSigningDirect(false)
        return
      }

      setAuthorizationData(prepareData)

      const { domain, types, primaryType, message } = prepareData.typedData
      setPaymentStatus(`Sign ${walletLocationPhrase(connectionKind, connectedWalletName)}…`)

      const signature = await signEIP712Direct({ domain, types, primaryType, message })

      setIsSigningDirect(false)
      await executeGaslessTransfer(signature, prepareData.authorization)
    } catch (e) {
      setDirectSignError(humanizeWalletError(e))
      setPaymentStatus(null)
      setIsSigningDirect(false)
    }
  }

  async function executeGaslessTransfer(
    signature: string,
    authorizationOverride?: {
      from: string
      to: string
      value: string
      validAfter: number
      validBefore: number
      nonce: string
    }
  ) {
    const auth = authorizationOverride ?? authorizationData?.authorization
    if (!auth || !paymentDetails) return

    setIsExecutingGasless(true)
    setPurchaseError(null)
    setPaymentStatus('Executing transfer...')

    try {
      const sigHex = signature.startsWith('0x') ? signature : `0x${signature}`
      // For EOA (65 bytes / 132 hex chars): split into v/r/s
      // For smart wallets (ERC-1271, >65 bytes): send full raw signature
      const isSmartWallet = sigHex.length > 132
      const body: Record<string, unknown> = {
        paymentReference: paymentDetails.paymentReference,
        authorization: auth,
        chainId: paymentDetails.chainId,
        tokenAddress: paymentDetails.tokenAddress,
        symbol: paymentDetails.tokenSymbol,
      }
      if (isSmartWallet) {
        body.rawSignature = sigHex
      } else {
        const r = sigHex.slice(0, 66)
        const s = '0x' + sigHex.slice(66, 130)
        const v = parseInt(sigHex.slice(130, 132), 16)
        body.signature = { v, r, s }
      }

      const maxRetries = 3
      let lastError = 'Failed to execute transfer'

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const executeRes = await fetch('/api/x402/tickets/relayer/execute-transfer/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        const executeData = await executeRes.json()
        if (executeData.success) {
          setTxHash(executeData.txHash)
          // Clear the gasless-executing flag before verification so a
          // verification timeout doesn't leave the UI stuck in "Processing"
          // (which also disables the Retry verification button).
          setIsExecutingGasless(false)
          await verifyPayment(executeData.txHash)
          return
        }

        // 502 = non-retryable service error (relayer drained, etc.) — show
        //       operator-facing message immediately, don't hammer the server.
        // 503 = transient (gas cap exceeded, network busy) — auto-retry with backoff.
        if (executeRes.status === 503 && attempt < maxRetries) {
          const retryAfter = parseInt(executeRes.headers.get('Retry-After') || '15', 10)
          const delay = retryAfter * 1000 * (attempt + 1)
          setPaymentStatus(`Network is busy, retrying in ${Math.round(delay / 1000)}s... (attempt ${attempt + 2}/${maxRetries + 1})`)
          await new Promise(r => setTimeout(r, delay))
          continue
        }

        // Non-retryable or final attempt — show user-friendly message
        lastError = humanizeRelayerError(executeData.error, executeData.category) || 'Failed to execute transfer'
        break
      }

      setPurchaseError(lastError)
      setPaymentStatus(null)
    } catch {
      setPurchaseError('Failed to execute transfer')
      setPaymentStatus(null)
    }
    setIsExecutingGasless(false)
  }

  function selectPaymentOption(option: PaymentOption) {
    if (!paymentDetails || !option.sufficient || !option.signingRequest) return
    setSelectedOption(option)
    const tokenAddress = tokenAddressFromOption(option)
    const chainIdNum = parseInt(option.chainId.replace(/^eip155:/, ''), 10)
    const amountFormatted =
      option.decimals >= 18
        ? formatEth(option.amount, 18)
        : (Number(option.amount) / 10 ** option.decimals).toFixed(2)
    setPaymentDetails({
      ...paymentDetails,
      network: option.chain,
      chainId: chainIdNum,
      tokenAddress: tokenAddress || paymentDetails.tokenAddress,
      tokenSymbol: option.symbol,
      tokenDecimals: option.decimals,
      amount: option.amount,
      amountFormatted,
    })
    if (chain?.id !== chainIdNum && switchChain) {
      switchChain({ chainId: chainIdNum })
    }
  }

  async function payWithSelectedOption() {
    if (!selectedOption?.signingRequest || !paymentDetails || !address) return
    const req = selectedOption.signingRequest
    setPurchaseError(null)

    // Chain enforcement at pay-time. `selectPaymentOption` triggers a
    // fire-and-forget `switchChain` when the user picks a network, but
    // some WalletConnect wallets (Trust Wallet has been the worst
    // offender, also seen with Bitget Mobile and a few others) silently
    // drop or queue the `wallet_switchEthereumChain` request — so the
    // wallet stays on whatever chain it was already on (usually
    // Ethereum mainnet). Without this guard the buyer signs / broadcasts
    // on the wrong chain and the verify step fails with "no payment
    // detected on <selected chain>". Await the switch RIGHT before the
    // sign/send and surface a clear error if it doesn't take.
    //
    // The most common cause of a hard-fail on `switchChainAsync` is a WC
    // session whose namespaces only include Ethereum: Trust Wallet (and
    // sometimes Bitget) only show the first chain in the handshake UI,
    // so the buyer approves Ethereum only and the session lacks
    // permission for the chain we're now asking about. The fix from the
    // buyer's side is to disconnect and reconnect, approving all the
    // chains they see in the wallet's prompt — surface that explicitly
    // and prompt for a one-click disconnect via the error notice's
    // existing Disconnect button on the wallet card above.
    if (chain?.id !== paymentDetails.chainId) {
      try {
        setPaymentStatus(`Switching to ${selectedOption.chain} ${walletLocationPhrase(connectionKind, connectedWalletName)}…`)
        await switchChainAsync({ chainId: paymentDetails.chainId })
      } catch (e) {
        setPaymentStatus(null)
        const wcSession = connectionKind === 'walletConnect'
        setPurchaseError(
          wcSession
            ? `Your wallet refused to switch to ${selectedOption.chain}. This usually means the WalletConnect session was approved for Ethereum only. Disconnect using the button above and reconnect — when your wallet shows the connection prompt, approve all the networks listed (not just Ethereum), then retry the payment.`
            : `Couldn't switch your wallet to ${selectedOption.chain}. Please switch manually in your wallet and try again.`,
        )
        return
      }
    }

    if (req.method === 'eth_signTypedData_v4') {
      if (!walletClient) {
        setPurchaseError('Wallet not connected')
        return
      }
      setIsSigningDirect(true)
      setDirectSignError(null)
      try {
        const typedJson = req.params[1] as string
        const typed = JSON.parse(typedJson)
        setPaymentStatus(`Sign ${walletLocationPhrase(connectionKind, connectedWalletName)}…`)

        const signature = await signEIP712Direct({
          domain: typed.domain,
          types: typed.types,
          primaryType: typed.primaryType,
          message: typed.message,
        })

        setIsSigningDirect(false)
        // Extract authorization and execute
        const auth = {
          from: typed.message.from,
          to: typed.message.to,
          value: String(typed.message.value),
          validAfter: Number(typed.message.validAfter),
          validBefore: Number(typed.message.validBefore),
          nonce: typed.message.nonce,
        }
        await executeGaslessTransfer(signature, auth)
      } catch (e) {
        setDirectSignError(humanizeWalletError(e))
        setPaymentStatus(null)
        setIsSigningDirect(false)
      }
      return
    }

    if (req.method === 'eth_sendTransaction') {
      const tx = req.params[0] as { to: string; value: string; data?: string; chainId?: string }
      if (!tx?.to || tx?.value === undefined) {
        setPurchaseError('Invalid transaction request')
        return
      }
      if (!walletClient) {
        setPurchaseError('Wallet not connected')
        return
      }

      // Sign a payer-proof message BEFORE sending the tx. Binds the wallet to
      // this specific paymentReference+chain so the /verify endpoint can
      // cryptographically confirm the caller owns the payer address (and is
      // not replaying someone else's on-chain tx for a different order).
      //
      // Use the frozen payer address (from handleCryptoCheckout) — NOT the
      // live `useAccount().address`. MM Mobile + WC has been observed to
      // flip the active account between handleCryptoCheckout and this sign
      // call (e.g. user accepts a "Speed Up" prompt that re-establishes the
      // session). If the signed message embeds the live address but verify
      // sends the frozen one, the backend rebuilds a different message,
      // ECDSA recovery fails, and we get "ethPayerSignature does not match".
      const payerForSig = payerAddressRef.current ?? address
      if (!payerForSig) {
        setPurchaseError('Payer address unavailable — please reconnect your wallet.')
        setPaymentStatus(null)
        return
      }
      const chainIdForSig = Number(paymentDetails.chainId)
      const payerMessage =
        'Devcon ticket payment (ETH)\n' +
        `Payment reference: ${paymentDetails.paymentReference}\n` +
        `Payer: ${payerForSig}\n` +
        `Chain: ${chainIdForSig}`
      setPaymentStatus(`Sign payer proof ${walletLocationPhrase(connectionKind, connectedWalletName)}…`)
      let sig: string
      try {
        sig = await walletClient.signMessage({
          account: payerForSig as `0x${string}`,
          message: payerMessage,
        })
      } catch (e) {
        setPurchaseError(humanizeWalletError(e))
        setPaymentStatus(null)
        return
      }
      ethPayerSignatureRef.current = sig
      setEthPayerSignature(sig)
      // Debug telemetry: log everything needed to reproduce a verification
      // mismatch. Recovers the signing address client-side via viem so we
      // can compare against `payerForSig` and tell at a glance whether the
      // wallet signed with a different account than expected (the classic
      // MM Mobile + WC bug).
      try {
        const { recoverMessageAddress } = await import('viem')
        const recovered = await recoverMessageAddress({
          message: payerMessage,
          signature: sig as `0x${string}`,
        })
        console.info('[checkout] ethPayerSignature collected', {
          expectedPayer: payerForSig,
          recovered,
          match: recovered.toLowerCase() === payerForSig.toLowerCase(),
          chainIdForSig,
          paymentReference: paymentDetails.paymentReference,
          message: payerMessage,
          signature: sig,
          sigLength: sig.length,
        })
      } catch (logErr) {
        console.info('[checkout] ethPayerSignature collected (recover failed)', {
          expectedPayer: payerForSig,
          chainIdForSig,
          paymentReference: paymentDetails.paymentReference,
          message: payerMessage,
          signature: sig,
          sigLength: sig.length,
          recoverError: logErr instanceof Error ? logErr.message : String(logErr),
        })
      }

      setPaymentStatus(`Confirm ${walletLocationPhrase(connectionKind, connectedWalletName)}…`)
      try {
        // The typical Safe flow (paste WC URI from app.safe.global into
        // Reown's modal) reports `connector.id === 'walletConnect'`, NOT
        // 'safe' — so connector-only detection misses it. We pair the
        // connector check with `isSafeAddress`, which is set by the
        // Safe-Tx-Service probe in the connect-time effect (it returns 200
        // only for actual Safes). Earlier versions used `isSmartWallet`
        // here (any address with non-empty bytecode), but that also
        // matched EIP-7702-delegated EOAs (Rainbow and others ship this
        // for some users) and non-Safe ERC-4337 wallets, both of which
        // return a real on-chain tx hash from `sendTransaction` and don't
        // need Safe-Tx-Service translation — gating on `isSafeAddress`
        // keeps the Safe-specific path narrowly scoped to Safes.
        const isSafePath = isSafeWallet(connector) || isSafeAddress
        if (isSafePath) {
          // Safe wraps eth_sendTransaction differently — the wallet returns a
          // *safeTxHash* (off-chain hash of the Safe tx object) almost
          // immediately, so the WC-hash-not-returned bug doesn't apply and
          // the recovery watchdog would only confuse things. Use the bare
          // sendTransactionAsync and translate via Safe Tx Service.
          const sentHash = await sendTransactionAsync({
            to: tx.to as `0x${string}`,
            value: BigInt(tx.value),
            data: (tx.data as `0x${string}`) || '0x',
          })
          setPaymentStatus('Waiting for Safe to execute the transaction...')
          try {
            const realHash = await pollSafeTxService(paymentDetails.chainId, sentHash)
            setTxHash(realHash)
            await verifyPayment(realHash)
          } catch (err) {
            setPurchaseError(
              err instanceof Error
                ? err.message
                : 'Could not retrieve the on-chain transaction from your Safe — please try again or contact support.'
            )
            setPaymentStatus(null)
          }
        } else {
          // Normal EOA: route through the recovery wrapper so wallets that
          // broadcast but fail to return the hash via WC (Binance Wallet
          // macOS, etc.) don't strand the UI. If recovery wins (via Alchemy
          // discovery or manual hash entry), the wrapper triggers verify
          // internally — no further work here. If the wallet wins, the
          // existing useWaitForTransactionReceipt useEffect handles verify.
          await sendNativeEthWithRecovery({
            to: tx.to as `0x${string}`,
            value: BigInt(tx.value),
            data: (tx.data as `0x${string}`) || '0x',
            chainId: paymentDetails.chainId,
            payer: payerForSig,
          })
        }
      } catch (e) {
        setPurchaseError(humanizeWalletError(e))
        setPaymentStatus(null)
      }
    }
  }

  async function verifyPayment(hash: string) {
    // Use the frozen payer (set at flow-start in handleCryptoCheckout) as the
    // primary source — survives multisig Safe co-signer wallet swaps that
    // disconnect the live wagmi session. Falls back to live `address` for
    // legacy code paths that didn't run through handleCryptoCheckout.
    const payer = payerAddressRef.current ?? address ?? null
    if (!paymentDetails || !payer) return

    // De-dupe concurrent calls for the same hash (e.g. recovery path triggers
    // verify, then wagmi's receipt useEffect fires for the same hash a few
    // seconds later). Allow re-entry only for a different hash (replacement /
    // speed-up case).
    if (verifyingHashRef.current === hash) return
    verifyingHashRef.current = hash

    setIsVerifying(true)
    setPaymentStatus('Verifying payment...')
    setPurchaseError(null)
    setConfirmProgress(null)

    // Adaptive cadence keyed off the chain's block time. We don't know the
    // required-confirmations count until the first server response, so the
    // initial budget assumes 3 confs and is recomputed once we learn the
    // actual threshold. Loop is time-bounded — stops on success, hard
    // failure, or budget exhaustion.
    const interval = pollIntervalMs(paymentDetails.chainId)
    let budget = pollMaxDurationMs(paymentDetails.chainId, 3)
    const startedAt = Date.now()
    let firstAttempt = true

    // Reasons the server returns 4xx that resolve on their own as the chain
    // mines more blocks or the backend RPC catches up. Anything outside this
    // set is a hard failure (wrong recipient, signature mismatch, etc.) and
    // should bail immediately rather than waste polls.
    const RETRYABLE_SUBSTRINGS = [
      'not found',
      'try again',
      'not mined',
      'insufficient confirmations',
      'rpc error',
      'no matching internal transfer',
      'no matching transfer found',
      'from/to mismatch',
    ]

    while (Date.now() - startedAt < budget) {
      if (!firstAttempt) {
        await new Promise(r => setTimeout(r, interval))
      }
      firstAttempt = false

      try {
        const res = await fetch('/api/x402/tickets/verify/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txHash: hash,
            paymentReference: paymentDetails.paymentReference,
            payer,
            chainId: paymentDetails.chainId,
            symbol: paymentDetails.tokenSymbol,
            tokenAddress: paymentDetails.tokenAddress,
            // Read from the ref FIRST: the Safe ETH path runs sign → send →
            // pollSafeTxService → verifyPayment all inside one async closure
            // with no re-render in between, so the state-derived
            // `ethPayerSignature` here is the *previous* render's value (i.e.,
            // empty) and the field would be omitted. The ref is updated
            // synchronously alongside setState so callers in the same chain
            // see the right value.
            ...(paymentDetails.tokenSymbol === 'ETH' &&
              (ethPayerSignatureRef.current || ethPayerSignature) && {
                ethPayerSignature: ethPayerSignatureRef.current || ethPayerSignature,
              }),
          }),
        })

        const data = await res.json()
        if (data.success) {
          setConfirmProgress(null)
          setPaymentStatus('Payment confirmed — redirecting to your order...')
          setPaymentSucceeded(true)
          localStorage.removeItem('devcon-ticket-cart')
          if (newsletter) {
            fetch('/api/subscribe/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email.trim() }),
            }).catch(() => {})
          }
          router.push(`/tickets/store/order/${data.order.code}/${data.order.secret}`)
          return
        }

        const msg = `${data.error || ''} ${data.details || ''}`.toLowerCase()
        // Rate-limit (429) is a transient throttle, not a hard failure. Back
        // off for a few seconds so we don't burn the next polling slot
        // immediately, then continue the loop. Without this the user sees the
        // same 429 on every Retry click until the server window expires.
        if (res.status === 429 || msg.includes('rate limit')) {
          setPaymentStatus('Verifying — slowing down briefly to respect rate limit...')
          await new Promise(r => setTimeout(r, 8000))
          continue
        }
        const isRetryable = RETRYABLE_SUBSTRINGS.some(s => msg.includes(s))
        if (!isRetryable) {
          setConfirmProgress(null)
          setPurchaseError(data.error || 'Payment verification failed')
          setPaymentStatus(null)
          setIsVerifying(false)
          verifyingHashRef.current = null
          return
        }

        // Surface confirmation progress when the plugin tells us how far
        // along we are. The status string drives the UI label so the user
        // sees the chain making progress instead of an opaque spinner.
        const cur = typeof data.confirmations === 'number' ? data.confirmations : null
        const req = typeof data.confirmations_required === 'number' ? data.confirmations_required : null
        if (cur !== null && req !== null) {
          setConfirmProgress({ current: cur, required: req })
          setPaymentStatus(`Confirming on-chain (${cur}/${req})...`)
          // Recompute the time budget now that we know the chain's threshold.
          budget = pollMaxDurationMs(paymentDetails.chainId, req)
        } else {
          // Tx not mined yet, or some other transient — keep the generic msg.
          setPaymentStatus('Waiting for transaction to be mined...')
        }
      } catch {
        // Network blip / fetch failure — let the loop retry on next interval.
      }
    }

    setConfirmProgress(null)
    setPurchaseError('Verification timed out — try the Retry button below or contact support.')
    setPaymentStatus(null)
    setIsVerifying(false)
    verifyingHashRef.current = null
  }

  // ── Checkout button state ──
  // forcePretixRedirect mode hands wallet-connection over to Pretix's hosted
  // checkout, so devcon doesn't require a local wallet for the crypto path.
  const checkoutEnabled = contactDetailsFilled && cartItems.length > 0 && !isProcessing && (paymentMethod === 'fiat' || forcePretixRedirect || isConnected)

  // Build the support-mailto once with all known checkout context. Used by
  // both the persistent "Need help?" link below the Pay button and the two
  // "If you don't receive a confirmation email, please contact us" notes.
  // Single source of truth keeps the prefill template identical everywhere.
  function buildSupportMailto(): string {
    if (!supportEmail) return ''
    const fill = (v: string | number | undefined | null) =>
      v == null || v === '' ? '(please fill in)' : String(v)
    const cartLines = cartItems
      .filter(c => c.quantity > 0)
      .map(c => `  - ${c.quantity} × ${c.name}`)
    const lines: string[] = [
      'Hi,',
      '',
      'I need help with my Devcon ticket purchase.',
      '',
      `Email: ${fill(email)}`,
      `Payment method: ${paymentMethod || '(please fill in)'}`,
      ...(cartLines.length ? ['Cart:', ...cartLines] : ['Cart: (please describe)']),
      `Order total (USD): $${fill(totalUsd)}`,
    ]
    if (paymentMethod === 'crypto') {
      lines.push(
        `Wallet address: ${fill(address || '')}`,
        `Payment reference: ${fill(paymentDetails?.paymentReference)}`,
        `Network: ${fill(paymentDetails?.network)}`,
        `Token: ${fill(paymentDetails?.tokenSymbol)}`,
        `Amount expected: ${fill(paymentDetails?.amountFormatted)}`,
        `Recipient: ${fill(paymentDetails?.recipient)}`,
        `Transaction hash: ${fill(txHash)}`,
      )
    }
    lines.push('', 'What went wrong: (please describe)', '', 'Thanks!')
    const subject = `Devcon ticket support${paymentDetails?.paymentReference ? ` — ref ${paymentDetails.paymentReference}` : ''}`
    return `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
  }
  const supportMailto = buildSupportMailto()

  return (
    <Page theme={themes['tickets']} hideFooter darkHeader>
      {/* Mobile order summary sticky bar */}
      {cartItems.length > 0 && (
        <div className={css['mobile-order-wrapper']}>
          <button
            type="button"
            className={css['mobile-order-bar']}
            onClick={() => setMobileOrderOpen(!mobileOrderOpen)}
          >
            <span className={css['mobile-order-bar-left']}>
              <span>Order summary</span>
              {mobileOrderOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </span>
            <span className={css['mobile-order-bar-total']}>
              <span>${totalUsd}</span>
              {!mobileOrderOpen && showGstBreakdown && (
                <span className={css['mobile-order-bar-tax']}>
                  incl. {vatPercent}% {vatLabel}
                </span>
              )}
            </span>
          </button>
          {mobileOrderOpen && (
            <div className={css['mobile-order-expanded']}>
              <div className={css['mobile-order-content']}>
                <div className={css['panel-items']}>
                  {cartItems.length > 0 ? (
                    cartItems.map(item => {
                      const isPaid = parseFloat(item.price) > 0
                      return (
                        <div key={item.ticketId} className={css['panel-item']}>
                          <span className={css['panel-item-name']}>
                            {item.name}
                            {isPaid && vatPercent > 0 && (
                              <span className={css['panel-item-tax']}>
                                {' '}
                                ({vatLabel} {vatPercent}%)
                              </span>
                            )}
                          </span>
                          <div className={css['panel-item-right']}>
                            <span>x{item.quantity}</span>
                            <span className={css['panel-item-price']}>
                              ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className={css['panel-item']}>
                      <span className={css['panel-item-name']}>No tickets selected</span>
                      <div className={css['panel-item-right']}>
                        <span className={css['panel-item-price']}>$0.00</span>
                      </div>
                    </div>
                  )}
                  {Array.from(selectedAddons.entries()).map(([itemId, data]) => {
                    const item = allAddonItems.find(i => i.id === itemId)
                    if (!item || data.quantity <= 0) return null
                    const cat = addonCategoryByItemId.get(itemId)
                    let price = cat?.priceIncluded ? 0 : parseFloat(item.price)
                    let variationName = ''
                    if (data.variationId) {
                      const variation = item.variations.find(v => v.id === data.variationId)
                      if (variation) {
                        if (!cat?.priceIncluded) price = parseFloat(variation.price)
                        variationName = variation.name
                      }
                    }
                    const isFree = price === 0
                    const lineTotal = price * data.quantity
                    return (
                      <div key={itemId} className={css['panel-item']}>
                        <div className={css['panel-item-name']}>
                          <span>
                            {item.name}
                            {!isFree && vatPercent > 0 && (
                              <span className={css['panel-item-tax']}>
                                {' '}
                                ({vatLabel} {vatPercent}%)
                              </span>
                            )}
                          </span>
                          {variationName && <span className={css['panel-item-meta']}>{variationName}</span>}
                        </div>
                        <div className={css['panel-item-right']}>
                          <span>x{data.quantity}</span>
                          <span className={css['panel-item-price']}>
                            {isFree ? 'FREE' : `$${lineTotal.toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {voucherData?.valid && (
                  <div className={css['discount-applied']}>
                    <div className={css['discount-applied-info']}>
                      <CheckCircle className={css['discount-check-icon']} />
                      <div className={css['discount-applied-text']}>
                        <span className={css['discount-code-line']}>
                          <strong>CODE: </strong>
                          {voucherInput.length > 12
                            ? `${voucherInput.slice(0, 4)}...${voucherInput.slice(-4)}`
                            : voucherInput}
                        </span>
                        {voucherDiscount > 0 && (
                          <span className={css['discount-savings']}>Save: ${voucherDiscount.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={css['discount-remove-btn']}
                      onClick={() => {
                        setVoucherInput('')
                        setVoucherData(null)
                        setVoucherError(null)
                        setDiscountOpen(false)
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
                <div className={css['summary-lines']}>
                  <div className={css['summary-line']}>
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {voucherDiscount > 0 && (
                    <div className={`${css['summary-line']} ${css['summary-line-indent']}`}>
                      <span>Voucher discount</span>
                      <span>&ndash;${voucherDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {cryptoDiscount > 0 && (
                    <div className={`${css['summary-line']} ${css['summary-line-indent']}`}>
                      <span>Crypto discount (&ndash;{cryptoDiscountPercent}%)</span>
                      <span>&ndash;${cryptoDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {showGstBreakdown && (
                    <>
                      <div className={css['summary-line']}>
                        <span>Total excl. {vatLabel}</span>
                        <span>${totalExclGst.toFixed(2)}</span>
                      </div>
                      <div className={`${css['summary-line']} ${css['summary-line-indent']}`}>
                        <span>
                          {vatLabel} @ {vatPercent}%
                        </span>
                        <span>${gstAmount.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className={css['summary-total']}>
                    <span>Total</span>
                    <div className={css['summary-total-values']}>
                      {paymentMethod === 'crypto' && selectedOption && (
                        <span className={css['summary-eth']}>
                          <span className={css['summary-currency-label']}>{displaySymbol(selectedOption.symbol)}</span>
                          <span className={css['summary-currency-value']}>
                            {selectedOption.decimals >= 18
                              ? formatEth(selectedOption.amount, 18)
                              : (Number(selectedOption.amount) / 10 ** selectedOption.decimals).toFixed(2)}
                          </span>
                        </span>
                      )}
                      <span className={css['summary-usd']}>
                        <span className={css['summary-currency-label']}>USD</span>
                        <span className={css['summary-currency-value']}>${totalUsd}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className={css['panel-disclaimer']}>
                  <p>
                    An order confirmation with your tickets will be sent to the email provided during checkout. If you
                    don&apos;t receive a confirmation email, please{' '}
                    <a href={supportMailto || `mailto:${supportEmail}`}>
                      <strong>contact us</strong>
                    </a>
                    .
                  </p>
                  <p>
                    Got a question?{' '}
                    <Link to="/tickets/faq">
                      <strong>Read our ticketing FAQs</strong>
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <div className={css['checkout-layout']}>
        <main className={css['main']}>
          <Link to="/tickets/store" className={css['back-link']}>
            <ArrowLeft size={24} />
            <span>Back</span>
          </Link>
          <h1 className={css['page-title']}>Checkout</h1>

          {cartItems.length === 0 && mounted && (
            <div className={css['section-card']}>
              <div className={css['section-body']}>
                <div className={css['description-block']}>
                  <p className={css['description-title']}>Your cart is empty</p>
                  <p className={css['description-sub']}>
                    You haven&apos;t selected any tickets yet. Head back to the store to pick your tickets.
                  </p>
                </div>
                <Link to="/tickets/store" className={css['btn-continue']}>
                  Browse tickets
                </Link>
              </div>
            </div>
          )}

          {/* Add-ons (dynamic from Pretix) */}
          {cartItems.length > 0 && availableAddons.length > 0 && (
            <div className={css['section-card']}>
              <button
                type="button"
                className={`${css['section-header']} ${openSection !== 'swag' ? css['section-header-collapsed'] : ''}`}
                onClick={() => toggleSection('swag')}
                aria-expanded={openSection === 'swag'}
              >
                <span>Swag &amp; Add-ons</span>
                {openSection === 'swag' ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
              </button>
              {openSection === 'swag' && (
                <div className={css['section-body']}>
                  {(() => {
                    type AddonItem = TicketInfo['addons'][number]['items'][number]
                    type AddonCategory = TicketInfo['addons'][number]
                    const freeItems: { item: AddonItem; category: AddonCategory }[] = []
                    const paidItems: { item: AddonItem; category: AddonCategory }[] = []
                    for (const category of availableAddons) {
                      for (const item of category.items.filter(i => i.available)) {
                        // Free either because the item is intrinsically free OR because the
                        // parent ticket's addon entry has `price_included: true` (Pretix's
                        // server side already charges $0 for these — surface that to buyers).
                        if (category.priceIncluded || parseFloat(item.price) === 0) {
                          freeItems.push({ item, category })
                        } else {
                          paidItems.push({ item, category })
                        }
                      }
                    }

                    // Total quantity already selected across all items in a given
                    // category — Pretix `max_count` caps the SUM across items, not
                    // per-item. e.g. premium category with max_count=2 + multi_allowed=false
                    // means the buyer can pick 1 shirt + 1 chess set, but never a 2nd of
                    // either AND never both at once if the cap is already hit.
                    const categoryQtyTotals = new Map<number, number>()
                    for (const cat of availableAddons) {
                      let total = 0
                      for (const it of cat.items) {
                        total += selectedAddons.get(it.id)?.quantity || 0
                      }
                      categoryQtyTotals.set(cat.categoryId, total)
                    }

                    const renderItem = (item: AddonItem, category: AddonCategory) => {
                      const sel = selectedAddons.get(item.id)
                      const qty = sel?.quantity || 0
                      const isFree = category.priceIncluded || parseFloat(item.price) === 0
                      const hasVariations = item.variations.length > 0
                      // Effective per-item cap: 1 when multi_allowed=false (default for
                      // premium swag), otherwise the category's max_count.
                      const perItemCap = category.multiAllowed ? category.maxCount : 1
                      // Category running total — disable + on this item once the category
                      // sum has reached max_count, even if this specific item is still under
                      // its per-item cap.
                      const categoryTotal = categoryQtyTotals.get(category.categoryId) ?? 0
                      const categoryRoom = category.maxCount - categoryTotal
                      const canIncrement = qty < perItemCap && categoryRoom > 0
                      const showQty = isFree || hasVariations || category.maxCount > 1
                      return (
                        <div key={item.id} className={css['swag-card']}>
                          {item.picture ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className={css['swag-image']} src={item.picture} alt={item.name} />
                          ) : (
                            <div className={css['swag-image']} />
                          )}
                          <div className={css['swag-info']}>
                            <h4>{item.name}</h4>
                            {item.description && (
                              <div className={css['addon-description']}>
                                <Markdown
                                  components={{
                                    p: ({ children }) => <p style={{ margin: 0 }}>{children}</p>,
                                    a: ({ href, children }) => (
                                      <a href={href} target="_blank" rel="noopener noreferrer">
                                        {children}
                                      </a>
                                    ),
                                  }}
                                >
                                  {item.description}
                                </Markdown>
                              </div>
                            )}
                          </div>
                          <div className={css['swag-controls-cell']}>
                            <div className={css['swag-controls']}>
                              {showQty ? (
                                <div className={css['addon-qty']}>
                                  <button
                                    type="button"
                                    className={css['addon-qty-btn']}
                                    onClick={() => setAddonQuantity(item.id, qty - 1)}
                                    disabled={qty <= 0}
                                  >
                                    <Minus size={16} />
                                  </button>
                                  <span className={css['addon-qty-value']}>{qty}</span>
                                  <button
                                    type="button"
                                    className={css['addon-qty-btn']}
                                    onClick={() => setAddonQuantity(item.id, qty + 1)}
                                    disabled={!canIncrement}
                                  >
                                    <Plus size={16} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`addon-${item.id}`}
                                    checked={qty > 0}
                                    onCheckedChange={() => toggleAddon(item.id)}
                                  />
                                  <Label
                                    htmlFor={`addon-${item.id}`}
                                    className="text-sm text-black/70 cursor-pointer"
                                  >
                                    {qty > 0 ? 'Added' : 'Add'}
                                  </Label>
                                </div>
                              )}
                              {hasVariations && (
                                <div className={css['swag-variation']}>
                                  <Select
                                    value={sel?.variationId ? String(sel.variationId) : ''}
                                    onValueChange={val => {
                                      setAddonVariation(item.id, val ? Number(val) : undefined)
                                    }}
                                  >
                                    <SelectTrigger
                                      data-addon-variation-id={item.id}
                                      className={`min-w-[140px] h-10 text-sm ${
                                        showSwagErrors && qty > 0 && !sel?.variationId
                                          ? 'border-[#ef4444] shadow-none'
                                          : ''
                                      }`}
                                    >
                                      <SelectValue placeholder="Select size" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {item.variations.map(v => (
                                        <SelectItem key={v.id} value={String(v.id)}>
                                          {v.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {showSwagErrors && qty > 0 && !sel?.variationId && (
                                    <p className={css['field-error']}>Please select a size.</p>
                                  )}
                                </div>
                              )}
                            </div>
                            <span className={isFree ? css['swag-price-free'] : css['addon-price']}>
                              {isFree ? 'FREE' : `$${parseFloat(item.price).toFixed(2)}`}
                            </span>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <>
                        {freeItems.length > 0 && (
                          <div className={css['swag-group']}>
                            <h4 className={css['swag-group-title']}>Included with ticket</h4>
                            <div className={css['swag-grid']}>
                              {freeItems.map(({ item, category }) => renderItem(item, category))}
                            </div>
                          </div>
                        )}
                        {paidItems.length > 0 && (
                          <div className={css['swag-group']}>
                            <div className={css['swag-group-header']}>
                              <h4 className={css['swag-group-title']}>Premium items</h4>
                              <span className={css['swag-group-tag']}>LIMITED STOCK</span>
                            </div>
                            <div className={css['swag-grid']}>
                              {paidItems.map(({ item, category }) => renderItem(item, category))}
                            </div>
                          </div>
                        )}
                        <p className={css['swag-tax-note']}>
                          Prices include {TICKETING.tax.vatPercent}% {TICKETING.tax.label}
                        </p>
                      </>
                    )
                  })()}
                  <button
                    type="button"
                    className={css['btn-continue']}
                    onClick={() => {
                      // Validate: any addon picked at qty ≥ 1 with variations must have one selected.
                      const missing: number[] = []
                      for (const [itemId, data] of selectedAddons.entries()) {
                        if (data.quantity <= 0) continue
                        const item = allAddonItems.find(i => i.id === itemId)
                        if (!item || item.variations.length === 0) continue
                        if (!data.variationId) missing.push(itemId)
                      }
                      if (missing.length > 0) {
                        setShowSwagErrors(true)
                        setTimeout(() => {
                          document
                            .querySelector(`[data-addon-variation-id="${missing[0]}"]`)
                            ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }, 50)
                        return
                      }
                      setShowSwagErrors(false)
                      goToNextSection('swag')
                    }}
                  >
                    Continue
                  </button>
                </div>
              )}
            </div>
          )}

          {cartItems.length > 0 && (
            <>
              {/* Contact details */}
              <div className={css['section-card']}>
                <button
                  type="button"
                  className={`${css['section-header']} ${
                    openSection !== 'contact' ? css['section-header-collapsed'] : ''
                  }`}
                  onClick={() => toggleSection('contact')}
                  aria-expanded={openSection === 'contact'}
                >
                  <span>Contact details</span>
                  {openSection === 'contact' ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </button>
                {openSection === 'contact' && (
                  <div className={css['section-body']}>
                    {sectionWarning && (
                      <div className={`${css['payment-notice']} ${css['payment-notice-error']}`}>{sectionWarning}</div>
                    )}
                    <div className={css['description-block']}>
                      <p className={css['description-title']}>Where should we send your tickets?</p>
                      <p className={css['description-sub']}>
                        Your Devcon tickets will be linked with this{attendeeNameAsked ? ' name and' : ''} email
                        address.
                      </p>
                    </div>
                    {attendeeNameAsked && (
                      <div className={css['field-row']}>
                        <div className={css['field']}>
                          <label htmlFor="first-name">
                            Name{attendeeNameRequired && <span className={css['required']}>*</span>}
                          </label>
                          <Input
                            id="first-name"
                            type="text"
                            placeholder="First name"
                            className={
                              showContactErrors && attendeeNameRequired && firstName.trim() === ''
                                ? 'border-[#ef4444] shadow-none'
                                : ''
                            }
                            value={firstName}
                            onChange={e => setFirstName(e.target.value)}
                          />
                          {showContactErrors && attendeeNameRequired && firstName.trim() === '' && (
                            <p className={css['field-error']}>Please enter your first name.</p>
                          )}
                        </div>
                        <div className={css['field']}>
                          <label htmlFor="last-name" data-spacer="true">&nbsp;</label>
                          <Input
                            id="last-name"
                            type="text"
                            placeholder="Last name"
                            className={
                              showContactErrors && attendeeNameRequired && lastName.trim() === ''
                                ? 'border-[#ef4444] shadow-none'
                                : ''
                            }
                            value={lastName}
                            onChange={e => setLastName(e.target.value)}
                          />
                          {showContactErrors && attendeeNameRequired && lastName.trim() === '' && (
                            <p className={css['field-error']}>Please enter your last name.</p>
                          )}
                        </div>
                      </div>
                    )}
                    <div className={css['field-row']}>
                      <div className={css['field']}>
                        <label htmlFor="email">
                          Email<span className={css['required']}>*</span>
                        </label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter email"
                          className={showContactErrors && !isEmail(email.trim()) ? 'border-[#ef4444] shadow-none' : ''}
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                        />
                        {showContactErrors && !isEmail(email.trim()) && (
                          <p className={css['field-error']}>Please enter a valid email.</p>
                        )}
                      </div>
                      <div className={css['field']}>
                        <label htmlFor="confirm-email" data-spacer="true">&nbsp;</label>
                        <Input
                          id="confirm-email"
                          type="email"
                          placeholder="Confirm email"
                          className={
                            showContactErrors && (confirmEmail.trim() === '' || email.trim() !== confirmEmail.trim())
                              ? 'border-[#ef4444] shadow-none'
                              : ''
                          }
                          value={confirmEmail}
                          onChange={e => setConfirmEmail(e.target.value)}
                        />
                        {showContactErrors && confirmEmail.trim() !== '' && email.trim() !== confirmEmail.trim() && (
                          <p className={css['field-error']}>Emails do not match.</p>
                        )}
                        {showContactErrors && confirmEmail.trim() === '' && (
                          <p className={css['field-error']}>Please confirm your email.</p>
                        )}
                      </div>
                    </div>
                    <label className={css['rich-checkbox']}>
                      <Checkbox
                        checked={newsletter}
                        onCheckedChange={checked => setNewsletter(checked === true)}
                        className="mt-0.5"
                      />
                      <span className={css['rich-checkbox-content']}>
                        <span className={css['rich-checkbox-label']}>Subscribe to the Devcon newsletter</span>
                        <span className={css['rich-checkbox-desc']}>
                          Join &gt;16k subscribers and stay updated by getting the latest news delivered directly to
                          your inbox.
                        </span>
                      </span>
                    </label>
                    <button
                      type="button"
                      className={`${css['btn-continue']} ${!contactDetailsFilled ? css['btn-disabled'] : ''}`}
                      onClick={() => {
                        if (!contactDetailsFilled) {
                          setShowContactErrors(true)
                          setTimeout(() => {
                            const firstErrorId =
                              attendeeNameRequired && firstName.trim() === ''
                                ? 'first-name'
                                : attendeeNameRequired && lastName.trim() === ''
                                ? 'last-name'
                                : !isEmail(email.trim())
                                ? 'email'
                                : 'confirm-email'
                            document
                              .getElementById(firstErrorId)
                              ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          }, 50)
                          return
                        }
                        setShowContactErrors(false)
                        goToNextSection('contact')
                      }}
                    >
                      Continue
                    </button>
                  </div>
                )}
              </div>

              {/* Attendee information */}
              <div className={css['section-card']}>
                <button
                  type="button"
                  className={`${css['section-header']} ${
                    openSection !== 'attendee' ? css['section-header-collapsed'] : ''
                  }`}
                  onClick={() => toggleSection('attendee')}
                  aria-expanded={openSection === 'attendee'}
                >
                  <span>Attendee information</span>
                  {openSection === 'attendee' ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </button>
                {openSection === 'attendee' && (
                  <div className={css['section-body']}>
                    {sectionWarning && (
                      <div className={`${css['payment-notice']} ${css['payment-notice-error']}`}>{sectionWarning}</div>
                    )}
                    {applicableQuestions.map(q => {
                      // Check dependsOn — hide question if dependency not satisfied
                      if (!isDependencyMet(q)) return null

                      const isGoals = q.identifier === TICKETING.questions.goalsIdentifier
                      const hasError = showAttendeeErrors && (q.required || q.dependsOn) && isFieldEmpty(q.id)

                      // Hardcoded special-case: when a question's helpText contains the
                      // youth-ticket form URL, render the helpText as a highlighted box
                      // (Figma "Will you have Youth Tickets for sale?" accordion treatment)
                      // and only when the buyer answered Yes.
                      const isYouthHelper = !!q.helpText?.includes('https://devcon.org/en/form/youth-ticket/')
                      const yesOptionId =
                        q.type === 'C' ? q.options.find(o => /^\s*yes\s*$/i.test(o.answer || ''))?.id : undefined
                      const isAnswerYes =
                        (q.type === 'B' && answers[q.id] === 'True') ||
                        (q.type === 'C' && yesOptionId !== undefined && answers[q.id] === String(yesOptionId))

                      return (
                        <div key={q.id} className={css['field']} data-question-id={q.id}>
                          <label>
                            {q.question}
                            {(q.required || q.dependsOn) && <span className={css['required']}>*</span>}
                          </label>
                          {q.helpText && !isYouthHelper && (
                            <span className={css['field-help']}>
                              <Markdown
                                components={{
                                  p: ({ children }) => <>{children}</>,
                                  a: ({ href, children }) => (
                                    <a href={href} target="_blank" rel="noopener noreferrer">
                                      {children}
                                    </a>
                                  ),
                                }}
                              >
                                {q.helpText}
                              </Markdown>
                            </span>
                          )}

                          {/* Country select */}
                          {q.type === 'CC' && (
                            <Select value={(answers[q.id] as string) || ''} onValueChange={v => updateAnswer(q.id, v)}>
                              <SelectTrigger className={hasError ? 'border-[#ef4444] shadow-none' : ''}>
                                <SelectValue placeholder="Select a country" />
                              </SelectTrigger>
                              <SelectContent>
                                {COUNTRIES.map(c => (
                                  <SelectItem key={c.code} value={c.code}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          {/* Single choice — radio for Yes/No, dropdown otherwise */}
                          {q.type === 'C' && q.options.length <= 3 && (
                            <RadioGroup
                              value={(answers[q.id] as string) || ''}
                              onValueChange={v => updateAnswer(q.id, v)}
                              className="flex flex-col gap-3"
                            >
                              {q.options.map(opt => (
                                <div key={opt.id} className="flex items-center gap-2">
                                  <RadioGroupItem value={String(opt.id)} id={`q-${q.id}-opt-${opt.id}`} />
                                  <Label
                                    htmlFor={`q-${q.id}-opt-${opt.id}`}
                                    className="text-sm font-normal text-[#1a0d33] cursor-pointer"
                                  >
                                    {opt.answer}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          )}
                          {q.type === 'C' && q.options.length > 3 && (
                            <Select value={(answers[q.id] as string) || ''} onValueChange={v => updateAnswer(q.id, v)}>
                              <SelectTrigger className={hasError ? 'border-[#ef4444] shadow-none' : ''}>
                                <SelectValue placeholder={`Select an option`} />
                              </SelectTrigger>
                              <SelectContent>
                                {q.options.map(opt => (
                                  <SelectItem key={opt.id} value={String(opt.id)}>
                                    {opt.answer}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          {/* Goals — chip/tag toggle selection */}
                          {q.type === 'M' && isGoals && (
                            <div className={css['goals-grid']}>
                              {q.options.map(opt => {
                                const selected = ((answers[q.id] as string[]) || []).includes(String(opt.id))
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    className={`${css['goal-tag']} ${selected ? css['selected'] : ''}`}
                                    onClick={() => toggleMultiAnswer(q.id, String(opt.id))}
                                  >
                                    {opt.answer}
                                  </button>
                                )
                              })}
                            </div>
                          )}

                          {/* Multiple choice — standard checkboxes */}
                          {q.type === 'M' && !isGoals && (
                            <div className={css['checkbox-group']}>
                              {q.options.map(opt => {
                                const checked = ((answers[q.id] as string[]) || []).includes(String(opt.id))
                                return (
                                  <div key={opt.id} className="flex items-center gap-3">
                                    <Checkbox
                                      id={`q-${q.id}-opt-${opt.id}`}
                                      checked={checked}
                                      onCheckedChange={() => toggleMultiAnswer(q.id, String(opt.id))}
                                    />
                                    <Label
                                      htmlFor={`q-${q.id}-opt-${opt.id}`}
                                      className="text-sm font-normal text-[#1a0d33] cursor-pointer"
                                    >
                                      {opt.answer}
                                    </Label>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Boolean — radio group */}
                          {q.type === 'B' && (
                            <RadioGroup
                              value={(answers[q.id] as string) || ''}
                              onValueChange={v => updateAnswer(q.id, v)}
                              className="flex flex-col gap-3"
                            >
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="True" id={`q-${q.id}-yes`} />
                                <Label
                                  htmlFor={`q-${q.id}-yes`}
                                  className="text-sm font-normal text-[#1a0d33] cursor-pointer"
                                >
                                  Yes
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="False" id={`q-${q.id}-no`} />
                                <Label
                                  htmlFor={`q-${q.id}-no`}
                                  className="text-sm font-normal text-[#1a0d33] cursor-pointer"
                                >
                                  No
                                </Label>
                              </div>
                            </RadioGroup>
                          )}

                          {/* Text fields */}
                          {q.type === 'S' && (
                            <Input
                              type="text"
                              placeholder={q.question.toLowerCase().includes('legal name') ? 'Full legal name' : ''}
                              className={hasError ? 'border-[#ef4444] shadow-none' : ''}
                              value={(answers[q.id] as string) || ''}
                              onChange={e => updateAnswer(q.id, e.target.value)}
                            />
                          )}

                          {q.type === 'T' && (
                            <Textarea
                              className={hasError ? 'border-[#ef4444] shadow-none' : ''}
                              value={(answers[q.id] as string) || ''}
                              onChange={e => updateAnswer(q.id, e.target.value)}
                            />
                          )}

                          {q.type === 'N' && (
                            <Input
                              type="number"
                              className={hasError ? 'border-[#ef4444] shadow-none' : ''}
                              value={(answers[q.id] as string) || ''}
                              onChange={e => updateAnswer(q.id, e.target.value)}
                            />
                          )}

                          {isYouthHelper && isAnswerYes && q.helpText && (
                            <div className={css['youth-ticket-helper']}>
                              <p className={css['youth-ticket-helper-title']}>
                                Children aged 3–17 need their own ticket
                              </p>
                              <div className={css['youth-ticket-helper-body']}>
                                <Markdown
                                  components={{
                                    a: ({ href, children }) => (
                                      <a href={href} target="_blank" rel="noopener noreferrer">
                                        {children}
                                      </a>
                                    ),
                                  }}
                                >
                                  {q.helpText}
                                </Markdown>
                              </div>
                            </div>
                          )}

                          {hasError && <p className={css['field-error']}>{getFieldErrorMessage(q)}</p>}
                        </div>
                      )
                    })}

                    <button type="button" className={css['btn-continue']} onClick={handleAttendeContinue}>
                      Continue
                    </button>
                  </div>
                )}
              </div>

              {/* Payment */}
              <div className={css['section-card']}>
                <button
                  type="button"
                  className={`${css['section-header']} ${
                    openSection !== 'payment' ? css['section-header-collapsed'] : ''
                  }`}
                  onClick={() => toggleSection('payment')}
                  aria-expanded={openSection === 'payment'}
                >
                  <span>Payment</span>
                  {openSection === 'payment' ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </button>
                {openSection === 'payment' && (
                  <div className={css['section-body']}>
                    <div className={css['description-block']}>
                      <p className={css['description-title']}>
                        {TICKETING.payment.fiatEnabled ? 'Select your preferred payment method' : 'Payment method'}
                      </p>
                      {!forcePretixRedirect && TICKETING.payment.fiatEnabled && cryptoDiscountEnabled && (
                        <p className={css['description-sub']}>
                          Receive a <strong>{cryptoDiscountPercent}% discount</strong> when paying
                          with Crypto.
                        </p>
                      )}
                    </div>
                    <div
                      className={`${css['payment-methods']} ${
                        !TICKETING.payment.fiatEnabled ? css['payment-methods-single'] : ''
                      }`}
                    >
                      <label
                        className={`${css['payment-option']} ${paymentMethod === 'crypto' ? css['selected'] : ''}`}
                        onClick={() => setPaymentMethod('crypto')}
                      >
                        <input type="radio" name="payment" checked={paymentMethod === 'crypto'} readOnly />
                        <div className={css['payment-option-content']}>
                          <div className={css['payment-option-header']}>
                            <div className={css['payment-option-title-row']}>
                              <span className={css['payment-option-title']}>
                                {isEthOnly ? 'ETH' : 'Crypto'}
                              </span>
                              {!forcePretixRedirect && TICKETING.payment.fiatEnabled && cryptoDiscountEnabled && (
                                <span className={css['save-badge']}>
                                  SAVE {cryptoDiscountPercent}%
                                </span>
                              )}
                            </div>
                            <div className={css['payment-icons']}>
                              {TICKETING.payment.enabledTokens.map((sym) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  key={sym}
                                  src={TOKEN_ICONS[sym]}
                                  alt={SYMBOL_DISPLAY[sym] ?? sym}
                                  className={css['payment-icon-box']}
                                />
                              ))}
                            </div>
                          </div>
                          <p className={css['payment-option-desc']}>
                            {isEthOnly ? 'Pay using ETH on Mainnet' : 'All major wallets & networks'}
                          </p>
                        </div>
                      </label>
                      {TICKETING.payment.fiatEnabled && (
                        <label
                          className={`${css['payment-option']} ${paymentMethod === 'fiat' ? css['selected'] : ''}`}
                          onClick={() => setPaymentMethod('fiat')}
                        >
                          <input type="radio" name="payment" checked={paymentMethod === 'fiat'} readOnly />
                          <div className={css['payment-option-content']}>
                            <div className={css['payment-option-header']}>
                              <span className={css['payment-option-title']}>Fiat</span>
                            </div>
                            <p className={css['payment-option-desc']}>Debit / Credit Card</p>
                          </div>
                        </label>
                      )}
                    </div>

                    {paymentMethod === 'crypto' && !forcePretixRedirect && (
                      <>
                        {/* x402 toggled OFF for this event — surface a clear,
                             dedicated notice instead of leaving the wallet area
                             stuck on a generic error. The auto-checkout effect
                             is suppressed via `cryptoDisabledForEvent`, so this
                             notice persists until the buyer switches methods. */}
                        {cryptoDisabledForEvent && (
                          <div className={`${css['payment-notice']} ${css['payment-notice-error']}`}>
                            <div>
                              Crypto checkout is currently unavailable for this event.
                              {TICKETING.payment.fiatEnabled
                                ? ' Please switch to card payment to complete your purchase.'
                                : ' Please contact support if crypto was advertised for your purchase.'}
                            </div>
                            {TICKETING.payment.fiatEnabled && (
                              <button
                                type="button"
                                className={css['retry-verify-btn']}
                                onClick={() => {
                                  setPaymentMethod('fiat')
                                  setPurchaseError(null)
                                }}
                              >
                                Switch to card payment
                              </button>
                            )}
                          </div>
                        )}
                        {isConnected && isSafeAddress && (
                          <div className={css['smart-wallet-notice']}>
                            <strong>Safe detected — payment is experimental.</strong> Keep this tab open while the transaction is signed and executed.
                            {safeThreshold !== null && safeThreshold > 1 && (
                              <>
                                {' '}
                                For Safes with multiple signers, use a <strong>dedicated browser</strong>{' '}
                                for the Safe app where co-signers add signatures — this prevents losing
                                the WalletConnect connection to your Safe mid-flow.
                              </>
                            )}
                          </div>
                        )}
                        {isConnected ? (
                          <div className={css['wallet-connected']}>
                            <div className={css['wallet-connected-row']}>
                              {/* No "Connected to:" label — the wallet's own icon
                                   (e.g. the MetaMask fox) plus the connection-type
                                   pill ("🖥️ Browser extension", "📱 WalletConnect")
                                   already communicate the connected state. The
                                   label was redundant on desktop and hidden on
                                   mobile, so it's gone in both viewports. */}
                              <div className={css['wallet-connected-right']}>
                                {connectedWalletIcon && !iconBroken ? (
                                  <img
                                    src={connectedWalletIcon}
                                    alt={connectedWalletName ?? 'wallet'}
                                    className={css['wallet-identicon']}
                                    onError={() => setIconLoadFailedFor(connectedWalletIcon)}
                                  />
                                ) : (
                                  <div className={css['wallet-identicon']} />
                                )}
                                <div className={css['wallet-connected-meta']}>
                                  {/* Brand name on top, address + connection type below.
                                       Surfaces the actual wallet (e.g. "Rainbow") via
                                       Reown's `useWalletInfo`, not the generic
                                       "WalletConnect" connector label — important so
                                       returning buyers with a stale WC session know
                                       which mobile app to open before clicking Pay. */}
                                  {connectedWalletName && (
                                    <span className={css['wallet-brand']}>{connectedWalletName}</span>
                                  )}
                                  <span className={css['wallet-address']}>
                                    {/* Prefer ENS name when available — most users
                                         recognize "vitalik.eth" much faster than
                                         "0xd8dA…6045". Fall back to the truncated
                                         hex while the lookup resolves or when no
                                         primary name is set. The full hex stays
                                         available via the title attribute for
                                         hover-confirmation. */}
                                    <span
                                      className={css['wallet-address-hex']}
                                      title={address}
                                    >
                                      {displayEnsName || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '')}
                                    </span>
                                    {/* Connection-type pill — colored chip with icon
                                         so it's unmistakable at a glance whether the
                                         next signature popup is in the browser
                                         extension, on a phone (WC), in Coinbase
                                         Wallet, or routed through Safe. The chip
                                         uses data-kind to pick its tint via CSS so
                                         the JSX stays kind-agnostic. */}
                                    <span
                                      className={css['wallet-connection-type']}
                                      data-kind={connectionKind}
                                    >
                                      {(() => {
                                        const icon = connectionTypeIcon(connectionKind)
                                        if (icon === 'monitor') return <Monitor size={12} />
                                        if (icon === 'smartphone') return <Smartphone size={12} />
                                        if (icon === 'shield') return <Shield size={12} />
                                        return <Wallet size={12} />
                                      })()}
                                      {connectionTypeLabel(connectionKind)}
                                    </span>
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              className={css['wallet-disconnect-btn']}
                              onClick={() => disconnect()}
                              // Lock disconnect mid-flight: a wallet swap during the
                              // tx-broadcast / verify-poll window leaves the order in a
                              // half-paid state where the backend keeps polling on the
                              // original payer + hash but the UI reflects a different
                              // session. Wait for verify to resolve (success or hard
                              // error) before allowing a disconnect.
                              disabled={isProcessing}
                              title={isProcessing ? 'Disconnect disabled while a payment is being verified.' : undefined}
                            >
                              Disconnect wallet
                            </button>
                          </div>
                        ) : (
                          <div className={css['wallet-box']}>
                            <Wallet className={css['wallet-icon']} strokeWidth={1.5} />
                            <p className={css['wallet-title']}>Connect your wallet</p>
                            <p className={css['wallet-sub']}>Checkout securely using crypto</p>
                            <button type="button" className={css['wallet-connect-btn']} onClick={() => open()}>
                              Connect Wallet
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {paymentMethod === 'crypto' && !forcePretixRedirect && paymentDetails && address && (
                      <div className={css['payment-options-block']}>
                        <div className={css['payment-options-header']}>
                          <span className={css['payment-options-title']}>How would you like to pay?</span>
                        </div>
                        {paymentOptionsLoading ? (
                          <div className={css['loading-box']}>
                            <Loader2 size={24} className={css['loading-spinner']} />
                            <span>Loading available networks and balances...</span>
                          </div>
                        ) : (
                          <>
                            {paymentOptions.length > 0 &&
                              (() => {
                                // Canonical asset chip order — independent of the order the
                                // backend returns options in. Symbols not in the list fall to
                                // the end so newly-added tokens stay visible.
                                const ASSET_ORDER = ['ETH', 'USDC', 'USDT0', 'USDT']
                                const uniqueSymbols = [...new Set(paymentOptions.map(o => o.symbol))].sort((a, b) => {
                                  const ia = ASSET_ORDER.indexOf(a)
                                  const ib = ASSET_ORDER.indexOf(b)
                                  if (ia === -1 && ib === -1) return a.localeCompare(b)
                                  if (ia === -1) return 1
                                  if (ib === -1) return -1
                                  return ia - ib
                                })

                                // Networks for selected asset
                                const networksForAsset = tokenFilter
                                  ? paymentOptions.filter(o => o.symbol === tokenFilter)
                                  : []

                                // Auto-determine selected network from selectedOption
                                const selectedAssetKey = selectedOption?.asset

                                return (
                                  <>
                                    {/* Step 1: Asset selection chips */}
                                    <div className={css['asset-selection']}>
                                      <span className={css['asset-label']}>Asset</span>
                                      <div className={css['asset-chips']}>
                                        {uniqueSymbols.map(sym => (
                                          <button
                                            key={sym}
                                            type="button"
                                            className={`${css['asset-chip']} ${
                                              tokenFilter === sym ? css['asset-chip--active'] : ''
                                            }`}
                                            disabled={isProcessing}
                                            onClick={() => {
                                              setTokenFilter(sym)
                                              // Auto-select the best network for this asset
                                              const assetsForSym = paymentOptions.filter(o => o.symbol === sym)
                                              const bestOpt =
                                                assetsForSym.find(o => Boolean(o.signingRequest) && o.sufficient) ||
                                                assetsForSym[0]
                                              if (bestOpt && bestOpt.signingRequest && bestOpt.sufficient) {
                                                selectPaymentOption(bestOpt)
                                              } else {
                                                setSelectedOption(null)
                                              }
                                            }}
                                          >
                                            {TOKEN_ICONS[sym] && (
                                              /* eslint-disable-next-line @next/next/no-img-element */
                                              <img
                                                src={TOKEN_ICONS[sym]}
                                                alt={sym}
                                                className={css['asset-chip-icon']}
                                              />
                                            )}
                                            {displaySymbol(sym)}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Step 2: Network selection */}
                                    {tokenFilter && networksForAsset.length > 0 && (
                                      <div className={css['network-selection']}>
                                        <div className={css['network-header']}>
                                          <span className={css['network-label']}>Network</span>
                                          <button
                                            type="button"
                                            className={css['network-refresh']}
                                            onClick={() => fetchPaymentOptions()}
                                            disabled={paymentOptionsLoading || isProcessing}
                                          >
                                            Refresh balances
                                          </button>
                                        </div>
                                        <div className={css['network-list']}>
                                          {networksForAsset.map(opt => {
                                            const canPay = Boolean(opt.signingRequest) && opt.sufficient
                                            const isSelected = selectedAssetKey === opt.asset
                                            const isGasless =
                                              opt.signingRequest?.method === 'eth_signTypedData_v4' ||
                                              ['USDC', 'USDT0'].includes(opt.symbol)
                                            const chainIdNum = parseInt(opt.chainId.replace(/^eip155:/, ''), 10)
                                            const balanceFormatted =
                                              opt.decimals >= 18
                                                ? formatEth(opt.balance, 18)
                                                : (Number(opt.balance) / 10 ** opt.decimals).toFixed(2)
                                            return (
                                              <button
                                                key={opt.asset}
                                                type="button"
                                                className={`${css['network-row']} ${
                                                  isSelected ? css['network-row--selected'] : ''
                                                } ${!canPay ? css['network-row--insufficient'] : ''}`}
                                                disabled={!canPay || isProcessing}
                                                onClick={() => canPay && !isProcessing && selectPaymentOption(opt)}
                                              >
                                                <span className={css['network-row-icon']}>
                                                  {NETWORK_LOGOS[chainIdNum] && (
                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                    <img
                                                      src={NETWORK_LOGOS[chainIdNum]}
                                                      alt={opt.chain}
                                                      className={css['network-row-icon-img']}
                                                    />
                                                  )}
                                                </span>
                                                <span className={css['network-row-info']}>
                                                  <span className={css['network-row-name-row']}>
                                                    <span className={css['network-row-name']}>{opt.chain}</span>
                                                    {isGasless && <span className={css['gasless-badge']}>GASLESS</span>}
                                                  </span>
                                                  <span className={css['network-row-balance']}>
                                                    Balance: {balanceFormatted} {displaySymbol(opt.symbol)}
                                                    {opt.priceUsd && opt.symbol === 'ETH'
                                                      ? ` / $${((Number(opt.balance) / 1e18) * opt.priceUsd).toFixed(
                                                          2
                                                        )}`
                                                      : ` / $${balanceFormatted}`}
                                                  </span>
                                                </span>
                                                {isSelected && (
                                                  <span className={css['network-row-check']}>
                                                    <Check size={24} />
                                                  </span>
                                                )}
                                              </button>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {purchaseError && (
                                      <div className={`${css['payment-notice']} ${css['payment-notice-error']}`}>
                                        <div>{purchaseError}</div>
                                        {txHash && paymentDetails && (
                                          <button
                                            type="button"
                                            className={css['retry-verify-btn']}
                                            onClick={() => verifyPayment(txHash)}
                                            disabled={isProcessing}
                                          >
                                            Retry verification
                                          </button>
                                        )}
                                      </div>
                                    )}

                                    {(writeError || directSignError) && (
                                      <div className={`${css['payment-notice']} ${css['payment-notice-error']}`}>
                                        {writeError?.message || directSignError}
                                      </div>
                                    )}

                                    {isRedirecting && (
                                      <div className={`${css['payment-notice']} ${css['payment-notice-redirect']}`}>
                                        <Loader2 size={18} className={css['spin']} />
                                        <span>Redirecting to payment provider — please wait...</span>
                                      </div>
                                    )}

                                    {/* In-flight status banner. Renders the contextual
                                         `paymentStatus` ("Sign payer proof in Rainbow on your
                                         phone…", "Verifying on-chain (3/12)…", etc.) the moment a
                                         flow starts. The Pay button below stays on a generic
                                         "Processing…" label so the same text isn't duplicated;
                                         this banner sits above the Pay button and is much harder
                                         to miss when the buyer's eyes are on the wallet popup. */}
                                    {!isRedirecting && paymentStatus && (
                                      <div className={css['payment-status-banner']}>
                                        <Loader2 size={16} className={css['spin']} />
                                        <span>{paymentStatus}</span>
                                      </div>
                                    )}

                                    {/* Manual hash escape hatch — appears after the recovery
                                         watchdog has spent its full budget without finding the tx
                                         via Alchemy assetTransfers. Buyer can paste the hash
                                         from their wallet's history; we validate it on-chain
                                         (from/to/value match) before accepting. */}
                                    {needsManualHash && (
                                      <div className={css['manual-hash-prompt']}>
                                        <div className={css['manual-hash-message']}>
                                          We can't tell whether your wallet sent the transaction.
                                          If your wallet shows a successful payment, paste the
                                          transaction hash here so we can verify it. Otherwise,
                                          you can cancel and try again.
                                        </div>
                                        <div className={css['manual-hash-row']}>
                                          <Input
                                            value={manualHashInput}
                                            onChange={(e) => setManualHashInput(e.target.value)}
                                            placeholder="0x..."
                                            disabled={manualHashSubmitting}
                                            spellCheck={false}
                                            autoComplete="off"
                                          />
                                          <button
                                            type="button"
                                            className={css['manual-hash-submit']}
                                            onClick={submitManualHash}
                                            disabled={manualHashSubmitting || !manualHashInput.trim()}
                                          >
                                            {manualHashSubmitting ? 'Verifying payment…' : 'Verify payment'}
                                          </button>
                                        </div>
                                        {manualHashError && (
                                          <div className={css['manual-hash-error']}>{manualHashError}</div>
                                        )}
                                      </div>
                                    )}

                                    {txHash && (
                                      <div className={css['tx-status']}>
                                        Transaction:{' '}
                                        <a
                                          href={`${
                                            (paymentDetails?.chainId && BLOCK_EXPLORERS[paymentDetails.chainId]) ||
                                            'https://etherscan.io'
                                          }/tx/${txHash}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{ color: '#4a90d9', textDecoration: 'underline' }}
                                        >
                                          {txHash.slice(0, 10)}...{txHash.slice(-8)}
                                        </a>
                                        {paymentDetails?.chainId === 1 && isProcessing && (
                                          <span
                                            style={{
                                              display: 'block',
                                              marginTop: '0.5rem',
                                              fontSize: '0.75rem',
                                              color: '#92400e',
                                            }}
                                          >
                                            Mainnet transactions can take a few seconds to be processed.
                                          </span>
                                        )}
                                        {!isProcessing && paymentDetails && (
                                          <button
                                            type="button"
                                            className={css['retry-verify-btn']}
                                            onClick={() => verifyPayment(txHash)}
                                            style={{ marginLeft: '0.75rem' }}
                                          >
                                            Retry verification
                                          </button>
                                        )}
                                      </div>
                                    )}

                                    {/* Pay button — hidden while fresh options are loading (avoids
                                         a stale "Pay: $X on Chain" flash) and after a verify has
                                         succeeded (avoids an accidental second click during the
                                         router.push window). */}
                                    {selectedOption && !paymentOptionsLoading && !paymentSucceeded && (
                                      <>
                                        {/* No status banner here — the Pay button below already
                                             swaps its label to `paymentStatus` (e.g. "Sign payer
                                             proof in Rainbow on your phone…") whenever a flow is
                                             in motion. A second banner above the button repeated
                                             the exact same text. The success / redirect notices
                                             render separately further down. */}
                                        <button
                                          type="button"
                                          className={css['btn-pay-now']}
                                          disabled={isProcessing}
                                          onClick={payWithSelectedOption}
                                        >
                                          <Lock size={20} />
                                          {isProcessing
                                            ? 'Processing…'
                                            : `Pay: ${
                                                selectedOption.decimals >= 18
                                                  ? formatEth(selectedOption.amount, 18)
                                                  : (
                                                      Number(selectedOption.amount) /
                                                      10 ** selectedOption.decimals
                                                    ).toFixed(2)
                                              } ${displaySymbol(selectedOption.symbol)} on ${selectedOption.chain}`}
                                        </button>
                                      </>
                                    )}
                                    {paymentSucceeded && (
                                      <div className={css['payment-notice']}>
                                        {paymentStatus || 'Payment confirmed — redirecting...'}
                                      </div>
                                    )}
                                  </>
                                )
                              })()}
                            {!paymentOptionsLoading &&
                              paymentOptions.length > 0 &&
                              paymentOptions.filter(o => o.sufficient).length === 0 &&
                              paymentDetails && (() => {
                                // Build the "enough ETH, USDC, or USDT0" list from the
                                // tokens this event actually offers. Honors the plugin's
                                // chain/token toggles — won't suggest USDT0 if the event
                                // didn't enable it.
                                const ASSET_DISPLAY_ORDER = ['ETH', 'USDC', 'USDT0', 'USDT']
                                const symbols = [...new Set(paymentOptions.map(o => o.symbol))]
                                  .sort((a, b) => {
                                    const ia = ASSET_DISPLAY_ORDER.indexOf(a)
                                    const ib = ASSET_DISPLAY_ORDER.indexOf(b)
                                    if (ia === -1 && ib === -1) return a.localeCompare(b)
                                    if (ia === -1) return 1
                                    if (ib === -1) return -1
                                    return ia - ib
                                  })
                                  .map(s => SYMBOL_DISPLAY[s] ?? s)
                                let humanList = ''
                                if (symbols.length === 1) humanList = symbols[0]
                                else if (symbols.length === 2) humanList = `${symbols[0]} or ${symbols[1]}`
                                else if (symbols.length > 2)
                                  humanList = `${symbols.slice(0, -1).join(', ')}, or ${symbols[symbols.length - 1]}`
                                return (
                                  <p className={`${css['payment-notice']} ${css['payment-notice-error']}`}>
                                    Insufficient balance. Top up your wallet
                                    {humanList ? ` or connect one with enough ${humanList}` : ''}.
                                  </p>
                                )
                              })()}
                          </>
                        )}
                      </div>
                    )}

                    {/* Mobile: Discount */}
                    <div className={css['mobile-only']}>
                      <div className={css['discount-section']}>
                        {voucherData?.valid ? (
                          <div className={css['discount-applied']}>
                            <div className={css['discount-applied-info']}>
                              <CheckCircle className={css['discount-check-icon']} />
                              <div className={css['discount-applied-text']}>
                                <span className={css['discount-code-line']}>
                                  <strong>CODE: </strong>
                                  {voucherInput.length > 12
                                    ? `${voucherInput.slice(0, 4)}...${voucherInput.slice(-4)}`
                                    : voucherInput}
                                </span>
                                {voucherDiscount > 0 && (
                                  <span className={css['discount-savings']}>Save: ${voucherDiscount.toFixed(2)}</span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              className={css['discount-remove-btn']}
                              onClick={() => {
                                setVoucherInput('')
                                setVoucherData(null)
                                setVoucherError(null)
                                setDiscountOpen(false)
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ) : !discountOpen ? (
                          <button
                            type="button"
                            className={css['discount-add-btn']}
                            onClick={() => setDiscountOpen(true)}
                          >
                            <Tag size={16} />
                            Add discount
                          </button>
                        ) : (
                          <>
                            <span className={css['discount-label']}>Add discount</span>
                            <div className={css['discount-expand']}>
                              <input
                                type="text"
                                className={css['discount-input']}
                                placeholder="Discount or Voucher Code"
                                value={voucherInput}
                                onChange={e => {
                                  setVoucherInput(e.target.value)
                                  setVoucherError(null)
                                }}
                                disabled={voucherLoading}
                              />
                              <button
                                type="button"
                                className={css['discount-apply-btn']}
                                onClick={() => voucherInput && validateVoucherCode(voucherInput)}
                                disabled={voucherLoading || !voucherInput}
                              >
                                {voucherLoading ? <Loader2 size={16} className={css['discount-spinner']} /> : 'Apply'}
                              </button>
                            </div>
                            {voucherError && <p className={css['discount-error']}>{voucherError}</p>}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Mobile: Inline order summary */}
                    <div className={css['mobile-only']}>
                      <div className={css['mobile-inline-summary']}>
                        <button
                          type="button"
                          className={css['mobile-inline-summary-bar']}
                          onClick={() => setMobileInlineSummaryOpen(!mobileInlineSummaryOpen)}
                        >
                          <span className={css['mobile-inline-summary-left']}>
                            <span>Order summary</span>
                            {mobileInlineSummaryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </span>
                          <span className={css['mobile-inline-summary-total']}>
                            <span>${totalUsd}</span>
                            {!mobileInlineSummaryOpen && showGstBreakdown && (
                              <span className={css['mobile-order-bar-tax']}>
                                incl. {vatPercent}% {vatLabel}
                              </span>
                            )}
                          </span>
                        </button>
                        {mobileInlineSummaryOpen && (
                          <div className={css['mobile-inline-summary-content']}>
                            <div className={css['panel-items']}>
                              {cartItems.length > 0 ? (
                                cartItems.map(item => {
                                  const isPaid = parseFloat(item.price) > 0
                                  return (
                                    <div key={item.ticketId} className={css['panel-item']}>
                                      <span className={css['panel-item-name']}>
                                        {item.name}
                                        {isPaid && vatPercent > 0 && (
                                          <span className={css['panel-item-tax']}>
                                            {' '}
                                            ({vatLabel} {vatPercent}%)
                                          </span>
                                        )}
                                      </span>
                                      <div className={css['panel-item-right']}>
                                        <span>x{item.quantity}</span>
                                        <span className={css['panel-item-price']}>
                                          ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })
                              ) : (
                                <div className={css['panel-item']}>
                                  <span className={css['panel-item-name']}>No tickets selected</span>
                                  <div className={css['panel-item-right']}>
                                    <span className={css['panel-item-price']}>$0.00</span>
                                  </div>
                                </div>
                              )}
                              {Array.from(selectedAddons.entries()).map(([itemId, data]) => {
                                const item = allAddonItems.find(i => i.id === itemId)
                                if (!item || data.quantity <= 0) return null
                                const cat = addonCategoryByItemId.get(itemId)
                                let price = cat?.priceIncluded ? 0 : parseFloat(item.price)
                                let variationName = ''
                                if (data.variationId) {
                                  const variation = item.variations.find(v => v.id === data.variationId)
                                  if (variation) {
                                    if (!cat?.priceIncluded) price = parseFloat(variation.price)
                                    variationName = variation.name
                                  }
                                }
                                const isFree = price === 0
                                const lineTotal = price * data.quantity
                                return (
                                  <div key={itemId} className={css['panel-item']}>
                                    <div className={css['panel-item-name']}>
                                      <span>
                                        {item.name}
                                        {!isFree && vatPercent > 0 && (
                                          <span className={css['panel-item-tax']}>
                                            {' '}
                                            ({vatLabel} {vatPercent}%)
                                          </span>
                                        )}
                                      </span>
                                      {variationName && <span className={css['panel-item-meta']}>{variationName}</span>}
                                    </div>
                                    <div className={css['panel-item-right']}>
                                      <span>x{data.quantity}</span>
                                      <span className={css['panel-item-price']}>
                                        {isFree ? 'FREE' : `$${lineTotal.toFixed(2)}`}
                                      </span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            <div className={css['summary-lines']}>
                              <div className={css['summary-line']}>
                                <span>Subtotal</span>
                                <span>${subtotal.toFixed(2)}</span>
                              </div>
                              {voucherDiscount > 0 && (
                                <div className={`${css['summary-line']} ${css['summary-line-indent']}`}>
                                  <span>Voucher discount</span>
                                  <span>&ndash;${voucherDiscount.toFixed(2)}</span>
                                </div>
                              )}
                              {cryptoDiscount > 0 && (
                                <div className={`${css['summary-line']} ${css['summary-line-indent']}`}>
                                  <span>Crypto discount (&ndash;{cryptoDiscountPercent}%)</span>
                                  <span>&ndash;${cryptoDiscount.toFixed(2)}</span>
                                </div>
                              )}
                              {showGstBreakdown && (
                                <>
                                  <div className={css['summary-line']}>
                                    <span>Total excl. {vatLabel}</span>
                                    <span>${totalExclGst.toFixed(2)}</span>
                                  </div>
                                  <div className={`${css['summary-line']} ${css['summary-line-indent']}`}>
                                    <span>
                                      {vatLabel} @ {vatPercent}%
                                    </span>
                                    <span>${gstAmount.toFixed(2)}</span>
                                  </div>
                                </>
                              )}
                              <div className={css['summary-total']}>
                                <span>Total</span>
                                <div className={css['summary-total-values']}>
                                  {paymentMethod === 'crypto' && selectedOption && (
                                    <span className={css['summary-eth']}>
                                      <span className={css['summary-currency-label']}>
                                        {displaySymbol(selectedOption.symbol)}
                                      </span>
                                      <span className={css['summary-currency-value']}>
                                        {selectedOption.decimals >= 18
                                          ? formatEth(selectedOption.amount, 18)
                                          : (Number(selectedOption.amount) / 10 ** selectedOption.decimals).toFixed(2)}
                                      </span>
                                    </span>
                                  )}
                                  <span className={css['summary-usd']}>
                                    <span className={css['summary-currency-label']}>USD</span>
                                    <span className={css['summary-currency-value']}>${totalUsd}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {supportMailto && (
                      <div className={css['support-pill']}>
                        <p>
                          Need help?{' '}
                          <a href={supportMailto}>
                            <strong>Contact support</strong>
                          </a>
                        </p>
                      </div>
                    )}

                    {/* Privacy / Notice confirmation — shown inside the Payment card per Figma */}
                    <p className={css['payment-confirm-text']}>
                      I confirm that I have read and understand the{' '}
                      <a href="https://ethereum.org/en/privacy-policy/" target="_blank" rel="noopener noreferrer">
                        <strong>EF Privacy Policy</strong>
                      </a>{' '}
                      and{' '}
                      <a
                        href="https://docs.google.com/document/d/122-G_xgVVFBgLt_3MNtTSaaXZxygtQK5O1VfGvi17Kk/edit"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <strong>Devcon 8 Privacy Notice</strong>
                      </a>
                      .
                    </p>

                    {!(paymentMethod === 'crypto' && !forcePretixRedirect) && (
                      <button
                        type="button"
                        className={`${css['btn-checkout']} ${checkoutEnabled ? css['btn-checkout-active'] : ''}`}
                        disabled={!checkoutEnabled}
                        onClick={handleCheckout}
                      >
                        <span className={css['btn-checkout-left']}>
                          <Lock size={20} />
                          {isProcessing ? paymentStatus || 'Processing...' : 'Checkout'}
                        </span>
                        <span className={css['btn-checkout-divider']} />
                        <span>${totalUsd} USD</span>
                      </button>
                    )}

                    {paymentMethod !== 'crypto' && (
                      <div className={css['stripe-note']}>
                        <img
                          src="/assets/images/powered-by-stripe.svg"
                          alt="Powered by Stripe"
                          className={css['stripe-note-img']}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* FAQ */}
              <div id="faq" className={css['section-card']}>
                <button
                  type="button"
                  className={`${css['section-header']} ${openSection !== 'faq' ? css['section-header-collapsed'] : ''}`}
                  onClick={() => toggleSection('faq')}
                  aria-expanded={openSection === 'faq'}
                >
                  <span>Frequently asked questions</span>
                  {openSection === 'faq' ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </button>
                {openSection === 'faq' && (
                  <div className={css['section-body']}>
                    <div className={css['faq-list']}>
                      {FAQ_ITEMS.map((item, i) => (
                        <div key={i} className={css['faq-item']}>
                          <button
                            type="button"
                            className={css['faq-question']}
                            onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                          >
                            <span>{item.q}</span>
                            {openFaqIndex === i ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                          </button>
                          {openFaqIndex === i && <div className={css['faq-answer']}>{item.a}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        <aside className={css['panel']}>
          <div className={css['panel-card']}>
            <div className={css['panel-banner']}>
              <img src="/assets/images/dc8-order-summary-bg.png" alt="" className={css['panel-banner-img']} />
              <span className={css['panel-banner-text']}>Devcon India</span>
            </div>
            <div className={css['panel-content']}>
              <div className={css['panel-items']}>
                {cartItems.length > 0 ? (
                  cartItems.map(item => {
                    const isPaid = parseFloat(item.price) > 0
                    return (
                      <div key={item.ticketId} className={css['panel-item']}>
                        <span className={css['panel-item-name']}>
                          {item.name}
                          {isPaid && vatPercent > 0 && (
                            <span className={css['panel-item-tax']}>
                              {' '}
                              ({vatLabel} {vatPercent}%)
                            </span>
                          )}
                        </span>
                        <div className={css['panel-item-right']}>
                          <span>x{item.quantity}</span>
                          <span className={css['panel-item-price']}>
                            ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className={css['panel-item']}>
                    <span className={css['panel-item-name']}>No tickets selected</span>
                    <div className={css['panel-item-right']}>
                      <span className={css['panel-item-price']}>$0.00</span>
                    </div>
                  </div>
                )}
                {Array.from(selectedAddons.entries()).map(([itemId, data]) => {
                  const item = allAddonItems.find(i => i.id === itemId)
                  if (!item || data.quantity <= 0) return null
                  const cat = addonCategoryByItemId.get(itemId)
                  let price = cat?.priceIncluded ? 0 : parseFloat(item.price)
                  let variationName = ''
                  if (data.variationId) {
                    const variation = item.variations.find(v => v.id === data.variationId)
                    if (variation) {
                      if (!cat?.priceIncluded) price = parseFloat(variation.price)
                      variationName = variation.name
                    }
                  }
                  const isFree = price === 0
                  const lineTotal = price * data.quantity
                  return (
                    <div key={itemId} className={css['panel-item']}>
                      <div className={css['panel-item-name']}>
                        <span>
                          {item.name}
                          {!isFree && vatPercent > 0 && (
                            <span className={css['panel-item-tax']}>
                              {' '}
                              ({vatLabel} {vatPercent}%)
                            </span>
                          )}
                        </span>
                        {variationName && <span className={css['panel-item-meta']}>{variationName}</span>}
                      </div>
                      <div className={css['panel-item-right']}>
                        <span>x{data.quantity}</span>
                        <span className={css['panel-item-price']}>{isFree ? 'FREE' : `$${lineTotal.toFixed(2)}`}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className={css['discount-section']}>
                {voucherData?.valid ? (
                  <div className={css['discount-applied']}>
                    <div className={css['discount-applied-info']}>
                      <CheckCircle className={css['discount-check-icon']} />
                      <div className={css['discount-applied-text']}>
                        <span className={css['discount-code-line']}>
                          <strong>CODE: </strong>
                          {voucherInput.length > 12
                            ? `${voucherInput.slice(0, 4)}...${voucherInput.slice(-4)}`
                            : voucherInput}
                        </span>
                        {voucherDiscount > 0 && (
                          <span className={css['discount-savings']}>Save: ${voucherDiscount.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={css['discount-remove-btn']}
                      onClick={() => {
                        setVoucherInput('')
                        setVoucherData(null)
                        setVoucherError(null)
                        setDiscountOpen(false)
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : !discountOpen ? (
                  <button type="button" className={css['discount-add-btn']} onClick={() => setDiscountOpen(true)}>
                    <Tag size={16} />
                    Add discount
                  </button>
                ) : (
                  <>
                    <span className={css['discount-label']}>Add discount</span>
                    <div className={css['discount-expand']}>
                      <input
                        type="text"
                        className={css['discount-input']}
                        placeholder="Discount or Voucher Code"
                        value={voucherInput}
                        onChange={e => {
                          setVoucherInput(e.target.value)
                          setVoucherError(null)
                        }}
                        disabled={voucherLoading}
                      />
                      <button
                        type="button"
                        className={css['discount-apply-btn']}
                        onClick={() => voucherInput && validateVoucherCode(voucherInput)}
                        disabled={voucherLoading || !voucherInput}
                      >
                        {voucherLoading ? <Loader2 size={16} className={css['discount-spinner']} /> : 'Apply'}
                      </button>
                    </div>
                    {voucherError && <p className={css['discount-error']}>{voucherError}</p>}
                  </>
                )}
              </div>
              <div className={css['summary-lines']}>
                <div className={css['summary-line']}>
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {voucherDiscount > 0 && (
                  <div className={`${css['summary-line']} ${css['summary-line-indent']}`}>
                    <span>Voucher discount</span>
                    <span>&ndash;${voucherDiscount.toFixed(2)}</span>
                  </div>
                )}
                {cryptoDiscount > 0 && (
                  <div className={`${css['summary-line']} ${css['summary-line-indent']}`}>
                    <span>Crypto discount (&ndash;{cryptoDiscountPercent}%)</span>
                    <span>&ndash;${cryptoDiscount.toFixed(2)}</span>
                  </div>
                )}
                {showGstBreakdown && (
                  <>
                    <div className={css['summary-line']}>
                      <span>Total excl. {vatLabel}</span>
                      <span>${totalExclGst.toFixed(2)}</span>
                    </div>
                    <div className={`${css['summary-line']} ${css['summary-line-indent']}`}>
                      <span>
                        {vatLabel} @ {vatPercent}%
                      </span>
                      <span>${gstAmount.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className={css['summary-total']}>
                  <span>Total</span>
                  <div className={css['summary-total-values']}>
                    {paymentMethod === 'crypto' && selectedOption && (
                      <span className={css['summary-eth']}>
                        <span className={css['summary-currency-label']}>{displaySymbol(selectedOption.symbol)}</span>
                        <span className={css['summary-currency-value']}>
                          {selectedOption.decimals >= 18
                            ? formatEth(selectedOption.amount, 18)
                            : (Number(selectedOption.amount) / 10 ** selectedOption.decimals).toFixed(2)}
                        </span>
                      </span>
                    )}
                    <span className={css['summary-usd']}>
                      <span className={css['summary-currency-label']}>USD</span>
                      <span className={css['summary-currency-value']}>${totalUsd}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className={css['panel-disclaimer']}>
                <p>
                  An order confirmation with your tickets will be sent to the email provided during checkout. If you
                  don&apos;t receive a confirmation email, please{' '}
                  <a href={supportMailto || `mailto:${supportEmail}`}>
                    <strong>contact us</strong>
                  </a>
                  .
                </p>
                <p>
                  Got a question?{' '}
                  <a
                    href="#faq"
                    onClick={e => {
                      e.preventDefault()
                      setOpenSection('faq')
                      document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                  >
                    <strong>Read our ticketing FAQs</strong>
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </Page>
  )
}

export async function getStaticProps() {
  return {
    props: {},
  }
}
