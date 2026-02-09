/**
 * Execute Transfer API - Execute gas-sponsored USDC transfer
 * POST /api/x402/tickets/relayer/execute-transfer
 *
 * Request body:
 * {
 *   paymentReference: string,  // Payment reference from purchase response
 *   authorization: EIP3009Authorization,  // The authorization details
 *   signature: { v: number, r: string, s: string }  // The signature
 * }
 *
 * The relayer executes the transfer, paying gas from ETH_RELAYER_PAYMENT_PRIVATE_KEY
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { getPendingOrder } from 'services/ticketStore'
import { getPaymentRecipient, usdToUsdcAmount } from 'services/x402'
import { executeTransferWithAuthorization, getRelayerAddress } from 'services/relayer'
import { ExecuteTransferRequest, ExecuteTransferResponse } from 'types/x402'

interface ErrorResponse {
  success: false
  error: string
  details?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExecuteTransferResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const body = req.body as ExecuteTransferRequest

    // Validate request
    if (!body.paymentReference || typeof body.paymentReference !== 'string') {
      return res.status(400).json({ success: false, error: 'Payment reference is required' })
    }

    if (!body.authorization) {
      return res.status(400).json({ success: false, error: 'Authorization is required' })
    }

    if (!body.signature || !body.signature.v || !body.signature.r || !body.signature.s) {
      return res.status(400).json({ success: false, error: 'Valid signature is required' })
    }

    // Get pending order
    console.log('[ExecuteTransfer] Looking up pending order for:', body.paymentReference)
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

    // Validate authorization matches expected values
    const expectedRecipient = getPaymentRecipient()
    const expectedAmount = usdToUsdcAmount(pendingOrder.totalUsd)

    if (body.authorization.to.toLowerCase() !== expectedRecipient.toLowerCase()) {
      return res.status(400).json({
        success: false,
        error: 'Authorization recipient does not match expected recipient',
        details: `Expected: ${expectedRecipient}, Got: ${body.authorization.to}`,
      })
    }

    if (BigInt(body.authorization.value) < BigInt(expectedAmount)) {
      return res.status(400).json({
        success: false,
        error: 'Authorization amount is less than expected',
        details: `Expected: ${expectedAmount}, Got: ${body.authorization.value}`,
      })
    }

    // Validate authorization is still valid (not expired)
    const now = Math.floor(Date.now() / 1000)
    if (body.authorization.validBefore > 0 && now > body.authorization.validBefore) {
      return res.status(400).json({
        success: false,
        error: 'Authorization has expired',
      })
    }

    if (body.authorization.validAfter > now) {
      return res.status(400).json({
        success: false,
        error: 'Authorization is not yet valid',
      })
    }

    console.log('[ExecuteTransfer] Executing transfer for ref:', body.paymentReference)

    // Execute the transfer
    const result = await executeTransferWithAuthorization(body.authorization, body.signature)

    console.log('[ExecuteTransfer] Transaction submitted:', result.txHash)

    const response: ExecuteTransferResponse = {
      success: true,
      txHash: result.txHash,
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error executing transfer:', error)
    return res.status(500).json({
      success: false,
      error: `Failed to execute transfer: ${(error as Error).message}`,
    })
  }
}
