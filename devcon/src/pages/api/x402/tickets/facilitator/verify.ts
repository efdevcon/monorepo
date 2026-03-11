/**
 * x402 Facilitator POST /verify
 * Verifies a payment authorization without executing. Spec §7.1
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyTypedData, type Hex } from 'viem'
import { getPaymentRecipient, usdToUsdcAmount } from 'services/x402'
import { getPendingOrder } from 'services/ticketStore'
import {
  getTokenDomain,
  getTransferWithAuthorizationTypes,
  isSmartWalletSignature,
} from 'services/relayer'
import {
  X402FacilitatorVerifyRequest,
  type VerifyResponse,
  X402_ERROR_CODES,
  EIP3009Authorization,
  X402_VERSION,
  getGaslessTokenConfig,
  getGaslessConfigsForChain,
} from 'types/x402'
import { addressesEqual } from 'utils/x402Validation'
import { TICKETING } from 'config/ticketing'

function parseSignatureHex(sig: string): { v: number; r: Hex; s: Hex } {
  const hex = sig.startsWith('0x') ? sig : `0x${sig}`
  if (hex.length !== 132) {
    throw new Error('Invalid signature length')
  }
  const r = hex.slice(0, 66) as Hex
  const s = (`0x${hex.slice(66, 130)}`) as Hex
  let v = parseInt(hex.slice(130, 132), 16)
  if (v < 27) v += 27
  return { v, r, s }
}

function normalizeAuth(a: EIP3009Authorization): EIP3009Authorization & { value: string; validAfter: number; validBefore: number } {
  return {
    ...a,
    value: String(a.value),
    validAfter: typeof a.validAfter === 'string' ? parseInt(String(a.validAfter), 10) : Number(a.validAfter),
    validBefore: typeof a.validBefore === 'string' ? parseInt(String(a.validBefore), 10) : Number(a.validBefore),
  }
}

const FACILITATOR_API_KEY = process.env.X402_FACILITATOR_API_KEY

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerifyResponse>
) {
  if (!TICKETING.x402Agents) {
    return res.status(404).json({ isValid: false, invalidReason: 'x402 agent endpoints are disabled' as any })
  }

  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').end()
  }

  if (FACILITATOR_API_KEY && req.headers['x-facilitator-key'] !== FACILITATOR_API_KEY) {
    return res.status(401).json({ isValid: false, invalidReason: 'unauthorized' as any })
  }

  type ExactEvmPayload = { signature: string; authorization: EIP3009Authorization }
  const payer: string | undefined = undefined

  try {
    const body = req.body as X402FacilitatorVerifyRequest
    const payload = body?.paymentPayload?.payload as ExactEvmPayload | undefined
    const fromPayload = payload?.authorization?.from

    if (!body?.paymentPayload || !body?.paymentRequirements) {
      return res.status(400).json({
        isValid: false,
        invalidReason: X402_ERROR_CODES.INVALID_PAYMENT_REQUIREMENTS,
        payer: fromPayload,
      })
    }

    const { paymentPayload, paymentRequirements: reqRequirements } = body
    if (paymentPayload.x402Version !== X402_VERSION) {
      return res.status(400).json({
        isValid: false,
        invalidReason: X402_ERROR_CODES.INVALID_X402_VERSION,
        payer: fromPayload,
      })
    }

    if (reqRequirements.scheme !== 'exact') {
      return res.status(400).json({
        isValid: false,
        invalidReason: X402_ERROR_CODES.UNSUPPORTED_SCHEME,
        payer: fromPayload,
      })
    }

    const networkChainId = parseInt(reqRequirements.network.replace('eip155:', ''), 10)
    const tokenConfig = reqRequirements.asset
      ? getGaslessTokenConfig(networkChainId, reqRequirements.asset)
      : getGaslessConfigsForChain(networkChainId)[0]
    if (!tokenConfig) {
      return res.status(400).json({
        isValid: false,
        invalidReason: X402_ERROR_CODES.INVALID_NETWORK,
        payer: fromPayload,
      })
    }

    const paymentReference = reqRequirements.extra?.paymentReference as string | undefined
    if (!paymentReference) {
      return res.status(400).json({
        isValid: false,
        invalidReason: X402_ERROR_CODES.INVALID_PAYMENT_REQUIREMENTS,
        payer: fromPayload,
      })
    }

    const pendingOrder = await getPendingOrder(paymentReference)
    if (!pendingOrder) {
      return res.status(400).json({
        isValid: false,
        invalidReason: X402_ERROR_CODES.INVALID_PAYMENT_REQUIREMENTS,
        payer: fromPayload,
      })
    }

    // payTo must be the payment recipient (transferWithAuthorization sends directly)
    const paymentRecipient = getPaymentRecipient()
    if (reqRequirements.payTo.toLowerCase() !== paymentRecipient.toLowerCase()) {
      return res.status(400).json({
        isValid: false,
        invalidReason: X402_ERROR_CODES.INVALID_EXACT_EVM_PAYLOAD_RECIPIENT_MISMATCH,
        payer: fromPayload,
      })
    }

    const expectedAmount = usdToUsdcAmount(pendingOrder.totalUsd)
    const auth = normalizeAuth((paymentPayload.payload as ExactEvmPayload).authorization)
    const from = auth.from

    if (!addressesEqual(from, pendingOrder.intendedPayer)) {
      return res.status(400).json({
        isValid: false,
        invalidReason: X402_ERROR_CODES.INVALID_EXACT_EVM_PAYLOAD_RECIPIENT_MISMATCH,
        payer: from,
      })
    }

    if (!addressesEqual(auth.to, paymentRecipient)) {
      return res.status(400).json({
        isValid: false,
        invalidReason: X402_ERROR_CODES.INVALID_EXACT_EVM_PAYLOAD_RECIPIENT_MISMATCH,
        payer: from,
      })
    }

    if (BigInt(auth.value) < BigInt(expectedAmount)) {
      return res.status(400).json({
        isValid: false,
        invalidReason: X402_ERROR_CODES.INVALID_EXACT_EVM_PAYLOAD_AUTHORIZATION_VALUE,
        payer: from,
      })
    }

    const now = Math.floor(Date.now() / 1000)
    if (auth.validBefore > 0 && now > auth.validBefore) {
      return res.status(400).json({
        isValid: false,
        invalidReason: X402_ERROR_CODES.INVALID_EXACT_EVM_PAYLOAD_AUTHORIZATION_VALID_BEFORE,
        payer: from,
      })
    }
    if (now < auth.validAfter) {
      return res.status(400).json({
        isValid: false,
        invalidReason: X402_ERROR_CODES.INVALID_EXACT_EVM_PAYLOAD_AUTHORIZATION_VALID_AFTER,
        payer: from,
      })
    }

    // Reject unlimited or excessively long-lived authorizations (max 1 hour from now)
    const maxValidBefore = now + 60 * 60
    if (auth.validBefore === 0 || auth.validBefore > maxValidBefore) {
      return res.status(400).json({
        isValid: false,
        invalidReason: X402_ERROR_CODES.INVALID_EXACT_EVM_PAYLOAD_AUTHORIZATION_VALID_BEFORE,
        payer: from,
      })
    }

    const domain = getTokenDomain(tokenConfig)
    const types = getTransferWithAuthorizationTypes()
    const message = {
      from: auth.from as Hex,
      to: auth.to as Hex,
      value: BigInt(auth.value),
      validAfter: BigInt(auth.validAfter),
      validBefore: BigInt(auth.validBefore),
      nonce: auth.nonce as Hex,
    }

    const rawSig = (paymentPayload.payload as ExactEvmPayload).signature
    if (typeof rawSig !== 'string' || !rawSig.startsWith('0x') || rawSig.length < 132) {
      return res.status(200).json({
        isValid: false,
        invalidReason: X402_ERROR_CODES.INVALID_EXACT_EVM_PAYLOAD_SIGNATURE,
        payer: from,
      })
    }

    if (isSmartWalletSignature(rawSig)) {
      // Smart wallet (ERC-1271): can't verify contract signatures off-chain.
      // Let settle handle on-chain verification via the bytes overload.
      return res.status(200).json({
        isValid: true,
        payer: from,
      })
    }

    // EOA: verify EIP-712 signature off-chain
    const valid = await verifyTypedData({
      address: auth.from as Hex,
      domain: { ...domain, verifyingContract: domain.verifyingContract as Hex },
      types,
      primaryType: 'TransferWithAuthorization',
      message,
      signature: rawSig as Hex,
    })

    if (!valid) {
      return res.status(200).json({
        isValid: false,
        invalidReason: X402_ERROR_CODES.INVALID_EXACT_EVM_PAYLOAD_SIGNATURE,
        payer: from,
      })
    }

    return res.status(200).json({
      isValid: true,
      payer: from,
    })
  } catch (error) {
    console.error('[Facilitator verify]', error)
    return res.status(200).json({
      isValid: false,
      invalidReason: X402_ERROR_CODES.UNEXPECTED_VERIFY_ERROR,
      payer,
    })
  }
}
