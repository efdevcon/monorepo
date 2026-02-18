'use client'

import React, { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, useAccount, useDisconnect, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useSignTypedData } from 'wagmi'
import type { Config } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { wagmiAdapter } from 'context/appkit-config'
import { parseUnits, encodeFunctionData } from 'viem'

const queryClient = new QueryClient()

// ERC20 ABI for transfer
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

// Types
interface TicketInfo {
  id: number
  name: string
  description: string | null
  price: string
  currency: string
  available: boolean
  availableCount: number | null
  isAdmission: boolean
  variations: { id: number; name: string; price: string; available: boolean }[]
  addons: {
    categoryId: number
    categoryName: string
    minCount: number
    maxCount: number
    items: { id: number; name: string; price: string; available: boolean }[]
  }[]
}

interface QuestionInfo {
  id: number
  question: string
  helpText: string | null
  type: string
  required: boolean
  appliesToItems: number[]
  options: { id: number; answer: string }[]
  dependsOn?: { questionId: number; values: string[] }
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

// Main component wrapped with providers
export default function X402TestPage() {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config}>
      <QueryClientProvider client={queryClient}>
        <X402TestContent />
      </QueryClientProvider>
    </WagmiProvider>
  )
}

function X402TestContent() {
  const { address, isConnected, chain } = useAccount()
  const { open } = useAppKit()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain()

  // Hydration fix - only render wallet state after mount
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // State
  const [step, setStep] = useState<'tickets' | 'details' | 'payment' | 'complete'>('tickets')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ticket data
  const [ticketData, setTicketData] = useState<{
    event: { name: string; currency: string; dateFrom: string; dateTo: string | null; location: string | null }
    tickets: TicketInfo[]
    questions: QuestionInfo[]
    paymentInfo: { network: string; chainId: number; tokenSymbol: string; tokenAddress: string; discountForCrypto: string }
  } | null>(null)

  // Cart
  const [selectedTicket, setSelectedTicket] = useState<TicketInfo | null>(null)
  const [quantity, setQuantity] = useState(1)

  // Form - load from localStorage
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [answers, setAnswers] = useState<Record<number, string>>({})

  // Load saved form data from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('x402-ticket-form')
      if (saved) {
        try {
          const data = JSON.parse(saved)
          if (data.email) setEmail(data.email)
          if (data.firstName) setFirstName(data.firstName)
          if (data.lastName) setLastName(data.lastName)
          if (data.answers) setAnswers(data.answers)
        } catch (e) {
          console.error('Failed to load saved form data:', e)
        }
      }
    }
  }, [])

  // Save form data to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && mounted) {
      const data = { email, firstName, lastName, answers }
      localStorage.setItem('x402-ticket-form', JSON.stringify(data))
    }
  }, [email, firstName, lastName, answers, mounted])

  // Payment
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [orderSummary, setOrderSummary] = useState<any>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [orderResult, setOrderResult] = useState<any>(null)

  // Contract write for USDC transfer (direct payment)
  const { writeContract, data: writeData, isPending: isWritePending, error: writeError } = useWriteContract()

  // Sign typed data for gasless payment
  const { signTypedData, data: signatureData, isPending: isSignPending, error: signError } = useSignTypedData()

  // Wait for transaction
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: writeData,
  })

  // Gasless payment state
  const [useGasless, setUseGasless] = useState(true) // Default to gasless
  const [authorizationData, setAuthorizationData] = useState<any>(null)
  const [gaslessTxHash, setGaslessTxHash] = useState<string | null>(null)
  const [isExecutingGasless, setIsExecutingGasless] = useState(false)

  // Fetch tickets on mount
  useEffect(() => {
    fetchTickets()
  }, [])

  // Handle successful transaction (direct payment)
  useEffect(() => {
    if (isTxSuccess && writeData && paymentDetails) {
      setTxHash(writeData)
      verifyPayment(writeData)
    }
  }, [isTxSuccess, writeData])

  // Handle signature for gasless payment
  useEffect(() => {
    if (signatureData && authorizationData && paymentDetails) {
      executeGaslessTransfer(signatureData)
    }
  }, [signatureData])

  // Handle gasless transaction completion
  useEffect(() => {
    if (gaslessTxHash && paymentDetails) {
      verifyPayment(gaslessTxHash)
    }
  }, [gaslessTxHash])

  async function fetchTickets() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/x402/tickets')
      const data = await res.json()
      if (data.success) {
        setTicketData(data.data)
      } else {
        setError(data.error)
      }
    } catch (e) {
      setError('Failed to fetch tickets')
    }
    setLoading(false)
  }

  async function createPurchase() {
    if (!selectedTicket || !email || !firstName || !lastName) {
      setError('Please fill in all required fields')
      return
    }
    if (!isConnected || !address) {
      setError('Please connect your wallet first (required for intended payer)')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/x402/tickets/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          intendedPayer: address,
          tickets: [{ itemId: selectedTicket.id, quantity }],
          answers: Object.entries(answers).map(([qId, answer]) => ({
            questionId: parseInt(qId),
            answer,
          })),
          attendee: {
            name: { given_name: firstName, family_name: lastName },
            email,
          },
        }),
      })

      const data = await res.json()
      if (data.success && data.paymentRequired) {
        setPaymentDetails(data.paymentDetails.payment)
        setOrderSummary(data.orderSummary)
        setStep('payment')
      } else {
        setError(data.error || 'Failed to create purchase')
      }
    } catch (e) {
      setError('Failed to create purchase')
    }
    setLoading(false)
  }

  async function handleSwitchNetwork() {
    if (!paymentDetails) return
    try {
      switchChain({ chainId: paymentDetails.chainId })
    } catch (e) {
      setError('Failed to switch network')
    }
  }

  async function executePayment() {
    if (!paymentDetails || !isConnected || !mounted) {
      setError('Wallet not connected or no payment details')
      return
    }

    // Check if on correct chain
    if (chain?.id !== paymentDetails.chainId) {
      setError(`Please switch to ${paymentDetails.network} network first`)
      return
    }

    setError(null)

    try {
      writeContract({
        address: paymentDetails.tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [
          paymentDetails.recipient as `0x${string}`,
          BigInt(paymentDetails.amount),
        ],
      })
    } catch (e) {
      setError('Failed to execute payment')
    }
  }

  // Gasless payment functions
  async function prepareGaslessPayment() {
    if (!paymentDetails || !address) {
      setError('Wallet not connected or no payment details')
      return
    }

    // Note: Gasless works on any chain since user just signs
    setError(null)
    setLoading(true)

    try {
      // Step 1: Prepare authorization (get typed data to sign)
      const prepareRes = await fetch('/api/x402/tickets/relayer/prepare-authorization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentReference: paymentDetails.paymentReference,
          from: address,
        }),
      })

      const prepareData = await prepareRes.json()
      if (!prepareData.success) {
        setError(prepareData.error || 'Failed to prepare authorization')
        setLoading(false)
        return
      }

      // Store authorization data for later use
      setAuthorizationData(prepareData)

      // Step 2: Sign the typed data
      const { domain, types, message } = prepareData.typedData
      signTypedData({
        domain: {
          ...domain,
          verifyingContract: domain.verifyingContract as `0x${string}`,
        },
        types,
        primaryType: 'ReceiveWithAuthorization',
        message: {
          from: message.from as `0x${string}`,
          to: message.to as `0x${string}`,
          value: BigInt(message.value),
          validAfter: BigInt(message.validAfter),
          validBefore: BigInt(message.validBefore),
          nonce: message.nonce as `0x${string}`,
        },
      })
    } catch (e) {
      setError('Failed to prepare gasless payment')
    }
    setLoading(false)
  }

  async function executeGaslessTransfer(signature: string) {
    if (!authorizationData || !paymentDetails) return

    setIsExecutingGasless(true)
    setError(null)

    try {
      // Parse signature into v, r, s components
      const r = signature.slice(0, 66)
      const s = '0x' + signature.slice(66, 130)
      const v = parseInt(signature.slice(130, 132), 16)

      const executeRes = await fetch('/api/x402/tickets/relayer/execute-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentReference: paymentDetails.paymentReference,
          authorization: authorizationData.authorization,
          signature: { v, r, s },
        }),
      })

      const executeData = await executeRes.json()
      if (executeData.success) {
        setGaslessTxHash(executeData.txHash)
        setTxHash(executeData.txHash)
      } else {
        setError(executeData.error || 'Failed to execute transfer')
      }
    } catch (e) {
      setError('Failed to execute gasless transfer')
    }
    setIsExecutingGasless(false)
  }

  async function verifyPayment(hash: string) {
    if (!paymentDetails || !address) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/x402/tickets/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: hash,
          paymentReference: paymentDetails.paymentReference,
          payer: address,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setOrderResult(data)
        setStep('complete')
      } else {
        setError(data.error || 'Payment verification failed')
      }
    } catch (e) {
      setError('Failed to verify payment')
    }
    setLoading(false)
  }

  function selectTicket(ticket: TicketInfo) {
    setSelectedTicket(ticket)
    // Initialize answers for required questions, preserving any saved answers
    if (ticketData) {
      setAnswers(prevAnswers => {
        const newAnswers: Record<number, string> = { ...prevAnswers }
        ticketData.questions
          .filter(q => q.required && (q.appliesToItems.length === 0 || q.appliesToItems.includes(ticket.id)))
          .forEach(q => {
            // Only set default if no saved answer exists
            if (!newAnswers[q.id]) {
              if (q.type === 'C' && q.options.length > 0) {
                newAnswers[q.id] = String(q.options[0].id)
              } else {
                newAnswers[q.id] = ''
              }
            }
          })
        return newAnswers
      })
    }
    setStep('details')
  }

  // Render
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: 10 }}>x402 Ticket Purchase Test</h1>

      {/* Wallet Connection */}
      <div style={{ marginBottom: 20, padding: 15, background: '#f5f5f5', borderRadius: 8 }}>
        {!mounted ? (
          <div>Loading wallet...</div>
        ) : isConnected ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Connected:</strong> {address?.slice(0, 6)}...{address?.slice(-4)}
              <br />
              <small>Chain: {chain?.name} ({chain?.id})</small>
            </div>
            <button onClick={() => disconnect()} style={buttonStyle}>Disconnect</button>
          </div>
        ) : (
          <div>
            <p style={{ margin: '0 0 10px' }}>Connect your wallet to purchase tickets</p>
            <button onClick={() => open()} style={buttonStyle}>
              Connect Wallet
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ padding: 15, background: '#fee', border: '1px solid #fcc', borderRadius: 8, marginBottom: 20, color: '#c00' }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>}

      {/* Step 1: Ticket Selection */}
      {step === 'tickets' && ticketData && !loading && (
        <div>
          <h2>Event: {ticketData.event.name}</h2>
          <p style={{ color: '#666' }}>
            {ticketData.event.location}<br />
            {new Date(ticketData.event.dateFrom).toLocaleDateString()} - {ticketData.event.dateTo ? new Date(ticketData.event.dateTo).toLocaleDateString() : ''}
          </p>

          <h3>Select a Ticket</h3>
          <div style={{ display: 'grid', gap: 15 }}>
            {ticketData.tickets.filter(t => t.isAdmission && t.available).map(ticket => (
              <div
                key={ticket.id}
                style={{
                  padding: 20,
                  border: '2px solid #ddd',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onClick={() => selectTicket(ticket)}
                onMouseOver={(e) => (e.currentTarget.style.borderColor = '#007bff')}
                onMouseOut={(e) => (e.currentTarget.style.borderColor = '#ddd')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: 18 }}>{ticket.name}</strong>
                    {ticket.description && <p style={{ margin: '5px 0 0', color: '#666' }}>{ticket.description}</p>}
                    {ticket.availableCount !== null && (
                      <small style={{ color: '#888' }}>{ticket.availableCount} remaining</small>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>${ticket.price}</div>
                    <small style={{ color: '#666' }}>{ticketData.event.currency}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, padding: 15, background: '#e8f5e9', borderRadius: 8 }}>
            <strong>Payment Info:</strong> {ticketData.paymentInfo.tokenSymbol} on {ticketData.paymentInfo.network}
            <br />
            <small>Crypto discount: {ticketData.paymentInfo.discountForCrypto}</small>
          </div>
        </div>
      )}

      {/* Step 2: Details Form */}
      {step === 'details' && selectedTicket && ticketData && (
        <div>
          <button onClick={() => setStep('tickets')} style={{ ...buttonStyle, marginBottom: 20 }}>
            ← Back to Tickets
          </button>

          <h2>Order Details</h2>

          <div style={{ padding: 15, background: '#f5f5f5', borderRadius: 8, marginBottom: 20 }}>
            <strong>{selectedTicket.name}</strong> - ${selectedTicket.price} x {quantity} = <strong>${(parseFloat(selectedTicket.price) * quantity).toFixed(2)}</strong>
          </div>

          <div style={{ display: 'grid', gap: 15 }}>
            <div>
              <label style={labelStyle}>Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                placeholder="your@email.com"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
              <div>
                <label style={labelStyle}>First Name *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Last Name *</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Required Questions */}
            {ticketData.questions
              .filter(q => q.required && (q.appliesToItems.length === 0 || q.appliesToItems.includes(selectedTicket.id)))
              .map(q => (
                <div key={q.id}>
                  <label style={labelStyle}>{q.question} *</label>
                  {q.helpText && <small style={{ display: 'block', color: '#666', marginBottom: 5 }}>{q.helpText}</small>}

                  {q.type === 'C' ? (
                    <select
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      style={inputStyle}
                    >
                      {q.options.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.answer}</option>
                      ))}
                    </select>
                  ) : q.type === 'T' ? (
                    <textarea
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      style={{ ...inputStyle, minHeight: 100 }}
                    />
                  ) : (
                    <input
                      type={q.type === 'N' ? 'number' : 'text'}
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      style={inputStyle}
                    />
                  )}
                </div>
              ))}
          </div>

          <button
            onClick={createPurchase}
            disabled={loading || !email || !firstName || !lastName}
            style={{ ...buttonStyle, ...primaryButtonStyle, marginTop: 20, width: '100%' }}
          >
            {loading ? 'Processing...' : 'Continue to Payment'}
          </button>
        </div>
      )}

      {/* Step 3: Payment */}
      {step === 'payment' && paymentDetails && orderSummary && (
        <div>
          <h2>Payment Required</h2>

          <div style={{ padding: 20, background: '#fff3cd', borderRadius: 8, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 15px' }}>Order Summary</h3>
            {orderSummary.tickets.map((t: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t.name} x{t.quantity}</span>
                <span>${t.price}</span>
              </div>
            ))}
            <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #ddd' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal</span>
              <span>${orderSummary.subtotal}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#28a745' }}>
              <span>Crypto Discount (3%)</span>
              <span>-${orderSummary.cryptoDiscount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 18, marginTop: 10 }}>
              <span>Total</span>
              <span>${orderSummary.total} {orderSummary.currency}</span>
            </div>
          </div>

          <div style={{ padding: 20, background: '#f5f5f5', borderRadius: 8, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 15px' }}>Payment Details</h3>
            <table style={{ width: '100%' }}>
              <tbody>
                <tr><td style={{ padding: '5px 0', color: '#666' }}>Network</td><td style={{ textAlign: 'right' }}>{paymentDetails.network}</td></tr>
                <tr><td style={{ padding: '5px 0', color: '#666' }}>Token</td><td style={{ textAlign: 'right' }}>{paymentDetails.tokenSymbol}</td></tr>
                <tr><td style={{ padding: '5px 0', color: '#666' }}>Amount</td><td style={{ textAlign: 'right', fontWeight: 'bold' }}>{paymentDetails.amountFormatted}</td></tr>
                <tr><td style={{ padding: '5px 0', color: '#666' }}>Recipient</td><td style={{ textAlign: 'right', fontSize: 12, wordBreak: 'break-all' }}>{paymentDetails.recipient}</td></tr>
                <tr><td style={{ padding: '5px 0', color: '#666' }}>Expires</td><td style={{ textAlign: 'right' }}>{new Date(paymentDetails.expiresAt * 1000).toLocaleString()}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Payment Mode Toggle */}
          <div style={{ marginBottom: 20, padding: 15, background: '#e3f2fd', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={useGasless}
                  onChange={(e) => setUseGasless(e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                <strong>Gasless Payment</strong>
              </label>
              <span style={{ color: '#666', fontSize: 14 }}>
                {useGasless ? '(We pay the gas fees!)' : '(You pay gas fees)'}
              </span>
            </div>
            {useGasless && (
              <p style={{ margin: '10px 0 0', fontSize: 13, color: '#555' }}>
                Sign a message to authorize the transfer. Our relayer will execute it and pay the gas.
              </p>
            )}
          </div>

          {!mounted ? (
            <div style={{ padding: 15, background: '#f5f5f5', borderRadius: 8, textAlign: 'center' }}>
              Loading wallet...
            </div>
          ) : !isConnected ? (
            <div style={{ padding: 15, background: '#fee', borderRadius: 8, textAlign: 'center' }}>
              Please connect your wallet to pay
            </div>
          ) : useGasless ? (
            // Gasless payment - no network switch needed for signing
            <button
              onClick={prepareGaslessPayment}
              disabled={isSignPending || isExecutingGasless || loading}
              style={{ ...buttonStyle, ...primaryButtonStyle, width: '100%', background: '#4caf50' }}
            >
              {loading ? 'Preparing...' : isSignPending ? 'Sign in Wallet...' : isExecutingGasless ? 'Executing Transfer...' : `Sign to Pay ${paymentDetails.amountFormatted} (Gasless)`}
            </button>
          ) : chain?.id !== paymentDetails.chainId ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ padding: 15, background: '#fff3cd', borderRadius: 8, marginBottom: 15 }}>
                You're on <strong>{chain?.name}</strong>. Please switch to <strong>{paymentDetails.network}</strong> to pay.
              </div>
              <button
                onClick={handleSwitchNetwork}
                disabled={isSwitchingChain}
                style={{ ...buttonStyle, ...primaryButtonStyle, width: '100%', background: '#ff9800' }}
              >
                {isSwitchingChain ? 'Switching...' : `Switch to ${paymentDetails.network}`}
              </button>
            </div>
          ) : (
            <button
              onClick={executePayment}
              disabled={isWritePending || isTxLoading}
              style={{ ...buttonStyle, ...primaryButtonStyle, width: '100%' }}
            >
              {isWritePending ? 'Confirm in Wallet...' : isTxLoading ? 'Waiting for Confirmation...' : `Pay ${paymentDetails.amountFormatted}`}
            </button>
          )}

          {writeError && (
            <div style={{ padding: 15, background: '#fee', borderRadius: 8, marginTop: 15, color: '#c00' }}>
              {writeError.message}
            </div>
          )}

          {signError && (
            <div style={{ padding: 15, background: '#fee', borderRadius: 8, marginTop: 15, color: '#c00' }}>
              {signError.message}
            </div>
          )}

          {txHash && (
            <div style={{ padding: 15, background: '#e8f5e9', borderRadius: 8, marginTop: 15 }}>
              Transaction submitted: <code style={{ fontSize: 12 }}>{txHash}</code>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && orderResult && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 60, marginBottom: 20 }}>✅</div>
          <h2 style={{ color: '#28a745' }}>Purchase Complete!</h2>

          <div style={{ padding: 20, background: '#e8f5e9', borderRadius: 8, marginBottom: 20 }}>
            <p><strong>Order Code:</strong> {orderResult.order.code}</p>
            <p><strong>Email:</strong> {orderResult.order.email}</p>
            <p><strong>Total:</strong> ${orderResult.order.total}</p>
            {orderResult.payment?.txHash && (
              <p>
                <strong>Transaction:</strong>{' '}
                <a
                  href={`${paymentDetails?.chainId === 8453 ? 'https://basescan.org' : 'https://sepolia.basescan.org'}/tx/${orderResult.payment.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#007bff', wordBreak: 'break-all' }}
                >
                  {orderResult.payment.txHash.slice(0, 10)}...{orderResult.payment.txHash.slice(-8)}
                </a>
              </p>
            )}
          </div>

          <a
            href={orderResult.order.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...buttonStyle, ...primaryButtonStyle, display: 'inline-block', textDecoration: 'none' }}
          >
            View Your Ticket →
          </a>

          <div style={{ marginTop: 30 }}>
            <button onClick={() => {
              setStep('tickets')
              setSelectedTicket(null)
              setPaymentDetails(null)
              setOrderResult(null)
              setTxHash(null)
            }} style={buttonStyle}>
              Buy Another Ticket
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Styles
const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  fontSize: 14,
  borderRadius: 6,
  border: '1px solid #ddd',
  background: '#fff',
  cursor: 'pointer',
}

const primaryButtonStyle: React.CSSProperties = {
  background: '#007bff',
  color: '#fff',
  border: 'none',
  fontSize: 16,
  padding: '15px 30px',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 5,
  fontWeight: 500,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 14,
  borderRadius: 6,
  border: '1px solid #ddd',
  boxSizing: 'border-box',
}
