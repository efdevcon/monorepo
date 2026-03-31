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
import { usdToUsdcAmount, getPaymentRecipient } from 'services/x402'
import {
  generateNonce,
  getTokenDomain,
  getTransferWithAuthorizationTypes,
} from 'services/relayer'
import { PrepareAuthorizationRequest, PrepareAuthorizationResponse, EIP3009Authorization, getGaslessTokenConfig, getGaslessConfigsForChain } from 'types/x402'
import { validateAddressEIP55, addressesEqual } from 'utils/x402Validation'

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

    const fromValidation = validateAddressEIP55(body.from)
    if (!fromValidation.valid) {
      return res.status(400).json({ success: false, error: fromValidation.error })
    }
    body.from = fromValidation.checksummed

    // Get pending order
    console.log('[PrepareAuth] Looking up pending order for:', body.paymentReference)
    const pendingOrder = await getPendingOrder(body.paymentReference)
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

    // Only the intended payer for this order can get the authorization (reject if not our payment)
    if (!addressesEqual(body.from, pendingOrder.intendedPayer)) {
      return res.status(403).json({
        success: false,
        error: 'From address does not match the wallet that created this order',
        details: 'Only the wallet used at purchase can request authorization for this payment',
      })
    }

    // Validate optional chainId for multi-chain gasless
    const requestedChainId = body.chainId
    if (requestedChainId !== undefined && getGaslessConfigsForChain(requestedChainId).length === 0) {
      return res.status(400).json({
        success: false,
        error: `Unsupported chain for gasless payment: ${requestedChainId}`,
      })
    }

    // Resolve token config (by chainId + tokenAddress, or first config for chain)
    const tokenAddress = (body as any).tokenAddress as string | undefined
    const tokenConfig = requestedChainId !== undefined
      ? (tokenAddress
          ? getGaslessTokenConfig(requestedChainId, tokenAddress)
          : getGaslessConfigsForChain(requestedChainId)[0])
      : getGaslessConfigsForChain(8453)[0] // default to Base USDC
    if (!tokenConfig) {
      return res.status(400).json({
        success: false,
        error: `No gasless token config found for chain ${requestedChainId}${tokenAddress ? ` and token ${tokenAddress}` : ''}`,
      })
    }

    // Get payment recipient (used as `to` for transferWithAuthorization) and amount
    const recipient = getPaymentRecipient()
    const amount = usdToUsdcAmount(pendingOrder.totalUsd)

    // Generate authorization
    const nonce = generateNonce()
    const validAfter = 0 // Valid immediately
    const validBefore = pendingOrder.expiresAt // Use same expiry as payment reference

    const authorization: EIP3009Authorization = {
      from: fromValidation.checksummed,
      to: recipient,
      value: amount,
      validAfter,
      validBefore,
      nonce,
    }

    // Build EIP-712 typed data (token-specific domain)
    const domain = getTokenDomain(tokenConfig)
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
