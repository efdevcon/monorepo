import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Page from 'components/common/layouts/page'
import { Link } from 'components/common/link'
import themes from '../../themes.module.scss'
import css from './checkout.module.scss'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  WagmiProvider,
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useWalletClient,
  useSendTransaction,
} from 'wagmi'
import { createConfig, http } from 'wagmi'
import { baseSepolia, base, mainnet, optimism, arbitrum, polygon } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'
import { QuestionInfo } from 'types/pretix'

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID || ''

// Optional RPC URLs to avoid hitting public endpoints (e.g. sepolia.base.org) on every poll.
// Wagmi/viem poll the connected chain for block number / tx receipts, so without custom URLs
// you'll see constant calls to the chain's default RPC.
const RPC_URLS = {
  [baseSepolia.id]: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
  [base.id]: process.env.NEXT_PUBLIC_BASE_RPC_URL,
  [mainnet.id]: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL,
  [optimism.id]: process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL,
  [arbitrum.id]: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL,
  [polygon.id]: process.env.NEXT_PUBLIC_POLYGON_RPC_URL,
}

const wagmiConfig = createConfig({
  chains: [baseSepolia, base, mainnet, optimism, arbitrum, polygon],
  connectors: [injected(), ...(WC_PROJECT_ID ? [walletConnect({ projectId: WC_PROJECT_ID })] : [])],
  transports: {
    [baseSepolia.id]: RPC_URLS[baseSepolia.id] ? http(RPC_URLS[baseSepolia.id]) : http(),
    [base.id]: RPC_URLS[base.id] ? http(RPC_URLS[base.id]) : http(),
    [mainnet.id]: RPC_URLS[mainnet.id] ? http(RPC_URLS[mainnet.id]) : http(),
    [optimism.id]: RPC_URLS[optimism.id] ? http(RPC_URLS[optimism.id]) : http(),
    [arbitrum.id]: RPC_URLS[arbitrum.id] ? http(RPC_URLS[arbitrum.id]) : http(),
    [polygon.id]: RPC_URLS[polygon.id] ? http(RPC_URLS[polygon.id]) : http(),
  },
})

const queryClient = new QueryClient()

const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

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

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 15l-6-6-6 6" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

// ── Constants ──

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
    q: 'Can I purchase tickets with crypto?',
    a: 'Yes! We accept crypto payments with a 3% discount. You can pay using all major wallets and tokens.',
  },
  {
    q: 'When will I get my ticket?',
    a: 'Your ticket will be sent to the email address provided during checkout shortly after purchase.',
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
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <CheckoutContent />
      </QueryClientProvider>
    </WagmiProvider>
  )
}

// ── Checkout content ──

function CheckoutContent() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors } = useConnect()
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

  // ── Questions from API ──
  const [questions, setQuestions] = useState<QuestionInfo[]>([])

  // ── Form state ──
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [newsletter, setNewsletter] = useState(false)
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({})
  const [swag1Size, setSwag1Size] = useState('Size: Male M')

  // ── Payment flow state ──
  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [orderSummary, setOrderSummary] = useState<any>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)

  // Gasless state
  const [authorizationData, setAuthorizationData] = useState<any>(null)
  const [isExecutingGasless, setIsExecutingGasless] = useState(false)

  // Payment options (multi-chain)
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([])
  const [paymentOptionsLoading, setPaymentOptionsLoading] = useState(false)
  const [selectedOption, setSelectedOption] = useState<PaymentOption | null>(null)
  const [showInsufficient, setShowInsufficient] = useState(false)
  const [tokenFilter, setTokenFilter] = useState<string | null>(null)

  // Fiat/Stripe state
  const [fiatPaymentUrl, setFiatPaymentUrl] = useState<string | null>(null)
  const [fiatOrderCode, setFiatOrderCode] = useState<string | null>(null)
  const [fiatOrderSecret, setFiatOrderSecret] = useState<string | null>(null)
  const [showFiatModal, setShowFiatModal] = useState(false)
  const fiatPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const paymentOptionsAutoLoadedRef = useRef<string | null>(null)
  const tokenFilterAutoSelectedRef = useRef(false)

  // Wagmi hooks
  const { writeContract, data: writeData, isPending: isWritePending, error: writeError } = useWriteContract()
  const { data: walletClient } = useWalletClient()
  const [isSigningDirect, setIsSigningDirect] = useState(false)
  const [directSignError, setDirectSignError] = useState<string | null>(null)
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: writeData })
  const { sendTransactionAsync, data: sendTxHash, isPending: isSendTxPending } = useSendTransaction()
  const { isLoading: isSendTxReceiptLoading, isSuccess: isSendTxSuccess } = useWaitForTransactionReceipt({ hash: sendTxHash })

  // ── Load cart from localStorage ──
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('devcon-ticket-cart')
      if (raw) {
        const data: CartData = JSON.parse(raw)
        setCartItems(data.items || [])
        setPaymentInfo(data.paymentInfo || null)
      }
    } catch {
      // ignore
    }
  }, [])

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

  // ── Save form data to localStorage when it changes ──
  useEffect(() => {
    if (typeof window === 'undefined' || !mounted) return
    const data = { firstName, lastName, email, confirmEmail, answers }
    localStorage.setItem('devcon-checkout-form', JSON.stringify(data))
  }, [firstName, lastName, email, confirmEmail, answers, mounted])

  // ── Fetch questions from API ──
  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await fetch('/api/x402/tickets')
        const data = await res.json()
        if (data.success) {
          setQuestions(data.data.questions || [])
        }
      } catch {
        // questions will just be empty
      }
    }
    fetchQuestions()
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

    const sufficient = paymentOptions.filter(o => Boolean(o.signingRequest) && o.sufficient)
    const base = sufficient.length > 0 ? sufficient : paymentOptions
    const uniqueSymbols = [...new Set(base.map(o => o.symbol))]
    if (base.length <= 4 || uniqueSymbols.length <= 1) return

    const usdBySymbol = new Map<string, number>()
    for (const opt of base) {
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

  // ── Poll fiat order status ──
  const pollFiatStatus = useCallback(async () => {
    if (!fiatOrderCode || !fiatOrderSecret) return
    try {
      const res = await fetch(`/api/x402/tickets/order-status?code=${fiatOrderCode}&secret=${fiatOrderSecret}`)
      const data = await res.json()
      if (data.success && data.status === 'p') {
        // Payment confirmed
        if (fiatPollRef.current) {
          clearInterval(fiatPollRef.current)
          fiatPollRef.current = null
        }
        setShowFiatModal(false)
        setFiatPaymentUrl(null)
        setPaymentStatus(null)
        localStorage.removeItem('devcon-ticket-cart')
        // Redirect to confirmation page
        router.push(`/tickets/store/order/${data.code}/${data.secret}`)
      }
    } catch {
      // ignore polling errors
    }
  }, [fiatOrderCode, fiatOrderSecret])

  useEffect(() => {
    if (!showFiatModal || !fiatOrderCode) {
      if (fiatPollRef.current) {
        clearInterval(fiatPollRef.current)
        fiatPollRef.current = null
      }
      return
    }

    pollFiatStatus()
    fiatPollRef.current = setInterval(pollFiatStatus, 2000)
    return () => {
      if (fiatPollRef.current) {
        clearInterval(fiatPollRef.current)
        fiatPollRef.current = null
      }
    }
  }, [showFiatModal, fiatOrderCode, pollFiatStatus])

  // ── Derived cart values ──
  const subtotal = cartItems.reduce((sum, c) => sum + parseFloat(c.price) * c.quantity, 0)
  const cryptoDiscountPercent = paymentInfo?.discountForCrypto ? parseInt(paymentInfo.discountForCrypto) : 3
  const cryptoDiscount = paymentMethod === 'crypto' ? +(subtotal * cryptoDiscountPercent / 100).toFixed(2) : 0
  const totalUsd = (subtotal - cryptoDiscount).toFixed(2)

  // ── Section helpers ──
  const toggleSection = (id: string) => {
    setOpenSection(s => (s === id ? null : id))
  }

  const goToNextSection = (currentSectionId: string) => {
    const i = SECTION_ORDER.indexOf(currentSectionId as (typeof SECTION_ORDER)[number])
    if (i >= 0 && i < SECTION_ORDER.length - 1) {
      setOpenSection(SECTION_ORDER[i + 1])
    }
  }

  const contactDetailsFilled =
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    email.trim() !== '' &&
    confirmEmail.trim() !== '' &&
    email.trim() === confirmEmail.trim()

  // ── Get applicable questions for selected tickets ──
  const ticketIds = cartItems.map(c => c.ticketId)
  const applicableQuestions = questions.filter(
    q => !q.dependsOn && (q.appliesToItems.length === 0 || q.appliesToItems.some(id => ticketIds.includes(id)))
  )

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

  // ── Purchase flow ──
  function buildFormattedAnswers() {
    return Object.entries(answers)
      .filter(([_, v]) => {
        if (Array.isArray(v)) return v.length > 0
        return typeof v === 'string' && v.trim() !== ''
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

    if (paymentMethod === 'crypto' && (!isConnected || !address)) {
      setPurchaseError('Please connect your wallet first')
      return
    }

    setPurchaseLoading(true)
    setPurchaseError(null)
    setPaymentStatus('Creating order...')

    if (paymentMethod === 'fiat') {
      await handleFiatCheckout()
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
      const optRes = await fetch('/api/x402/tickets/payment-options', {
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

      const res = await fetch('/api/x402/tickets/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          intendedPayer: address!,
          tickets: cartItems.map(c => ({ itemId: c.ticketId, quantity: c.quantity })),
          answers: formattedAnswers,
          attendee: {
            name: { given_name: firstName, family_name: lastName },
            email,
          },
        }),
      })

      const data = await res.json()
      if (data.success && data.paymentRequired) {
        const payment = data.paymentDetails.payment
        setPaymentDetails(payment)
        setOrderSummary(data.orderSummary)
        setPaymentStatus('Awaiting payment...')
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

  async function handleFiatCheckout() {
    try {
      const formattedAnswers = buildFormattedAnswers()

      const res = await fetch('/api/x402/tickets/fiat-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          tickets: cartItems.map(c => ({ itemId: c.ticketId, quantity: c.quantity })),
          answers: formattedAnswers,
          attendee: {
            name: { given_name: firstName, family_name: lastName },
            email,
          },
        }),
      })

      const data = await res.json()
      if (data.success && data.paymentUrl) {
        setFiatPaymentUrl(data.paymentUrl)
        setFiatOrderCode(data.orderCode)
        setFiatOrderSecret(data.orderSecret)
        setShowFiatModal(true)
        setPaymentStatus(null)
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
      const prepareRes = await fetch('/api/x402/tickets/relayer/prepare-authorization', {
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
      const domainChainId = typeof domain.chainId === 'string'
        ? parseInt(domain.chainId, domain.chainId.startsWith('0x') ? 16 : 10)
        : domain.chainId
      if (domainChainId && chain?.id !== domainChainId && switchChain) {
        setPaymentStatus(`Switching to ${details.network}...`)
        await switchChain({ chainId: domainChainId })
      }
      setPaymentStatus('Sign in your wallet...')

      const signature = await signEIP712Direct({ domain, types, primaryType, message })

      setIsSigningDirect(false)
      await executeGaslessTransfer(signature, prepareData.authorization)
    } catch (e) {
      setDirectSignError((e as Error).message || 'Failed to prepare payment')
      setPurchaseError((e as Error).message || 'Failed to prepare payment')
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
      const r = signature.slice(0, 66)
      const s = '0x' + signature.slice(66, 130)
      const v = parseInt(signature.slice(130, 132), 16)

      const executeRes = await fetch('/api/x402/tickets/relayer/execute-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentReference: paymentDetails.paymentReference,
          authorization: auth,
          signature: { v, r, s },
          chainId: paymentDetails.chainId,
          tokenAddress: paymentDetails.tokenAddress,
        }),
      })

      const executeData = await executeRes.json()
      if (executeData.success) {
        setTxHash(executeData.txHash)
        await verifyPayment(executeData.txHash)
      } else {
        setPurchaseError(executeData.error || 'Failed to execute transfer')
        setPaymentStatus(null)
      }
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
        ? (Number(option.amount) / 1e18).toFixed(4)
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
        const domainChainId = typeof typed.domain.chainId === 'string'
          ? parseInt(typed.domain.chainId, typed.domain.chainId.startsWith('0x') ? 16 : 10)
          : typed.domain.chainId
        if (domainChainId && chain?.id !== domainChainId && switchChain) {
          setPaymentStatus(`Switching to ${selectedOption.chain}...`)
          await switchChain({ chainId: domainChainId })
        }
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
        setDirectSignError((e as Error).message || 'Invalid signing data')
        setPurchaseError((e as Error).message || 'Invalid signing data')
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
      const targetChainId = tx.chainId ? parseInt(tx.chainId.replace('0x', ''), 16) : paymentDetails.chainId
      if (chain?.id !== targetChainId && switchChain) {
        setPaymentStatus(`Switching to ${selectedOption.chain}...`)
        await switchChain({ chainId: targetChainId })
        setPaymentStatus(`Switched to ${selectedOption.chain} — click Pay again`)
        return
      }
      setPaymentStatus('Confirm in wallet...')
      try {
        await sendTransactionAsync({
          to: tx.to as `0x${string}`,
          value: BigInt(tx.value),
          data: (tx.data as `0x${string}`) || '0x',
        })
      } catch (e) {
        setPurchaseError((e as Error).message || 'Failed to send transaction')
        setPaymentStatus(null)
      }
    }
  }

  async function executeDirectPayment() {
    if (!paymentDetails || !isConnected || !mounted) return

    if (chain?.id !== paymentDetails.chainId) {
      setPurchaseError(`Please switch to ${paymentDetails.network} network first`)
      return
    }

    setPurchaseError(null)
    setPaymentStatus('Confirm in wallet...')

    try {
      writeContract({
        address: paymentDetails.tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [paymentDetails.recipient as `0x${string}`, BigInt(paymentDetails.amount)],
      })
    } catch {
      setPurchaseError('Failed to execute payment')
      setPaymentStatus(null)
    }
  }

  async function verifyPayment(hash: string) {
    if (!paymentDetails || !address) return

    setPaymentStatus('Verifying payment...')
    setPurchaseError(null)

    try {
      const res = await fetch('/api/x402/tickets/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: hash,
          paymentReference: paymentDetails.paymentReference,
          payer: address,
          chainId: paymentDetails.chainId,
          symbol: paymentDetails.tokenSymbol,
          tokenAddress: paymentDetails.tokenAddress,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setPaymentStatus(null)
        localStorage.removeItem('devcon-ticket-cart')
        // Redirect to confirmation page
        const params = new URLSearchParams({
          tx: hash,
          chainId: String(paymentDetails.chainId),
          symbol: paymentDetails.tokenSymbol,
          network: paymentDetails.network,
        })
        const confirmUrl = `/tickets/store/order/${data.order.code}/${data.order.secret}?${params.toString()}`
        router.push(confirmUrl)
        return
      } else {
        setPurchaseError(data.error || 'Payment verification failed')
        setPaymentStatus(null)
      }
    } catch {
      setPurchaseError('Failed to verify payment')
      setPaymentStatus(null)
    }
  }

  // ── Checkout button state ──
  const isProcessing =
    purchaseLoading ||
    isSigningDirect ||
    isExecutingGasless ||
    isWritePending ||
    isTxLoading ||
    isSendTxPending ||
    isSendTxReceiptLoading ||
    showFiatModal
  const checkoutEnabled = contactDetailsFilled && cartItems.length > 0 && !isProcessing && (paymentMethod === 'fiat' || isConnected)

  return (
    <Page theme={themes['tickets']} hideFooter>
      <div className={css['checkout-layout']}>
        <main className={css['main']}>
          <Link to="/tickets/store" className={css['back-link']}>
            <BackIcon />
            <span>Back</span>
          </Link>
          <h1 className={css['page-title']}>Checkout</h1>

          {/* Swag & Add-ons */}
          <div className={css['section-card']}>
            <button
              type="button"
              className={css['section-header']}
              onClick={() => toggleSection('swag')}
              aria-expanded={openSection === 'swag'}
            >
              <span>Swag & Add-ons</span>
              {openSection === 'swag' ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </button>
            {openSection === 'swag' && (
              <div className={css['section-body']}>
                <div className={css['swag-grid']}>
                  <div className={css['swag-card']}>
                    <div className={css['swag-image']} />
                    <div className={css['swag-info']}>
                      <h4>Swag item 1</h4>
                      <p>Lorem ipsum dolor sit amet consectetur. Luctus quis augue sed adipiscing sapien aliquam.</p>
                    </div>
                    <div className={css['swag-right']}>
                      <select
                        className={css['select-input']}
                        value={swag1Size}
                        onChange={e => setSwag1Size(e.target.value)}
                      >
                        <option>Size: Male M</option>
                        <option>Size: Male S</option>
                        <option>Size: Male L</option>
                        <option>Size: Female M</option>
                      </select>
                      <span className={css['swag-price-free']}>FREE</span>
                    </div>
                  </div>
                  <div className={css['swag-card']}>
                    <div className={css['swag-image']} />
                    <div className={css['swag-info']}>
                      <h4>Swag item 2</h4>
                      <p>Lorem ipsum dolor sit amet consectetur. Luctus quis augue sed adipiscing sapien aliquam.</p>
                    </div>
                    <div className={css['swag-right']}>
                      <span className={css['swag-price-free']}>FREE</span>
                    </div>
                  </div>
                </div>
                <button type="button" className={css['btn-continue']} onClick={() => goToNextSection('swag')}>
                  Continue
                </button>
              </div>
            )}
          </div>

          {/* Contact details */}
          <div className={css['section-card']}>
            <button
              type="button"
              className={css['section-header']}
              onClick={() => toggleSection('contact')}
              aria-expanded={openSection === 'contact'}
            >
              <span>Contact details</span>
              {openSection === 'contact' ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </button>
            {openSection === 'contact' && (
              <div className={css['section-body']}>
                <div className={css['description-block']}>
                  <p className={css['description-title']}>Where should we send your tickets?</p>
                  <p className={css['description-sub']}>
                    Your Devcon tickets will be linked with this name and email address.
                  </p>
                </div>
                <div className={css['field-row']}>
                  <div className={css['field']}>
                    <label htmlFor="first-name">Name*</label>
                    <input
                      id="first-name"
                      type="text"
                      className={css['text-input']}
                      placeholder="First name"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className={css['field']}>
                    <label htmlFor="last-name">&nbsp;</label>
                    <input
                      id="last-name"
                      type="text"
                      className={css['text-input']}
                      placeholder="Last name"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div className={css['field-row']}>
                  <div className={css['field']}>
                    <label htmlFor="email">Email*</label>
                    <input
                      id="email"
                      type="email"
                      className={css['text-input']}
                      placeholder="Enter email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                  <div className={css['field']}>
                    <label htmlFor="confirm-email">&nbsp;</label>
                    <input
                      id="confirm-email"
                      type="email"
                      className={css['text-input']}
                      placeholder="Confirm email"
                      value={confirmEmail}
                      onChange={e => setConfirmEmail(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className={`${css['rich-checkbox']} ${newsletter ? css['checked'] : ''}`}
                  onClick={() => setNewsletter(!newsletter)}
                >
                  <span className={css['rich-checkbox-box']}>
                    {newsletter && (
                      <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="#fff" strokeWidth="2">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </span>
                  <span className={css['rich-checkbox-content']}>
                    <span className={css['rich-checkbox-label']}>Subscribe to the Devcon newsletter</span>
                    <span className={css['rich-checkbox-desc']}>
                      Join &gt;11k subscribers and stay updated by getting the latest news delivered directly to your
                      inbox.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className={`${css['btn-continue']} ${!contactDetailsFilled ? css['btn-disabled'] : ''}`}
                  disabled={!contactDetailsFilled}
                  onClick={() => goToNextSection('contact')}
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
              className={css['section-header']}
              onClick={() => toggleSection('attendee')}
              aria-expanded={openSection === 'attendee'}
            >
              <span>Attendee information</span>
              {openSection === 'attendee' ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </button>
            {openSection === 'attendee' && (
              <div className={css['section-body']}>
                {applicableQuestions.map(q => (
                  <div key={q.id} className={css['field']}>
                    <label>
                      {q.question}
                      {q.required && <span className={css['required']}>*</span>}
                    </label>
                    {q.helpText && (
                      <span style={{ fontSize: '0.75rem', color: '#666', display: 'block', marginTop: '-0.5rem' }}>
                        {q.helpText}
                      </span>
                    )}

                    {q.type === 'C' && (
                      <select
                        className={css['text-input']}
                        value={(answers[q.id] as string) || ''}
                        onChange={e => updateAnswer(q.id, e.target.value)}
                      >
                        <option value="">Select an option</option>
                        {q.options.map(opt => (
                          <option key={opt.id} value={opt.id}>
                            {opt.answer}
                          </option>
                        ))}
                      </select>
                    )}

                    {q.type === 'M' && (
                      <div className={css['checkbox-group']}>
                        {q.options.map(opt => (
                          <label key={opt.id} className={css['checkbox-label']}>
                            <input
                              type="checkbox"
                              checked={((answers[q.id] as string[]) || []).includes(String(opt.id))}
                              onChange={() => toggleMultiAnswer(q.id, String(opt.id))}
                            />
                            {opt.answer}
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === 'B' && (
                      <div className={css['radio-group']}>
                        <label className={css['radio-label']}>
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            value="True"
                            checked={(answers[q.id] as string) === 'True'}
                            onChange={() => updateAnswer(q.id, 'True')}
                          />
                          Yes
                        </label>
                        <label className={css['radio-label']}>
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            value="False"
                            checked={(answers[q.id] as string) === 'False'}
                            onChange={() => updateAnswer(q.id, 'False')}
                          />
                          No
                        </label>
                      </div>
                    )}

                    {q.type === 'S' && (
                      <input
                        type="text"
                        className={css['text-input']}
                        value={(answers[q.id] as string) || ''}
                        onChange={e => updateAnswer(q.id, e.target.value)}
                      />
                    )}

                    {q.type === 'T' && (
                      <textarea
                        className={css['textarea-input']}
                        value={(answers[q.id] as string) || ''}
                        onChange={e => updateAnswer(q.id, e.target.value)}
                      />
                    )}

                    {q.type === 'N' && (
                      <input
                        type="number"
                        className={css['text-input']}
                        value={(answers[q.id] as string) || ''}
                        onChange={e => updateAnswer(q.id, e.target.value)}
                      />
                    )}

                    {q.type === 'CC' && (
                      <input
                        type="text"
                        className={css['text-input']}
                        placeholder="Country code (e.g. US)"
                        value={(answers[q.id] as string) || ''}
                        onChange={e => updateAnswer(q.id, e.target.value)}
                      />
                    )}
                  </div>
                ))}

                <button type="button" className={css['btn-continue']} onClick={() => goToNextSection('attendee')}>
                  Continue
                </button>
              </div>
            )}
          </div>

          {/* Payment */}
          <div className={css['section-card']}>
            <button
              type="button"
              className={css['section-header']}
              onClick={() => toggleSection('payment')}
              aria-expanded={openSection === 'payment'}
            >
              <span>Payment</span>
              {openSection === 'payment' ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </button>
            {openSection === 'payment' && (
              <div className={css['section-body']}>
                <div className={css['description-block']}>
                  <p className={css['description-title']}>Select your preferred payment method</p>
                  <p className={css['description-sub']}>
                    Receive a <strong>3% discount</strong> when paying with Crypto.
                  </p>
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
                          <span className={css['save-badge']}>SAVE 3%</span>
                        </div>
                        <div className={css['payment-icons']}>
                          <span className={css['payment-icon-box']} />
                          <span className={css['payment-icon-box']} />
                          <span className={css['payment-icon-box']} />
                          <span className={css['payment-icon-more']}>+20</span>
                        </div>
                      </div>
                      <p className={css['payment-option-desc']}>USDC (gasless) &amp; ETH</p>
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
                        <div className={css['payment-icons']}>
                          <span className={css['payment-icon-box-wide']} />
                          <span className={css['payment-icon-box-wide']} />
                          <span className={css['payment-icon-box-wide']} />
                          <span className={css['payment-icon-more']}>+5</span>
                        </div>
                      </div>
                      <p className={css['payment-option-desc']}>Debit / Credit Card</p>
                    </div>
                  </label>
                </div>

                {paymentMethod === 'crypto' && (
                  <div className={css['wallet-box']}>
                    {!mounted ? (
                      <p className={css['wallet-sub']}>Loading wallet...</p>
                    ) : isConnected ? (
                      <div className={css['wallet-connected']}>
                        <div>
                          <span className={css['wallet-address']}>
                            {address?.slice(0, 6)}...{address?.slice(-4)}
                          </span>
                          <br />
                          <span className={css['wallet-chain']}>
                            {chain?.name} ({chain?.id})
                          </span>
                        </div>
                        <button
                          type="button"
                          className={css['wallet-disconnect-btn']}
                          onClick={() => disconnect()}
                        >
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className={css['wallet-title']}>Connect your wallet to pay with crypto</p>
                        <div className={css['wallet-connectors']}>
                          {connectors.map(connector => (
                            <button
                              key={connector.uid}
                              type="button"
                              className={css['wallet-connect-btn']}
                              onClick={() => connect({ connector })}
                            >
                              {connector.name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {paymentMethod === 'crypto' && paymentDetails && address && (
                  <div className={css['payment-options-block']}>
                    <div className={css['payment-options-header']}>
                      <span className={css['payment-options-title']}>
                        {paymentOptionsLoading ? 'Loading payment options...' : 'Pay with'}
                      </span>
                      {paymentDetails?.paymentReference && (
                        <button
                          type="button"
                          className={css['payment-options-reload']}
                          onClick={() => fetchPaymentOptions()}
                          disabled={paymentOptionsLoading}
                          title="Refresh balances"
                        >
                          Refresh balances
                        </button>
                      )}
                    </div>
                    {paymentOptionsLoading ? null : (
                      <>
                        {paymentOptions.length > 0 && (() => {
                          const sufficient = paymentOptions.filter(o => Boolean(o.signingRequest) && o.sufficient)
                          const insufficient = paymentOptions.filter(o => !(Boolean(o.signingRequest) && o.sufficient))
                          const base = sufficient.length === 0 || showInsufficient ? paymentOptions : sufficient
                          const visible = tokenFilter ? base.filter(o => o.symbol === tokenFilter) : base

                          // Token tabs: show when >4 options in base list
                          const uniqueSymbols = [...new Set(base.map(o => o.symbol))]
                          const showTabs = base.length > 4 && uniqueSymbols.length > 1

                          return (
                            <>
                              {showTabs && (
                                <div className={css['token-tabs']}>
                                  <button
                                    type="button"
                                    className={`${css['token-tab']} ${tokenFilter === null ? css['token-tab--active'] : ''}`}
                                    onClick={() => setTokenFilter(null)}
                                  >
                                    All
                                  </button>
                                  {uniqueSymbols.map(sym => (
                                    <button
                                      key={sym}
                                      type="button"
                                      className={`${css['token-tab']} ${tokenFilter === sym ? css['token-tab--active'] : ''}`}
                                      onClick={() => setTokenFilter(tokenFilter === sym ? null : sym)}
                                    >
                                      {TOKEN_ICONS[sym] && (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img src={TOKEN_ICONS[sym]} alt={sym} className={css['token-tab-icon']} />
                                      )}
                                      {displaySymbol(sym)}
                                    </button>
                                  ))}
                                </div>
                              )}
                              <div className={css['payment-options-list']}>
                                {visible.map(opt => {
                                  const canPay = Boolean(opt.signingRequest) && opt.sufficient
                                  const isSelected = selectedOption?.asset === opt.asset
                                  const isGasless = opt.signingRequest?.method === 'eth_signTypedData_v4' || ['USDC', 'USDT0'].includes(opt.symbol)
                                  const chainIdNum = parseInt(opt.chainId.replace(/^eip155:/, ''), 10)
                                  const balanceFormatted =
                                    opt.decimals >= 18
                                      ? (Number(opt.balance) / 1e18).toFixed(4)
                                      : (Number(opt.balance) / 10 ** opt.decimals).toFixed(2)
                                  return (
                                    <button
                                      key={opt.asset}
                                      type="button"
                                      className={[
                                        css['payment-option-btn'],
                                        canPay ? css['payment-option-btn--sufficient'] : css['payment-option-btn--insufficient'],
                                        isSelected ? css['payment-option-btn--selected'] : '',
                                      ]
                                        .filter(Boolean)
                                        .join(' ')}
                                      disabled={!canPay}
                                      onClick={() => canPay && selectPaymentOption(opt)}
                                    >
                                      <span className={css['payment-option-icon']}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={TOKEN_ICONS[opt.symbol]} alt={opt.symbol} className={css['token-icon']} />
                                        {NETWORK_LOGOS[chainIdNum] && (
                                          /* eslint-disable-next-line @next/next/no-img-element */
                                          <img src={NETWORK_LOGOS[chainIdNum]} alt={opt.chain} className={css['network-badge']} />
                                        )}
                                      </span>
                                      <span className={css['payment-option-info']}>
                                        <span className={css['payment-option-symbol']}>
                                          {displaySymbol(opt.symbol)}
                                          {isGasless && <span className={css['gasless-badge']}>Gasless</span>}
                                        </span>
                                        <span className={css['payment-option-chain']}>on {opt.chain}</span>
                                      </span>
                                      <span className={css['payment-option-balance']}>
                                        {balanceFormatted} {displaySymbol(opt.symbol)}
                                      </span>
                                      {isSelected && <span className={css['payment-option-check']}>✓</span>}
                                    </button>
                                  )
                                })}
                              </div>
                              {insufficient.length > 0 && (
                                <button
                                  type="button"
                                  className={css['toggle-insufficient']}
                                  onClick={() => setShowInsufficient(v => !v)}
                                >
                                  {showInsufficient
                                    ? 'Hide insufficient balances'
                                    : `Show ${insufficient.length} more with insufficient balance`}
                                </button>
                              )}
                            </>
                          )
                        })()}
                        {selectedOption && (
                          <button
                            type="button"
                            className={css['btn-pay-now']}
                            disabled={isProcessing}
                            onClick={payWithSelectedOption}
                          >
                            {isProcessing
                              ? paymentStatus || 'Processing...'
                              : selectedOption.signingRequest?.method === 'eth_signTypedData_v4'
                                ? `Sign to pay — ${displaySymbol(selectedOption.symbol)} on ${selectedOption.chain}`
                                : `Pay — ${displaySymbol(selectedOption.symbol)} on ${selectedOption.chain}`}
                          </button>
                        )}
                        {!paymentOptionsLoading && paymentOptions.length > 0 && paymentOptions.filter(o => o.sufficient).length === 0 && paymentDetails && (
                          <p className={css['status-text']}>No option with sufficient balance. Connect a wallet with more USDC or ETH on supported chains.</p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {purchaseError && (
                  <div className={css['error-box']}>
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
                  <div className={css['error-box']}>{writeError?.message || directSignError}</div>
                )}

                {paymentStatus && <p className={css['status-text']}>{paymentStatus}</p>}

                {txHash && (
                  <div className={css['tx-status']}>Transaction: {txHash.slice(0, 16)}...</div>
                )}

                {!(paymentDetails && paymentMethod === 'crypto') && (
                  <button
                    type="button"
                    className={`${css['btn-checkout']} ${checkoutEnabled ? css['btn-checkout-active'] : ''}`}
                    disabled={!checkoutEnabled}
                    onClick={handleCheckout}
                  >
                    <span className={css['btn-checkout-left']}>
                      <LockIcon />
                      {isProcessing ? paymentStatus || 'Processing...' : 'Checkout'}
                    </span>
                    <span className={css['btn-checkout-divider']} />
                    <span>${totalUsd} USD</span>
                  </button>
                )}

                {paymentMethod !== 'crypto' && (
                  <div className={css['stripe-note']}>
                    <span>Powered by Stripe</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FAQ */}
          <div className={css['section-card']}>
            <button
              type="button"
              className={css['section-header']}
              onClick={() => toggleSection('faq')}
              aria-expanded={openSection === 'faq'}
            >
              <span>FAQ</span>
              {openSection === 'faq' ? <ChevronUpIcon /> : <ChevronDownIcon />}
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
                        {openFaqIndex === i ? <ChevronUpIcon /> : <ChevronDownIcon />}
                      </button>
                      {openFaqIndex === i && <div className={css['faq-answer']}>{item.a}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className={css['panel']}>
          <div className={css['panel-card']}>
            <div className={css['panel-banner']}>
              <span className={css['panel-banner-text']}>Devcon India</span>
            </div>
            <div className={css['panel-content']}>
              <div className={css['panel-items']}>
                {cartItems.length > 0 ? (
                  cartItems.map(item => (
                    <div key={item.ticketId} className={css['panel-item']}>
                      <span className={css['panel-item-name']}>{item.name}</span>
                      <div className={css['panel-item-right']}>
                        <span>x{item.quantity}</span>
                        <span className={css['panel-item-price']}>${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={css['panel-item']}>
                    <span className={css['panel-item-name']}>No tickets selected</span>
                    <div className={css['panel-item-right']}>
                      <span className={css['panel-item-price']}>$0.00</span>
                    </div>
                  </div>
                )}
                <div className={css['panel-item']}>
                  <div>
                    <span className={css['panel-item-name']}>Swag item one</span>
                    <div className={css['panel-item-meta']}>Size: Male M</div>
                  </div>
                  <div className={css['panel-item-right']}>
                    <span>x1</span>
                    <span className={css['panel-item-price']}>FREE</span>
                  </div>
                </div>
                <div className={css['panel-item']}>
                  <div>
                    <span className={css['panel-item-name']}>Swag item two</span>
                    <div className={css['panel-item-meta']}>Size: Male M</div>
                  </div>
                  <div className={css['panel-item-right']}>
                    <span>x1</span>
                    <span className={css['panel-item-price']}>FREE</span>
                  </div>
                </div>
              </div>
              <div className={css['discount-row']}>
                <input type="text" className={css['discount-input']} placeholder="Discount or Voucher Code" />
                <button type="button" className={css['discount-btn']}>
                  Apply
                </button>
              </div>
              <div className={css['summary-lines']}>
                <div className={css['summary-line']}>
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {paymentMethod === 'crypto' && (
                  <div className={`${css['summary-line']} ${css['summary-line-indent']}`}>
                    <span>Crypto discount (&ndash;3%)</span>
                    <span>&ndash;${cryptoDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className={css['summary-total']}>
                  <span>Total</span>
                  <div className={css['summary-total-values']}>
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
                  <Link to="/contact">
                    <strong>contact us</strong>
                  </Link>
                  .
                </p>
                <p>
                  Got a question?{' '}
                  <Link to="/tickets#faq">
                    <strong>Read our ticketing FAQs</strong>
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Fiat/Stripe Payment Modal */}
      {showFiatModal && fiatPaymentUrl && (
        <div className={css['fiat-modal-overlay']} onClick={() => {
          setShowFiatModal(false)
          setFiatPaymentUrl(null)
          setPaymentStatus(null)
        }}>
          <div className={css['fiat-modal']} onClick={e => e.stopPropagation()}>
            <div className={css['fiat-modal-header']}>
              <h3>Complete Payment</h3>
              <button
                type="button"
                className={css['fiat-modal-close']}
                onClick={() => {
                  setShowFiatModal(false)
                  setFiatPaymentUrl(null)
                  setPaymentStatus(null)
                }}
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className={css['fiat-modal-body']}>
              <iframe
                src={fiatPaymentUrl}
                title="Stripe Payment"
                className={css['fiat-iframe']}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
              />
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}

export async function getStaticProps() {
  return {
    props: {},
  }
}
