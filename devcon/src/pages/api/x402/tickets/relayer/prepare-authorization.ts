/**
 * Prepare Authorization API - Generate EIP-712 typed data for signing
 * POST /api/x402/tickets/relayer/prepare-authorization
 *
 * Request body:
 * {
 *   paymentReference: string,  // Payment reference from purchase response
 *   from: string               // Address that will sign the authorization
 * }
 *
 * Returns EIP-712 typed data for the user to sign
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { getPendingOrder } from 'services/ticketStore'
import { getPaymentRecipient, usdToUsdcAmount } from 'services/x402'
import {
  generateNonce,
  getUsdcDomain,
  getTransferWithAuthorizationTypes,
  getUsdcConfig,
} from 'services/relayer'
import { PrepareAuthorizationRequest, PrepareAuthorizationResponse, EIP3009Authorization } from 'types/x402'

interface ErrorResponse {
  success: false
  error: string
  details?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PrepareAuthorizationResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const body = req.body as PrepareAuthorizationRequest

    // Validate request
    if (!body.paymentReference || typeof body.paymentReference !== 'string') {
      return res.status(400).json({ success: false, error: 'Payment reference is required' })
    }

    if (!body.from || typeof body.from !== 'string') {
      return res.status(400).json({ success: false, error: 'From address is required' })
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(body.from)) {
      return res.status(400).json({ success: false, error: 'Invalid from address format' })
    }

    // Get pending order
    console.log('[PrepareAuth] Looking up pending order for:', body.paymentReference)
    const pendingOrder = getPendingOrder(body.paymentReference)
    if (!pendingOrder) {
      return res.status(404).json({
        success: false,
        error: 'Payment reference not found or expired',
        details: 'Please create a new purchase request',
      })
    }

    // Check if order is expired
    if (Date.now() / 1000 > pendingOrder.expiresAt) {
      return res.status(400).json({
        success: false,
        error: 'Payment reference has expired',
        details: 'Please create a new purchase request',
      })
    }

    // Get payment recipient and amount
    const recipient = getPaymentRecipient()
    const amount = usdToUsdcAmount(pendingOrder.totalUsd)
    const usdcConfig = getUsdcConfig()

    // Generate authorization
    const nonce = generateNonce()
    const validAfter = 0 // Valid immediately
    const validBefore = pendingOrder.expiresAt // Use same expiry as payment reference

    const authorization: EIP3009Authorization = {
      from: body.from,
      to: recipient,
      value: amount,
      validAfter,
      validBefore,
      nonce,
    }

    // Build EIP-712 typed data
    const domain = getUsdcDomain()
    const types = getTransferWithAuthorizationTypes()

    console.log('[PrepareAuth] Authorization generated for ref:', body.paymentReference)

    const response: PrepareAuthorizationResponse = {
      success: true,
      typedData: {
        domain: {
          name: domain.name,
          version: domain.version,
          chainId: domain.chainId,
          verifyingContract: domain.verifyingContract,
        },
        types,
        primaryType: 'TransferWithAuthorization',
        message: authorization,
      },
      authorization,
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error preparing authorization:', error)
    return res.status(500).json({
      success: false,
      error: `Failed to prepare authorization: ${(error as Error).message}`,
    })
  }
}
