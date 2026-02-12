/**
 * x402 Facilitator POST /settle
 * Verifies and settles a payment on-chain via the relayer. Spec §7.2
 *
 * Request body: { paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements }
 * Response: SettleResponse { success, transaction, network, payer, errorReason? }
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyTypedData, type Hex } from 'viem'
import { getPaymentRecipient, usdToUsdcAmount } from 'services/x402'
import { getPendingOrder } from 'services/ticketStore'
import {
  executeTransferWithAuthorization,
  getUsdcDomain,
  getReceiveWithAuthorizationTypes,
  getRelayerAddress,
} from 'services/relayer'
import {
  X402FacilitatorVerifyRequest,
  type SettleResponse,
  X402_ERROR_CODES,
  EIP3009Authorization,
  X402_VERSION,
  getUsdcConfigForChainId,
} from 'types/x402'
import { addressesEqual } from 'utils/x402Validation'

function normalizeAuth(a: EIP3009Authorization) {
  return {
    ...a,
    value: String(a.value),
    validAfter: typeof a.validAfter === 'string' ? parseInt(String(a.validAfter), 10) : Number(a.validAfter),
    validBefore: typeof a.validBefore === 'string' ? parseInt(String(a.validBefore), 10) : Number(a.validBefore),
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SettleResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').end()
  }

  type ExactEvmPayload = { signature: string; authorization: EIP3009Authorization }

  // Network is derived from the request's paymentRequirements; fallback for early errors
  let network = '' as `${string}:${string}`

  try {
    const body = req.body as X402FacilitatorVerifyRequest
    const payload = body?.paymentPayload?.payload as ExactEvmPayload | undefined
    const from = payload?.authorization?.from

    if (!body?.paymentPayload || !body?.paymentRequirements) {
      return res.status(400).json({
        success: false,
        transaction: '',
        network,
        payer: from,
        errorReason: X402_ERROR_CODES.INVALID_PAYMENT_REQUIREMENTS,
      })
    }

    const { paymentPayload, paymentRequirements: reqRequirements } = body
    network = reqRequirements.network as `${string}:${string}`

    if (paymentPayload.x402Version !== X402_VERSION) {
      return res.status(400).json({
        success: false,
        transaction: '',
        network,
        payer: from,
        errorReason: X402_ERROR_CODES.INVALID_X402_VERSION,
      })
    }

    if (reqRequirements.scheme !== 'exact') {
      return res.status(400).json({
        success: false,
        transaction: '',
        network,
        payer: from,
        errorReason: X402_ERROR_CODES.UNSUPPORTED_SCHEME,
      })
    }

    const networkChainId = parseInt(reqRequirements.network.replace('eip155:', ''), 10)
    if (!getUsdcConfigForChainId(networkChainId)) {
      return res.status(400).json({
        success: false,
        transaction: '',
        network,
        payer: from,
        errorReason: X402_ERROR_CODES.INVALID_NETWORK,
      })
    }

    const paymentReference = reqRequirements.extra?.paymentReference as string | undefined
    if (!paymentReference) {
      return res.status(400).json({
        success: false,
        transaction: '',
        network,
        payer: from,
        errorReason: X402_ERROR_CODES.INVALID_PAYMENT_REQUIREMENTS,
      })
    }

    const pendingOrder = await getPendingOrder(paymentReference)
    if (!pendingOrder) {
      return res.status(400).json({
        success: false,
        transaction: '',
        network,
        payer: from,
        errorReason: X402_ERROR_CODES.INVALID_PAYMENT_REQUIREMENTS,
      })
    }

    if (!payload?.signature || !payload?.authorization) {
      return res.status(400).json({
        success: false,
        transaction: '',
        network,
        payer: from,
        errorReason: X402_ERROR_CODES.INVALID_PAYLOAD,
      })
    }

    const auth = normalizeAuth(payload.authorization)
    const rawSignature = payload.signature

    // Verify payer matches intended payer
    if (!addressesEqual(auth.from, pendingOrder.intendedPayer)) {
      return res.status(400).json({
        success: false,
        transaction: '',
        network,
        payer: auth.from,
        errorReason: X402_ERROR_CODES.INVALID_EXACT_EVM_PAYLOAD_RECIPIENT_MISMATCH,
      })
    }

    // Verify recipient is the relayer (receiveWithAuthorization requires msg.sender == to)
    const relayerAddr = getRelayerAddress()
    const finalRecipient = getPaymentRecipient()
    if (!addressesEqual(auth.to, relayerAddr)) {
      return res.status(400).json({
        success: false,
        transaction: '',
        network,
        payer: auth.from,
        errorReason: X402_ERROR_CODES.INVALID_EXACT_EVM_PAYLOAD_RECIPIENT_MISMATCH,
      })
    }

    // Verify amount
    const expectedAmount = usdToUsdcAmount(pendingOrder.totalUsd)
    if (BigInt(auth.value) < BigInt(expectedAmount)) {
      return res.status(400).json({
        success: false,
        transaction: '',
        network,
        payer: auth.from,
        errorReason: X402_ERROR_CODES.INVALID_EXACT_EVM_PAYLOAD_AUTHORIZATION_VALUE,
      })
    }

    // Verify time bounds
    const now = Math.floor(Date.now() / 1000)
    if (auth.validBefore > 0 && now > auth.validBefore) {
      return res.status(400).json({
        success: false,
        transaction: '',
        network,
        payer: auth.from,
        errorReason: X402_ERROR_CODES.INVALID_EXACT_EVM_PAYLOAD_AUTHORIZATION_VALID_BEFORE,
      })
    }
    if (now < auth.validAfter) {
      return res.status(400).json({
        success: false,
        transaction: '',
        network,
        payer: auth.from,
        errorReason: X402_ERROR_CODES.INVALID_EXACT_EVM_PAYLOAD_AUTHORIZATION_VALID_AFTER,
      })
    }

    // Verify EIP-712 signature (chain-specific domain)
    const domain = await getUsdcDomain(networkChainId)
    const types = getReceiveWithAuthorizationTypes()
    const message = {
      from: auth.from as Hex,
      to: auth.to as Hex,
      value: BigInt(auth.value),
      validAfter: BigInt(auth.validAfter),
      validBefore: BigInt(auth.validBefore),
      nonce: auth.nonce as Hex,
    }

    if (typeof rawSignature !== 'string' || !rawSignature.startsWith('0x') || rawSignature.length !== 132) {
      return res.status(400).json({
        success: false,
        transaction: '',
        network,
        payer: auth.from,
        errorReason: X402_ERROR_CODES.INVALID_EXACT_EVM_PAYLOAD_SIGNATURE,
      })
    }

    const sigValid = await verifyTypedData({
      address: auth.from as Hex,
      domain: { ...domain, verifyingContract: domain.verifyingContract as Hex },
      types,
      primaryType: 'ReceiveWithAuthorization',
      message,
      signature: rawSignature as Hex,
    })

    if (!sigValid) {
      return res.status(400).json({
        success: false,
        transaction: '',
        network,
        payer: auth.from,
        errorReason: X402_ERROR_CODES.INVALID_EXACT_EVM_PAYLOAD_SIGNATURE,
      })
    }

    // Execute transfer via relayer
    const sigHex = rawSignature
    const r = sigHex.slice(0, 66)
    const s = `0x${sigHex.slice(66, 130)}`
    let v = parseInt(sigHex.slice(130, 132), 16)
    if (v < 27) v += 27

    const result = await executeTransferWithAuthorization(
      {
        from: auth.from,
        to: auth.to,
        value: auth.value,
        validAfter: auth.validAfter,
        validBefore: auth.validBefore,
        nonce: auth.nonce,
      },
      { v, r, s },
      finalRecipient,
      networkChainId
    )

    return res.status(200).json({
      success: true,
      transaction: result.txHash,
      network,
      payer: auth.from,
    })
  } catch (error) {
    console.error('[Facilitator settle]', error)
    return res.status(500).json({
      success: false,
      transaction: '',
      network,
      errorReason: X402_ERROR_CODES.UNEXPECTED_SETTLE_ERROR,
    })
  }
}
