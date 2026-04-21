import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Markdown from 'react-markdown'
import Page from 'components/common/layouts/page'
import { Link } from 'components/common/link'
import { Wallet, CheckCircle, Lock, ChevronUp, ChevronDown, ArrowLeft, Check, Loader2, Minus, Plus, Tag } from 'lucide-react'
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
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useWalletClient,
  useSendTransaction,
} from 'wagmi'
import type { Config } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
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
  discountForCrypto: string
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
    a: `Yes! We accept crypto payments with a ${TICKETING.payment.cryptoDiscountPercent}% discount. You can pay using all major wallets and tokens.`,
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
  const daimoPay = TICKETING.checkout.useDaimoPay
  const { address, isConnected, chain, connector } = useAccount()
  const { open } = useAppKit()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain()
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
  // EIP-191 signature binding payer wallet to the payment reference.
  // Only populated for the native ETH path (USDC/USDT0 are bound via EIP-3009).
  const [ethPayerSignature, setEthPayerSignature] = useState<string | null>(null)

  // Payment options (multi-chain)
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([])
  const [paymentOptionsLoading, setPaymentOptionsLoading] = useState(false)
  const [selectedOption, setSelectedOption] = useState<PaymentOption | null>(null)
  const [tokenFilter, setTokenFilter] = useState<string | null>(null)

  const paymentOptionsAutoLoadedRef = useRef<string | null>(null)
  const tokenFilterAutoSelectedRef = useRef(false)

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

  // Wagmi hooks
  const { data: writeData, isPending: isWritePending, error: writeError } = useWriteContract()
  const { data: walletClient } = useWalletClient()
  const [isSigningDirect, setIsSigningDirect] = useState(false)
  const [directSignError, setDirectSignError] = useState<string | null>(null)
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: writeData })
  const { sendTransactionAsync, data: sendTxHash, isPending: isSendTxPending } = useSendTransaction()
  const { isLoading: isSendTxReceiptLoading, isSuccess: isSendTxSuccess } = useWaitForTransactionReceipt({ hash: sendTxHash })

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
  useEffect(() => {
    if (isTxSuccess && writeData && paymentDetails) {
      setTxHash(writeData)
      verifyPayment(writeData)
    }
  }, [isTxSuccess, writeData])

  // ── Handle native ETH send tx success ──
  useEffect(() => {
    if (isSendTxSuccess && sendTxHash && paymentDetails) {
      setTxHash(sendTxHash)
      verifyPayment(sendTxHash)
    }
  }, [isSendTxSuccess, sendTxHash])

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

    return walletClient.request({
      method: 'eth_signTypedData_v4',
      params: [address, jsonStr],
    } as any)
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

  // Add-on subtotal
  const addonSubtotal = Array.from(selectedAddons.entries()).reduce((sum, [itemId, data]) => {
    const item = allAddonItems.find(i => i.id === itemId)
    if (!item || data.quantity <= 0) return sum
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

  const cryptoDiscountPercent = paymentInfo?.discountForCrypto ? parseInt(paymentInfo.discountForCrypto) : TICKETING.payment.cryptoDiscountPercent
  const cryptoDiscount = paymentMethod === 'crypto' && !daimoPay ? +((subtotal - voucherDiscount) * cryptoDiscountPercent / 100).toFixed(2) : 0
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

  // Auto-trigger crypto checkout when prerequisites are met (only on payment section)
  useEffect(() => {
    if (
      openSection === 'payment' &&
      paymentMethod === 'crypto' &&
      !daimoPay &&
      contactDetailsFilled &&
      cartItems.length > 0 &&
      isConnected &&
      address &&
      !paymentDetails &&
      !isProcessing
    ) {
      const key = `${address}-${totalUsd}-${addonFingerprint}`
      if (autoCheckoutTriggeredRef.current === key) return
      autoCheckoutTriggeredRef.current = key

      setPurchaseLoading(true)
      setPurchaseError(null)
      handleCryptoCheckout().finally(() => setPurchaseLoading(false))
    }
  }, [openSection, paymentMethod, daimoPay, contactDetailsFilled, cartItems.length, isConnected, address, paymentDetails, isProcessing, totalUsd, addonFingerprint])

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
      const current = (prev[questionId] as string[]) || []
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

    if (paymentMethod === 'crypto' && !daimoPay && (!isConnected || !address)) {
      setPurchaseError('Please connect your wallet first')
      return
    }

    setPurchaseLoading(true)
    setPurchaseError(null)
    setPaymentStatus('Creating order...')

    if (paymentMethod === 'fiat') {
      await handleFiatCheckout()
    } else if (daimoPay) {
      await handleFiatCheckout('daimo_pay')
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
        setPurchaseError(data.error || 'Failed to create purchase')
        setPaymentStatus(null)
      }
    } catch {
      setPurchaseError('Failed to create purchase. Please try again.')
      setPaymentStatus(null)
    }
  }

  async function handleFiatCheckout(paymentProvider?: 'stripe' | 'daimo_pay') {
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
      setPaymentStatus('Sign in your wallet...')

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
        setPaymentStatus('Sign in your wallet...')

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
      const chainIdForSig = Number(paymentDetails.chainId)
      const payerMessage =
        'Devcon ticket payment (ETH)\n' +
        `Payment reference: ${paymentDetails.paymentReference}\n` +
        `Payer: ${address}\n` +
        `Chain: ${chainIdForSig}`
      setPaymentStatus('Sign payer proof in wallet...')
      let sig: string
      try {
        sig = await walletClient.signMessage({ account: address, message: payerMessage })
      } catch (e) {
        setPurchaseError(humanizeWalletError(e))
        setPaymentStatus(null)
        return
      }
      setEthPayerSignature(sig)

      setPaymentStatus('Confirm in wallet...')
      try {
        await sendTransactionAsync({
          to: tx.to as `0x${string}`,
          value: BigInt(tx.value),
          data: (tx.data as `0x${string}`) || '0x',
        })
      } catch (e) {
        setPurchaseError(humanizeWalletError(e))
        setPaymentStatus(null)
      }
    }
  }

  async function verifyPayment(hash: string, attempt = 1) {
    if (!paymentDetails || !address) return

    const maxAttempts = 12
    const retryDelay = 5000

    setIsVerifying(true)
    setPaymentStatus(attempt > 1
      ? `Waiting for on-chain confirmation... (${attempt}/${maxAttempts})`
      : 'Verifying payment...')
    setPurchaseError(null)

    try {
      const res = await fetch('/api/x402/tickets/verify/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: hash,
          paymentReference: paymentDetails.paymentReference,
          payer: address,
          chainId: paymentDetails.chainId,
          symbol: paymentDetails.tokenSymbol,
          tokenAddress: paymentDetails.tokenAddress,
          ...(paymentDetails.tokenSymbol === 'ETH' && ethPayerSignature && {
            ethPayerSignature,
          }),
        }),
      })

      const data = await res.json()
      if (data.success) {
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
        // Redirect to confirmation page (payment details are fetched from the API)
        router.push(`/tickets/store/order/${data.order.code}/${data.order.secret}`)
        return
      }

      // Auto-retry on transient errors (tx broadcast but not yet indexed / confirmed)
      const msg = `${data.error || ''} ${data.details || ''}`.toLowerCase()
      const isRetryable =
        msg.includes('not found') ||
        msg.includes('try again') ||
        msg.includes('not mined') ||
        msg.includes('insufficient confirmations') ||
        msg.includes('rpc error')
      if (attempt < maxAttempts && isRetryable) {
        await new Promise(r => setTimeout(r, retryDelay))
        return verifyPayment(hash, attempt + 1)
      }

      setPurchaseError(data.error || 'Payment verification failed')
      setPaymentStatus(null)
      setIsVerifying(false)
    } catch {
      // Network error — auto-retry
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, retryDelay))
        return verifyPayment(hash, attempt + 1)
      }
      setPurchaseError('Failed to verify payment')
      setPaymentStatus(null)
      setIsVerifying(false)
    }
  }

  // ── Checkout button state ──
  const checkoutEnabled = contactDetailsFilled && cartItems.length > 0 && !isProcessing && (paymentMethod === 'fiat' || isConnected)

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
                <span className={css['mobile-order-bar-tax']}>incl. {vatPercent}% {vatLabel}</span>
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
                              <span className={css['panel-item-tax']}> ({vatLabel} {vatPercent}%)</span>
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
                    let price = parseFloat(item.price)
                    let variationName = ''
                    if (data.variationId) {
                      const variation = item.variations.find(v => v.id === data.variationId)
                      if (variation) {
                        price = parseFloat(variation.price)
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
                              <span className={css['panel-item-tax']}> ({vatLabel} {vatPercent}%)</span>
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
                  {paymentMethod === 'crypto' && (
                    <div className={`${css['summary-line']} ${css['summary-line-indent']}`}>
                      <span>Crypto discount (&ndash;{TICKETING.payment.cryptoDiscountPercent}%)</span>
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
                        <span>{vatLabel} @ {vatPercent}%</span>
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
                    By placing your order, you agree to Devcon&apos;s{' '}
                    <Link to="/terms-of-service">
                      <strong>Terms &amp; Conditions</strong>
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy-policy">
                      <strong>Privacy Policy</strong>
                    </Link>
                    .
                  </p>
                  <p>
                    An order confirmation with your tickets will be sent to the email provided during checkout. If you
                    don&apos;t receive a confirmation email, please{' '}
                    <a href="mailto:support@devcon.org">
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
                  {availableAddons.map(category => {
                    const availableItems = category.items.filter(i => i.available)
                    if (availableItems.length === 0) return null
                    return (
                      <div key={category.categoryId} className={css['swag-grid']}>
                        {category.categoryName && (
                          <h4 className={css['addon-category-title']}>{category.categoryName}</h4>
                        )}
                        {availableItems.map(item => {
                          const sel = selectedAddons.get(item.id)
                          const qty = sel?.quantity || 0
                          const isFree = parseFloat(item.price) === 0
                          const hasVariations = item.variations.length > 0
                          return (
                            <div key={item.id} className={css['swag-card']}>
                              <div className={css['swag-image']} />
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
                              <div className={css['swag-right']}>
                                {hasVariations ? (
                                  /* Items with variations: size dropdown */
                                  <Select
                                    value={sel?.variationId ? String(sel.variationId) : ''}
                                    onValueChange={val => {
                                      setAddonVariation(item.id, val ? Number(val) : undefined)
                                    }}
                                  >
                                    <SelectTrigger className="min-w-[140px] h-9 text-sm">
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
                                ) : category.maxCount > 1 ? (
                                  /* Paid items without variations: quantity +/- */
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
                                      disabled={qty >= category.maxCount}
                                    >
                                      <Plus size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  /* Simple toggle */
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
                                <span className={isFree ? css['swag-price-free'] : css['addon-price']}>
                                  {isFree ? 'FREE' : `$${parseFloat(item.price).toFixed(2)}`}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                  <button type="button" className={css['btn-continue']} onClick={() => goToNextSection('swag')}>
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
                        Your Devcon tickets will be linked with this{attendeeNameAsked ? ' name and' : ''} email address.
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
                          className={showContactErrors && attendeeNameRequired && firstName.trim() === '' ? 'border-[#ef4444] shadow-none' : ''}
                          value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                        />
                        {showContactErrors && attendeeNameRequired && firstName.trim() === '' && (
                          <p className={css['field-error']}>Please enter your first name.</p>
                        )}
                      </div>
                      <div className={css['field']}>
                        <label htmlFor="last-name">&nbsp;</label>
                        <Input
                          id="last-name"
                          type="text"
                          placeholder="Last name"
                          className={showContactErrors && attendeeNameRequired && lastName.trim() === '' ? 'border-[#ef4444] shadow-none' : ''}
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
                        <label htmlFor="confirm-email">&nbsp;</label>
                        <Input
                          id="confirm-email"
                          type="email"
                          placeholder="Confirm email"
                          className={showContactErrors && (confirmEmail.trim() === '' || email.trim() !== confirmEmail.trim()) ? 'border-[#ef4444] shadow-none' : ''}
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
                    <label
                      className="flex items-start gap-3 p-3 border border-[#e5e5e5] rounded-[10px] bg-white cursor-pointer"
                    >
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
                              attendeeNameRequired && firstName.trim() === '' ? 'first-name' :
                              attendeeNameRequired && lastName.trim() === '' ? 'last-name' :
                              !isEmail(email.trim()) ? 'email' : 'confirm-email'
                            document.getElementById(firstErrorId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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

                      return (
                        <div key={q.id} className={css['field']} data-question-id={q.id}>
                          <label>
                            {q.question}
                            {(q.required || q.dependsOn) && <span className={css['required']}>*</span>}
                          </label>
                          {q.helpText && (
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
                      <p className={css['description-title']}>Select your preferred payment method</p>
                      {!daimoPay && (
                        <p className={css['description-sub']}>
                          Receive a <strong>{TICKETING.payment.cryptoDiscountPercent}% discount</strong> when paying
                          with Crypto.
                        </p>
                      )}
                    </div>
                    <div className={css['payment-methods']}>
                      <label
                        className={`${css['payment-option']} ${paymentMethod === 'crypto' ? css['selected'] : ''}`}
                        onClick={() => setPaymentMethod('crypto')}
                      >
                        <input type="radio" name="payment" checked={paymentMethod === 'crypto'} readOnly />
                        <div className={css['payment-option-content']}>
                          <div className={css['payment-option-header']}>
                            <div className={css['payment-option-title-row']}>
                              <span className={css['payment-option-title']}>Crypto</span>
                              {!daimoPay && (
                                <span className={css['save-badge']}>
                                  SAVE {TICKETING.payment.cryptoDiscountPercent}%
                                </span>
                              )}
                            </div>
                            <div className={css['payment-icons']}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={TOKEN_ICONS.ETH} alt="ETH" className={css['payment-icon-box']} />
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={TOKEN_ICONS.USDC} alt="USDC" className={css['payment-icon-box']} />
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={TOKEN_ICONS.USDT0} alt="USDT" className={css['payment-icon-box']} />
                            </div>
                          </div>
                          <p className={css['payment-option-desc']}>
                            {daimoPay ? 'via Daimo Pay' : 'All major wallets & networks'}
                          </p>
                        </div>
                      </label>
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
                    </div>

                    {paymentMethod === 'crypto' && !daimoPay && (
                      <>
                        {isConnected ? (
                          <div className={css['wallet-connected']}>
                            <div className={css['wallet-connected-row']}>
                              <span className={css['wallet-connected-label']}>Connected to:</span>
                              <div className={css['wallet-connected-right']}>
                                {connector?.icon ? (
                                  <img
                                    src={connector.icon}
                                    alt={connector.name ?? 'wallet'}
                                    className={css['wallet-identicon']}
                                  />
                                ) : (
                                  <div className={css['wallet-identicon']} />
                                )}
                                <span className={css['wallet-address']}>
                                  {address?.slice(0, 6)}...{address?.slice(-4)}
                                </span>
                              </div>
                            </div>
                            <button type="button" className={css['wallet-disconnect-btn']} onClick={() => disconnect()}>
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

                    {paymentMethod === 'crypto' && !daimoPay && paymentDetails && address && (
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
                                const uniqueSymbols = [...new Set(paymentOptions.map(o => o.symbol))]

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

                                    {paymentStatus && !isProcessing && !isRedirecting && (
                                      <p className={`${css['payment-notice']} ${css['payment-notice-info']}`}>
                                        {paymentStatus}
                                      </p>
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
                                      <button
                                        type="button"
                                        className={css['btn-pay-now']}
                                        disabled={isProcessing}
                                        onClick={payWithSelectedOption}
                                      >
                                        <Lock size={20} />
                                        {isProcessing
                                          ? paymentStatus || 'Processing...'
                                          : `Pay: ${
                                              selectedOption.decimals >= 18
                                                ? formatEth(selectedOption.amount, 18)
                                                : (
                                                    Number(selectedOption.amount) /
                                                    10 ** selectedOption.decimals
                                                  ).toFixed(2)
                                            } ${displaySymbol(selectedOption.symbol)} on ${selectedOption.chain}`}
                                      </button>
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
                              paymentDetails && (
                                <p className={`${css['payment-notice']} ${css['payment-notice-error']}`}>
                                  Insufficient balance. Top up your wallet or connect one with enough USDC, USDT, or
                                  ETH.
                                </p>
                              )}
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
                            {voucherError && (
                              <p className={css['discount-error']}>{voucherError}</p>
                            )}
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
                              <span className={css['mobile-order-bar-tax']}>incl. {vatPercent}% {vatLabel}</span>
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
                                          <span className={css['panel-item-tax']}> ({vatLabel} {vatPercent}%)</span>
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
                                let price = parseFloat(item.price)
                                let variationName = ''
                                if (data.variationId) {
                                  const variation = item.variations.find(v => v.id === data.variationId)
                                  if (variation) {
                                    price = parseFloat(variation.price)
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
                                          <span className={css['panel-item-tax']}> ({vatLabel} {vatPercent}%)</span>
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
                              {paymentMethod === 'crypto' && (
                                <div className={`${css['summary-line']} ${css['summary-line-indent']}`}>
                                  <span>Crypto discount (&ndash;{TICKETING.payment.cryptoDiscountPercent}%)</span>
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
                                    <span>{vatLabel} @ {vatPercent}%</span>
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

                    {/* Mobile: T&C */}
                    <div className={css['mobile-only']}>
                      <p className={css['mobile-tc']}>
                        By placing your order, you agree to Devcon&apos;s{' '}
                        <Link to="/terms-of-service">
                          <strong>Terms & Conditions</strong>
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy-policy">
                          <strong>Privacy Policy</strong>
                        </Link>
                        .
                      </p>
                    </div>

                    {!(paymentMethod === 'crypto' && !daimoPay) && (
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

                    {(paymentMethod !== 'crypto' || daimoPay) && (
                      <div className={css['stripe-note']}>
                        {paymentMethod === 'crypto' && daimoPay ? (
                          <span>
                            Powered by <strong>Daimo Pay</strong>
                          </span>
                        ) : (
                          <img
                            src="/assets/images/powered-by-stripe.svg"
                            alt="Powered by Stripe"
                            className={css['stripe-note-img']}
                          />
                        )}
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
                            <span className={css['panel-item-tax']}> ({vatLabel} {vatPercent}%)</span>
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
                  let price = parseFloat(item.price)
                  let variationName = ''
                  if (data.variationId) {
                    const variation = item.variations.find(v => v.id === data.variationId)
                    if (variation) {
                      price = parseFloat(variation.price)
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
                            <span className={css['panel-item-tax']}> ({vatLabel} {vatPercent}%)</span>
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
                    {voucherError && (
                      <p className={css['discount-error']}>{voucherError}</p>
                    )}
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
                {paymentMethod === 'crypto' && (
                  <div className={`${css['summary-line']} ${css['summary-line-indent']}`}>
                    <span>Crypto discount (&ndash;{TICKETING.payment.cryptoDiscountPercent}%)</span>
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
                      <span>{vatLabel} @ {vatPercent}%</span>
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
                  By placing your order, you agree to Devcon&apos;s{' '}
                  <Link to="/terms-of-service">
                    <strong>Terms & Conditions</strong>
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy-policy">
                    <strong>Privacy Policy</strong>
                  </Link>
                  .
                </p>
                <p>
                  An order confirmation with your tickets will be sent to the email provided during checkout. If you
                  don&apos;t receive a confirmation email, please{' '}
                  <a href="mailto:support@devcon.org">
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
