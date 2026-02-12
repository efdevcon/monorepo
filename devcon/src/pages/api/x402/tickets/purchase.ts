/**
 * x402 Tickets Purchase API - Create order and get payment requirements
 * POST /api/x402/tickets/purchase
 *
 * Request body:
 * {
 *   email: string,
 *   tickets: [{ itemId: number, variationId?: number, quantity: number }],
 *   addons?: [{ itemId: number, quantity: number }],
 *   answers: [{ questionId: number, answer: string | number | string[] }],
 *   attendee: {
 *     name: { given_name: string, family_name: string },
 *     email?: string,
 *     company?: string,
 *     country?: string
 *   }
 * }
 *
 * Returns HTTP 402 Payment Required with payment details
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyTypedData, type Hex } from 'viem'
import { getItems, getQuestions, getTicketPurchaseInfo, createOrder, markOrderPaid } from 'services/pretix'
import {
  createPaymentRequirements,
  getPaymentRecipient,
  buildX402PaymentRequiredSpec,
  encodePaymentRequiredHeader,
  decodePaymentSignatureHeader,
  encodeSettlementResponseHeader,
  usdToUsdcAmount,
  verifyPayment,
} from 'services/x402'
import { storePendingOrder, getPendingOrder, claimPendingOrder, reserveCompletedOrder, finalizeCompletedOrder, removeCompletedOrderReservation, checkPurchaseRateLimit, TxHashAlreadyUsedError, PendingTicketOrder } from 'services/ticketStore'
import { executeTransferWithAuthorization, getUsdcDomain, getTransferWithAuthorizationTypes } from 'services/relayer'
import {
  X402PaymentRequirements,
  X402PaymentBlockV2,
  type PaymentRequired,
  type PaymentPayload,
  type SettleResponse,
  X402_VERSION,
  EIP3009Authorization,
  SUPPORTED_ASSETS_MAINNET,
  SUPPORTED_ASSETS_TESTNET,
  getUsdcConfigForChainId,
} from 'types/x402'
import { PretixOrderCreateRequest, PretixOrderPosition, PretixAnswerInput } from 'types/pretix'
import { validateAddressEIP55, addressesEqual } from 'utils/x402Validation'

interface PurchaseRequest {
  email: string
  /** Wallet address that will pay (required; prevents tx reuse attack) */
  intendedPayer: string
  tickets: {
    itemId: number
    variationId?: number
    quantity?: number
  }[]
  addons?: {
    itemId: number
    quantity?: number
  }[]
  answers: {
    questionId: number
    answer: string | number | string[]
  }[]
  attendee: {
    name: {
      given_name: string
      family_name: string
    }
    email?: string
    company?: string
    country?: string
  }
}

interface PurchaseResponse {
  success: true
  paymentRequired: true
  /** x402 PaymentRequired (@x402/core) for SDK-compliant clients */
  x402: PaymentRequired
  /** x402 v2–style payment block (multi-chain, CAIP assets) */
  payment: X402PaymentBlockV2
  paymentDetails: X402PaymentRequirements
  orderSummary: {
    tickets: { name: string; price: string; quantity: number }[]
    addons: { name: string; price: string; quantity: number }[]
    subtotal: string
    cryptoDiscount: string
    total: string
    currency: string
  }
}

interface ErrorResponse {
  success: false
  error: string
  details?: string[]
}

// 3% discount for crypto payments
const CRYPTO_DISCOUNT_PERCENT = 3

const COINBASE_ETH_SPOT = 'https://api.coinbase.com/v2/prices/ETH-USD/spot'

async function fetchEthPriceUsd(): Promise<number> {
  const res = await fetch(COINBASE_ETH_SPOT)
  if (!res.ok) throw new Error('Failed to fetch ETH price')
  const data = await res.json()
  const price = parseFloat(data?.data?.amount)
  if (!Number.isFinite(price)) throw new Error('Invalid ETH price')
  return price
}

/** Build expected ETH amount in wei per chain ID (for secure native ETH verification) */
function buildExpectedEthWeiByChain(
  totalUsd: number,
  ethPriceUsd: number,
  chainIdsWithEth: number[]
): Record<string, string> {
  const weiPerChain: Record<string, string> = {}
  const weiAmount = BigInt(Math.ceil((totalUsd / ethPriceUsd) * 1e18))
  const weiStr = weiAmount.toString()
  for (const chainId of chainIdsWithEth) {
    weiPerChain[String(chainId)] = weiStr
  }
  return weiPerChain
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PurchaseResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  // x402 v2: If PAYMENT-SIGNATURE header is present, handle payment retry flow (spec §5.2)
  const paymentSigHeader = (req.headers['payment-signature'] ?? req.headers['PAYMENT-SIGNATURE']) as string | undefined
  if (paymentSigHeader) {
    return handlePaymentSignatureRetry(req, res, paymentSigHeader)
  }

  try {
    // Rate limit purchases per IP
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
    const { allowed } = await checkPurchaseRateLimit(clientIp)
    if (!allowed) {
      return res.status(429).json({
        success: false,
        error: 'Too many purchase requests. Please try again later.',
      })
    }

    const body = req.body as PurchaseRequest

    // Validate request
    const validationErrors = validatePurchaseRequest(body)
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: validationErrors,
      })
    }

    // Fetch current ticket info to validate items and get prices
    const ticketInfo = await getTicketPurchaseInfo()
    const itemsById = new Map(ticketInfo.tickets.map((t) => [t.id, t]))

    // Calculate order items and prices
    const orderTickets: { name: string; price: string; quantity: number; item: any }[] = []
    const orderAddons: { name: string; price: string; quantity: number; item: any }[] = []

    // Process tickets
    for (const ticket of body.tickets) {
      const item = itemsById.get(ticket.itemId)
      if (!item) {
        return res.status(400).json({
          success: false,
          error: `Invalid ticket ID: ${ticket.itemId}`,
        })
      }

      if (!item.available) {
        return res.status(400).json({
          success: false,
          error: `Ticket not available: ${item.name}`,
        })
      }

      let price = item.price
      let name = item.name

      // Handle variations
      if (ticket.variationId) {
        const variation = item.variations.find((v) => v.id === ticket.variationId)
        if (!variation) {
          return res.status(400).json({
            success: false,
            error: `Invalid variation ID: ${ticket.variationId} for ticket ${ticket.itemId}`,
          })
        }
        price = variation.price
        name = `${item.name} - ${variation.name}`
      }

      const quantity = ticket.quantity || 1
      orderTickets.push({ name, price, quantity, item })
    }

    // Process addons
    if (body.addons) {
      for (const addon of body.addons) {
        const item = itemsById.get(addon.itemId)
        if (!item) {
          return res.status(400).json({
            success: false,
            error: `Invalid addon ID: ${addon.itemId}`,
          })
        }

        const quantity = addon.quantity || 1
        orderAddons.push({ name: item.name, price: item.price, quantity, item })
      }
    }

    // Calculate totals
    const ticketSubtotal = orderTickets.reduce(
      (sum, t) => sum + parseFloat(t.price) * t.quantity,
      0
    )
    const addonSubtotal = orderAddons.reduce((sum, a) => sum + parseFloat(a.price) * a.quantity, 0)
    const subtotal = ticketSubtotal + addonSubtotal
    const cryptoDiscount = (subtotal * CRYPTO_DISCOUNT_PERCENT) / 100
    const total = subtotal - cryptoDiscount

    // Build Pretix order positions
    const positions: PretixOrderPosition[] = []

    // Add ticket positions
    for (const ticket of orderTickets) {
      for (let i = 0; i < ticket.quantity; i++) {
        const answers: PretixAnswerInput[] = body.answers
          .filter((a) => {
            // Find the question and check if it applies to this item
            const question = ticketInfo.questions.find((q) => q.id === a.questionId)
            if (!question) return false
            // Filter out empty answers
            if (!a.answer && a.answer !== 0) return false
            if (Array.isArray(a.answer) && a.answer.length === 0) return false
            if (typeof a.answer === 'string' && a.answer.trim() === '') return false
            return question.appliesToItems.length === 0 || question.appliesToItems.includes(ticket.item.id)
          })
          .map((a) => {
            const question = ticketInfo.questions.find((q) => q.id === a.questionId)
            // For choice questions (C = single choice, M = multiple choice), use options array
            if (question && (question.type === 'C' || question.type === 'M')) {
              const optionIds = Array.isArray(a.answer)
                ? a.answer.map(v => parseInt(String(v)))
                : [parseInt(String(a.answer))]
              // Find the selected option text for the answer field
              const selectedOption = question.options.find(o => o.id === optionIds[0])
              return {
                question: a.questionId,
                answer: selectedOption?.answer || String(optionIds[0]),
                options: optionIds,
              }
            }
            // For other question types, use answer string
            return {
              question: a.questionId,
              answer: Array.isArray(a.answer) ? a.answer.join(', ') : String(a.answer),
            }
          })
          .filter((a) => a && a.answer && a.answer.trim() !== '') // Remove any empty answers

        positions.push({
          item: ticket.item.id,
          variation: body.tickets.find((t) => t.itemId === ticket.item.id)?.variationId || null,
          price: ticket.price,
          attendee_name: null, // Use attendee_name_parts instead
          attendee_name_parts: body.attendee.name,
          attendee_email: body.attendee.email || body.email,
          company: body.attendee.company || null,
          street: null,
          zipcode: null,
          city: null,
          country: body.attendee.country || null,
          state: null,
          addon_to: null,
          subevent: null,
          answers,
          seat: null,
          voucher: null,
        })
      }
    }

    // Add addon positions (linked to first ticket position)
    for (const addon of orderAddons) {
      for (let i = 0; i < addon.quantity; i++) {
        positions.push({
          item: addon.item.id,
          variation: null,
          price: addon.price,
          attendee_name: null,
          attendee_name_parts: {},
          attendee_email: null,
          company: null,
          street: null,
          zipcode: null,
          city: null,
          country: null,
          state: null,
          addon_to: 0, // Link to first position
          subevent: null,
          answers: [],
          seat: null,
          voucher: null,
        })
      }
    }

    // Create Pretix order request (will be submitted after payment)
    const pretixOrder: PretixOrderCreateRequest = {
      email: body.email,
      locale: 'en',
      sales_channel: 'web',
      payment_provider: 'manual', // We handle payment via x402
      positions,
      send_email: true,
    }

    // Create payment requirements
    const paymentRequirements = createPaymentRequirements(
      '/api/x402/tickets/purchase',
      total.toFixed(2),
      3600, // 1 hour expiry
      {
        email: body.email,
        ticketCount: orderTickets.reduce((sum, t) => sum + t.quantity, 0),
        addonCount: orderAddons.reduce((sum, a) => sum + a.quantity, 0),
      }
    )

    const isTestnet = process.env.NEXT_PUBLIC_CHAIN_ENV !== 'mainnet'
    const supportedAssetsForOrder = isTestnet ? SUPPORTED_ASSETS_TESTNET : SUPPORTED_ASSETS_MAINNET
    const chainIdsWithEth = [
      ...new Set(
        supportedAssetsForOrder
          .filter((a) => a.symbol === 'ETH')
          .map((a) => parseInt(a.chainId.replace(/^eip155:/, ''), 10))
      ),
    ]
    let expectedEthAmountWeiByChain: Record<string, string> = {}
    try {
      const ethPriceUsd = await fetchEthPriceUsd()
      expectedEthAmountWeiByChain = buildExpectedEthWeiByChain(total, ethPriceUsd, chainIdsWithEth)
    } catch (e) {
      console.warn('[purchase] Could not fetch ETH price for expectedEthAmountWeiByChain:', (e as Error).message)
    }

    // Store pending order (includes server-computed ETH wei per chain for secure verification)
    const pendingOrder: PendingTicketOrder = {
      paymentReference: paymentRequirements.payment.paymentReference,
      orderData: pretixOrder,
      totalUsd: total.toFixed(2),
      createdAt: Date.now() / 1000,
      expiresAt: paymentRequirements.payment.expiresAt,
      intendedPayer: (validateAddressEIP55(body.intendedPayer.trim()) as { valid: true; checksummed: string }).checksummed,
      expectedEthAmountWeiByChain: Object.keys(expectedEthAmountWeiByChain).length > 0 ? expectedEthAmountWeiByChain : undefined,
      metadata: {
        ticketIds: orderTickets.map((t) => t.item.id),
        addonIds: orderAddons.map((a) => a.item.id),
        email: body.email,
      },
    }
    await storePendingOrder(pendingOrder)

    const supportedAssets = isTestnet ? SUPPORTED_ASSETS_TESTNET : SUPPORTED_ASSETS_MAINNET
    const x402Spec = await buildX402PaymentRequiredSpec(paymentRequirements, {
      error: 'PAYMENT-SIGNATURE header or payment payload required',
      resourceDescription: 'Devcon ticket purchase',
    })
    const paymentBlock: X402PaymentBlockV2 = {
      paymentId: paymentRequirements.payment.paymentReference,
      amount: total,
      currency: ticketInfo.event.currency,
      referenceId: paymentRequirements.payment.paymentReference,
      status: 'pending',
      createdAt: Math.floor(Date.now() / 1000),
      supportedAssets,
    }

    // Return 402 Payment Required
    const response: PurchaseResponse = {
      success: true,
      paymentRequired: true,
      x402: x402Spec,
      payment: paymentBlock,
      paymentDetails: paymentRequirements,
      orderSummary: {
        tickets: orderTickets.map((t) => ({ name: t.name, price: t.price, quantity: t.quantity })),
        addons: orderAddons.map((a) => ({ name: a.name, price: a.price, quantity: a.quantity })),
        subtotal: subtotal.toFixed(2),
        cryptoDiscount: cryptoDiscount.toFixed(2),
        total: total.toFixed(2),
        currency: ticketInfo.event.currency,
      },
    }

    // Set x402 headers (v2: PAYMENT-REQUIRED base64-encoded PaymentRequired; legacy: X-Payment-*)
    res.setHeader('PAYMENT-REQUIRED', encodePaymentRequiredHeader(x402Spec))
    // Legacy header (X-Payment-Required, NOT Payment-Required which would overwrite PAYMENT-REQUIRED)
    res.setHeader('X-Payment-Required', 'true')
    res.setHeader('X-Payment-Network', paymentRequirements.payment.network)
    res.setHeader('X-Payment-Token', paymentRequirements.payment.tokenAddress)
    res.setHeader('X-Payment-Amount', paymentRequirements.payment.amount)
    res.setHeader('X-Payment-Recipient', paymentRequirements.payment.recipient)
    res.setHeader('X-Payment-Reference', paymentRequirements.payment.paymentReference)

    return res.status(402).json(response)
  } catch (error) {
    console.error('Error creating purchase:', error)
    return res.status(500).json({
      success: false,
      error: `Failed to create purchase: ${(error as Error).message}`,
    })
  }
}

function validatePurchaseRequest(body: PurchaseRequest): string[] {
  const errors: string[] = []

  if (!body.email || typeof body.email !== 'string' || !body.email.includes('@')) {
    errors.push('Valid email is required')
  }

  if (!body.tickets || !Array.isArray(body.tickets) || body.tickets.length === 0) {
    errors.push('At least one ticket is required')
  }

  if (!body.attendee || !body.attendee.name) {
    errors.push('Attendee name is required')
  } else {
    if (!body.attendee.name.given_name) {
      errors.push('Attendee given name is required')
    }
    if (!body.attendee.name.family_name) {
      errors.push('Attendee family name is required')
    }
  }

  if (!body.answers || !Array.isArray(body.answers)) {
    errors.push('Answers array is required')
  }

  if (!body.intendedPayer || typeof body.intendedPayer !== 'string') {
    errors.push('intendedPayer (wallet address) is required')
  } else {
    const v = validateAddressEIP55(body.intendedPayer)
    if (!v.valid) errors.push(`intendedPayer: ${v.error}`)
  }

  return errors
}

// ============== x402 v2 PAYMENT-SIGNATURE retry flow ==============

const PRETIX_BASE_URL = process.env.PRETIX_BASE_URL || 'https://ticketh.xyz'
const PRETIX_ORGANIZER = process.env.PRETIX_ORGANIZER || 'devcon'
const PRETIX_EVENT = process.env.PRETIX_EVENT || '7'

function getTicketUrl(orderCode: string, secret?: string): string {
  const baseUrl = PRETIX_BASE_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
  if (secret) {
    return `${baseUrl}/${PRETIX_ORGANIZER}/${PRETIX_EVENT}/order/${orderCode}/${secret}/`
  }
  return `${baseUrl}/${PRETIX_ORGANIZER}/${PRETIX_EVENT}/order/${orderCode}/`
}

/**
 * Handle x402 v2 PAYMENT-SIGNATURE retry flow (spec §5.2).
 * Client retries the same POST with a PAYMENT-SIGNATURE header containing
 * a base64-encoded PaymentPayload. We verify the signature, settle on-chain
 * via the relayer, create the Pretix order, and return the resource with
 * a PAYMENT-RESPONSE header.
 */
async function handlePaymentSignatureRetry(
  _req: NextApiRequest,
  res: NextApiResponse,
  paymentSigHeader: string
) {
  // 1. Decode PAYMENT-SIGNATURE header (base64 → PaymentPayload)
  let paymentPayload: PaymentPayload
  try {
    paymentPayload = decodePaymentSignatureHeader(paymentSigHeader)
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid PAYMENT-SIGNATURE header encoding' })
  }

  // 2. Validate x402 version
  if (paymentPayload.x402Version !== X402_VERSION) {
    return res.status(400).json({ success: false, error: `Unsupported x402 version: ${paymentPayload.x402Version}` })
  }

  // 3. Extract accepted requirements, network chain, and payment reference
  const accepted = paymentPayload.accepted
  if (!accepted || accepted.scheme !== 'exact') {
    return res.status(400).json({ success: false, error: 'Unsupported or missing payment scheme' })
  }

  const networkChainId = parseInt(accepted.network.replace('eip155:', ''), 10)
  if (!getUsdcConfigForChainId(networkChainId)) {
    return res.status(400).json({ success: false, error: `Unsupported chain: ${accepted.network}` })
  }

  const paymentReference = (accepted.extra as Record<string, unknown>)?.paymentReference as string | undefined
  if (!paymentReference) {
    return res.status(400).json({ success: false, error: 'Missing paymentReference in accepted.extra' })
  }

  // 4. Get pending order
  const pendingOrder = await getPendingOrder(paymentReference)
  if (!pendingOrder) {
    return res.status(404).json({ success: false, error: 'Payment reference not found or expired' })
  }

  // 5. Check expiry
  if (Date.now() / 1000 > pendingOrder.expiresAt) {
    return res.status(400).json({ success: false, error: 'Payment reference has expired' })
  }

  // 6. Extract authorization and signature from payload (exact EVM scheme)
  const exactPayload = paymentPayload.payload as { signature: string; authorization: EIP3009Authorization } | undefined
  if (!exactPayload?.signature || !exactPayload?.authorization) {
    return res.status(400).json({ success: false, error: 'Missing signature or authorization in payload' })
  }

  const { authorization } = exactPayload
  const rawSignature = exactPayload.signature

  // 7. Verify payer matches intended payer (prevents tx reuse attack)
  if (!addressesEqual(authorization.from, pendingOrder.intendedPayer)) {
    return res.status(403).json({ success: false, error: 'Payer does not match intended payer for this order' })
  }

  // 8. Verify authorization params match expected values
  const paymentRecipient = getPaymentRecipient()
  const expectedAmount = usdToUsdcAmount(pendingOrder.totalUsd)

  if (!addressesEqual(authorization.to, paymentRecipient)) {
    return res.status(400).json({ success: false, error: 'Authorization recipient must be the payment recipient address' })
  }
  if (BigInt(String(authorization.value)) < BigInt(expectedAmount)) {
    return res.status(400).json({ success: false, error: 'Authorization amount insufficient' })
  }

  const now = Math.floor(Date.now() / 1000)
  const validBefore = typeof authorization.validBefore === 'string' ? parseInt(authorization.validBefore, 10) : Number(authorization.validBefore)
  const validAfter = typeof authorization.validAfter === 'string' ? parseInt(authorization.validAfter, 10) : Number(authorization.validAfter)

  if (validBefore > 0 && now > validBefore) {
    return res.status(400).json({ success: false, error: 'Authorization has expired' })
  }
  if (now < validAfter) {
    return res.status(400).json({ success: false, error: 'Authorization is not yet valid' })
  }

  // Cap validBefore: reject authorizations with no expiry (0) or expiry beyond order expiry + 5 min buffer
  const maxValidBefore = pendingOrder.expiresAt + 5 * 60
  if (validBefore === 0 || validBefore > maxValidBefore) {
    return res.status(400).json({ success: false, error: `Authorization validBefore too far in the future or unlimited (must be before ${maxValidBefore})` })
  }

  // 9. Verify EIP-712 signature (chain-specific domain)
  const domain = await getUsdcDomain(networkChainId)
  const types = getTransferWithAuthorizationTypes()
  const message = {
    from: authorization.from as Hex,
    to: authorization.to as Hex,
    value: BigInt(String(authorization.value)),
    validAfter: BigInt(validAfter),
    validBefore: BigInt(validBefore),
    nonce: authorization.nonce as Hex,
  }

  try {
    const sigValid = await verifyTypedData({
      address: authorization.from as Hex,
      domain: { ...domain, verifyingContract: domain.verifyingContract as Hex },
      types,
      primaryType: 'TransferWithAuthorization',
      message,
      signature: rawSignature as Hex,
    })
    if (!sigValid) {
      return res.status(402).json({ success: false, error: 'Invalid payment signature' })
    }
  } catch {
    return res.status(402).json({ success: false, error: 'Signature verification failed' })
  }

  // 10. Execute transfer via relayer (gas-sponsored)
  const sigHex = rawSignature.startsWith('0x') ? rawSignature : `0x${rawSignature}`
  const r = sigHex.slice(0, 66)
  const s = `0x${sigHex.slice(66, 130)}`
  let v = parseInt(sigHex.slice(130, 132), 16)
  if (v < 27) v += 27

  let txHash: string
  try {
    const result = await executeTransferWithAuthorization(
      {
        from: authorization.from,
        to: authorization.to,
        value: String(authorization.value),
        validAfter,
        validBefore,
        nonce: authorization.nonce,
      },
      { v, r, s },
      networkChainId
    )
    txHash = result.txHash
  } catch (error) {
    return res.status(402).json({
      success: false,
      error: `Settlement failed: ${(error as Error).message}`,
    })
  }

  // 11. Verify on-chain (wait for receipt)
  const verification = await verifyPayment({
    txHash,
    paymentReference,
    payer: authorization.from,
    chainId: networkChainId,
    expectedAmount,
  })

  if (!verification.verified) {
    return res.status(500).json({
      success: false,
      error: `On-chain verification failed: ${verification.error}`,
    })
  }

  // 12. Claim pending order atomically (prevents race conditions)
  const claimedOrder = await claimPendingOrder(paymentReference)
  if (!claimedOrder) {
    return res.status(409).json({
      success: false,
      error: 'Order already completed or in progress',
    })
  }

  // 13. Reserve tx_hash BEFORE creating Pretix order (prevents orphaned tickets on double-spend race)
  try {
    await reserveCompletedOrder(
      txHash,
      paymentReference,
      authorization.from,
      verification.confirmedAt || Math.floor(Date.now() / 1000)
    )
  } catch (error) {
    if (error instanceof TxHashAlreadyUsedError) {
      await storePendingOrder(claimedOrder)
      return res.status(409).json({
        success: false,
        error: 'This transaction has already been used to complete an order',
      })
    }
    throw error
  }

  // 14. Create Pretix order + mark as paid
  let pretixOrder
  try {
    pretixOrder = await createOrder(claimedOrder.orderData)
    await markOrderPaid(pretixOrder.code)
  } catch (error) {
    // Remove reservation and restore pending order so user can retry
    await removeCompletedOrderReservation(paymentReference)
    await storePendingOrder(claimedOrder)
    return res.status(500).json({
      success: false,
      error: `Failed to create ticket order: ${(error as Error).message}`,
    })
  }

  // 15. Finalize: replace placeholder with real Pretix order code
  await finalizeCompletedOrder(paymentReference, pretixOrder.code)

  // 15. Build PAYMENT-RESPONSE header (x402 v2 spec)
  const settlementResponse: SettleResponse = {
    success: true,
    transaction: txHash,
    network: `eip155:${networkChainId}` as `${string}:${string}`,
    payer: authorization.from,
  }
  res.setHeader('PAYMENT-RESPONSE', encodeSettlementResponseHeader(settlementResponse))

  // 16. Return resource (order confirmation)
  return res.status(200).json({
    success: true,
    order: {
      code: pretixOrder.code,
      secret: pretixOrder.secret,
      email: pretixOrder.email,
      total: pretixOrder.total,
      status: 'paid',
      ticketUrl: getTicketUrl(pretixOrder.code, pretixOrder.secret),
    },
    payment: {
      txHash,
      payer: authorization.from,
      confirmedAt: verification.confirmedAt || Math.floor(Date.now() / 1000),
      blockNumber: verification.blockNumber || 0,
    },
  })
}
