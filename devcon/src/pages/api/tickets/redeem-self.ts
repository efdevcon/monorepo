import type { NextApiRequest, NextApiResponse } from 'next'
import { SelfBackendVerifier, DefaultConfigStore, ATTESTATION_ID, AllIds } from '@selfxyz/core'

const SELF_SCOPE = process.env.NEXT_PUBLIC_SELF_SCOPE || 'devcon-india-local-discount'
const SELF_ENDPOINT = process.env.NEXT_PUBLIC_SELF_ENDPOINT || '/api/tickets/redeem-self'
const ALLOW_STAGING = process.env.NEXT_PUBLIC_SELF_STAGING === 'true'

// In-memory stores keyed by userId. In production, use a proper database.
// Uses globalThis so Maps are shared across Next.js module instances in dev mode.
const g = globalThis as unknown as {
  __selfVoucherStore?: Map<string, string>
  __selfErrorStore?: Map<string, string>
}
if (!g.__selfVoucherStore) g.__selfVoucherStore = new Map<string, string>()
if (!g.__selfErrorStore) g.__selfErrorStore = new Map<string, string>()
export const voucherStore = g.__selfVoucherStore
export const errorStore = g.__selfErrorStore

function storeError(userId: string, reason: string) {
  errorStore.set(userId, reason)
  setTimeout(() => errorStore.delete(userId), 30 * 60 * 1000)
}

function generateFakeVoucherCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const isStaging = ALLOW_STAGING && req.query.staging === 'true'

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', endpoint: 'redeem-self', staging: isStaging })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const { attestationId, proof, publicSignals, userContextData } = req.body

    if (!proof || !publicSignals) {
      return res.status(400).json({ error: 'Missing proof or publicSignals' })
    }

    if (attestationId !== ATTESTATION_ID.AADHAAR) {
      return res.status(200).json({
        status: 'error',
        result: false,
        reason: '[InvalidId]: Only Aadhaar cards are supported. Passport and other document types are not accepted.',
      })
    }

    const configStore = new DefaultConfigStore({
      minimumAge: 18,
    })

    const verifier = new SelfBackendVerifier(
      SELF_SCOPE,
      SELF_ENDPOINT,
      isStaging,
      // AllIds,
      new Map([[ATTESTATION_ID.AADHAAR, true]]),
      configStore,
      'uuid'
    )

    const result = await verifier.verify(attestationId, proof, publicSignals, userContextData)
    console.log('result', JSON.stringify(result, null, 2))

    // Extract userId early so we can store errors for mobile polling
    const userId = result.userData?.userIdentifier

    if (!result.isValidDetails.isValid) {
      if (userId) storeError(userId, 'Verification failed')
      return res.status(200).json({
        status: 'error',
        result: false,
        reason: 'Verification failed',
        details: result.isValidDetails,
      })
    }

    // Check minimum age
    if (!result.isValidDetails.isMinimumAgeValid) {
      const reason = 'You must be 18 or older to purchase a ticket.'
      if (userId) storeError(userId, reason)
      return res.status(200).json({
        status: 'error',
        result: false,
        reason,
      })
    }

    // Check that the user's nationality or issuing state is India
    const nationality = result.discloseOutput?.nationality
    const issuingState = result.discloseOutput?.issuingState
    const isIndian = nationality === 'IND' || issuingState === 'IND'

    if (!isIndian && !isStaging) {
      const reason = 'This discount is only available for Indian residents. Nationality/issuing state must be IND.'
      if (userId) storeError(userId, reason)
      return res.status(200).json({
        status: 'error',
        result: false,
        reason,
      })
    }

    if (!userId) {
      return res.status(200).json({
        status: 'error',
        result: false,
        reason: 'Could not determine user identifier from proof',
      })
    }

    // Hardcoded Pretix voucher code (will be dynamically assigned in production)
    const voucherCode = '22QD2ETT2HEGPZZ8'
    voucherStore.set(userId, voucherCode)

    // Auto-expire after 30 minutes
    setTimeout(() => voucherStore.delete(userId), 30 * 60 * 1000)

    return res.status(200).json({
      status: 'success',
      result: true,
      nationality,
    })
  } catch (error) {
    console.error('[redeem-self] Error verifying Self proof:', error)
    return res.status(200).json({
      status: 'error',
      result: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
