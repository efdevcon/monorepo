/**
 * POST /api/x402/admin/refund
 * Admin endpoint to manage crypto refunds.
 * Auth: x-admin-key header vs X402_ADMIN_SECRET env var.
 *
 * Actions:
 *  - initiate: marks order as refund-pending (CAS prevents double-refund)
 *  - confirm: stores tx hash + marks order refunded in Pretix
 *  - fail: clears pending state with error message
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import {
  markOrderRefundPending,
  finalizeOrderRefund,
  markOrderRefundFailed,
  getCompletedOrder,
} from 'services/ticketStore'
import { markOrderRefunded } from 'services/pretix'

const ADMIN_SECRET = process.env.X402_ADMIN_SECRET

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').end()
  }

  if (!ADMIN_SECRET) {
    return res.status(500).json({ success: false, error: 'X402_ADMIN_SECRET not configured' })
  }

  const provided = req.headers['x-admin-key'] as string
  if (provided !== ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const { action, paymentReference, chainId, amount, adminAddress, txHash, error: errorMsg } = req.body ?? {}

  if (!paymentReference || typeof paymentReference !== 'string') {
    return res.status(400).json({ success: false, error: 'paymentReference is required' })
  }

  try {
    switch (action) {
      case 'initiate': {
        if (!chainId || !amount || !adminAddress) {
          return res.status(400).json({ success: false, error: 'chainId, amount, and adminAddress are required for initiate' })
        }
        const claimed = await markOrderRefundPending(paymentReference, chainId, amount, adminAddress)
        if (!claimed) {
          return res.status(409).json({ success: false, error: 'Refund already in progress or completed for this order' })
        }
        return res.status(200).json({ success: true, status: 'pending' })
      }

      case 'confirm': {
        if (!txHash || typeof txHash !== 'string') {
          return res.status(400).json({ success: false, error: 'txHash is required for confirm' })
        }
        await finalizeOrderRefund(paymentReference, txHash)

        // Mark refunded in Pretix (best-effort — on-chain tx is source of truth)
        const order = await getCompletedOrder(paymentReference)
        if (order?.pretixOrderCode) {
          try {
            await markOrderRefunded(order.pretixOrderCode, order.totalUsd, txHash, order.chainId)
          } catch (pretixErr) {
            console.error(`[refund] Pretix markOrderRefunded failed for ${order.pretixOrderCode}:`, pretixErr)
            // Not blocking — on-chain refund already confirmed
          }
        }

        return res.status(200).json({ success: true, status: 'confirmed' })
      }

      case 'fail': {
        await markOrderRefundFailed(paymentReference, errorMsg || 'Unknown error')
        return res.status(200).json({ success: true, status: 'failed' })
      }

      default:
        return res.status(400).json({ success: false, error: 'action must be one of: initiate, confirm, fail' })
    }
  } catch (err) {
    console.error('[x402 admin refund]', err)
    return res.status(500).json({
      success: false,
      error: 'Refund operation failed',
      details: err instanceof Error ? err.message : String(err),
    })
  }
}
