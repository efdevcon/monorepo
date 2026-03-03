import type { NextApiRequest, NextApiResponse } from 'next'
import { SelfBackendVerifier, DefaultConfigStore, ATTESTATION_ID, ConfigMismatchError } from '@selfxyz/core'
import { validateDiscountCode, assignVoucher, claimDiscountCode, getAssignedVoucher } from '../../../services/discountStore'
import { TICKETING } from 'config/ticketing'

const SELF_SCOPE = TICKETING.self.scope
const SELF_ENDPOINT = process.env.NEXT_PUBLIC_SELF_ENDPOINT || '/api/tickets/redeem-self'
const ALLOW_STAGING = TICKETING.self.staging

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

// Extract userId from userContextData using the same logic as SelfBackendVerifier.
// The UUID is packed at bytes 32–64 (hex chars 64–128) of the context data.
function extractUserId(userContextData?: string): string | undefined {
  try {
    if (!userContextData || userContextData.length < 128) return undefined
    const bigInt = BigInt('0x' + userContextData.slice(64, 128))
    const hex = bigInt.toString(16).padStart(32, '0')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  } catch {
    return undefined
  }
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
      return res.status(200).json({
        status: 'error',
        result: false,
        error_code: 'MISSING_FIELDS',
        reason: 'Missing proof or publicSignals',
      })
    }

    // Extract userId from userContextData before calling verify so we can
    // store errors for mobile polling even when verify() throws.
    const userId = extractUserId(userContextData)

    if (attestationId !== ATTESTATION_ID.AADHAAR) {
      const reason = 'Aadhaar cards only. Passport and other document types are not supported.'
      if (userId) storeError(userId, reason)
      return res.status(200).json({
        status: 'error',
        result: false,
        error_code: 'INVALID_ID',
        reason,
      })
    }

    const configStore = new DefaultConfigStore({
      minimumAge: 18,
    })

    const verifier = new SelfBackendVerifier(
      SELF_SCOPE,
      SELF_ENDPOINT,
      isStaging,
      new Map([[ATTESTATION_ID.AADHAAR, true]]),
      configStore,
      'uuid'
    )

    // verify() throws ConfigMismatchError for validation failures (age, root,
    // scope, timestamp, etc.) and returns { isValid: false } only when the ZK
    // proof itself is invalid at the contract level.
    const result = await verifier.verify(attestationId, proof, publicSignals, userContextData)
    console.log('result', JSON.stringify(result, null, 2))

    const verifiedUserId = result.userData?.userIdentifier ?? userId

    if (!result.isValidDetails.isValid) {
      const reason = 'Verification failed'
      if (verifiedUserId) storeError(verifiedUserId, reason)
      return res.status(200).json({
        status: 'error',
        result: false,
        error_code: 'VERIFICATION_FAILED',
        reason,
        details: result.isValidDetails,
      })
    }

    // Check minimum age — verify() can return isValid: true with isMinimumAgeValid: false
    if (!result.isValidDetails.isMinimumAgeValid) {
      const reason =
        "Sorry, we can't issue you a code. Your Self proof was successfully submitted however, the zero-knowledge proof provided shows that you're not over 18 years old. Devcon India will have unique, lower cost tickets for Youths aged 5-17 later this year. We recommend waiting until then to purchase a ticket. We apologize for any inconvenience."
      if (verifiedUserId) storeError(verifiedUserId, reason)
      return res.status(200).json({
        status: 'error',
        result: false,
        error_code: 'VERIFICATION_FAILED',
        reason,
      })
    }

    // Check that the user's nationality or issuing state is India
    const nationality = result.discloseOutput?.nationality
    const issuingState = result.discloseOutput?.issuingState
    const isIndian = nationality === 'IND' || issuingState === 'IND'

    if (!isIndian && !isStaging) {
      const reason = 'Sorry, your nationality is not Indian. This offer is currently exclusive to Indian residents with an Aadhaar card, who attended ETH Mumbai.'
      if (verifiedUserId) storeError(verifiedUserId, reason)
      return res.status(200).json({
        status: 'error',
        result: false,
        error_code: 'VERIFICATION_FAILED',
        reason,
      })
    }

    if (!verifiedUserId) {
      return res.status(200).json({
        status: 'error',
        result: false,
        error_code: 'UNKNOWN_ERROR',
        reason: 'Could not determine user identifier from proof',
      })
    }

    // Dynamic voucher assignment from Supabase pool
    const discountCode = (req.query.discountCode ?? req.body.discountCode) as string | undefined

    // Use the nullifier as stable identity for Supabase dedup — it's derived from the
    // Aadhaar card and is always the same for the same card, unlike verifiedUserId which
    // is a random UUID generated per session.
    const nullifier = result.discloseOutput?.nullifier
    if (!nullifier) {
      const reason = 'Could not determine identity nullifier from proof'
      storeError(verifiedUserId, reason)
      return res.status(200).json({
        status: 'error',
        result: false,
        error_code: 'UNKNOWN_ERROR',
        reason,
      })
    }

    if (!discountCode) {
      const reason = 'Missing discount code'
      storeError(verifiedUserId, reason)
      return res.status(200).json({
        status: 'error',
        result: false,
        error_code: 'MISSING_DISCOUNT_CODE',
        reason,
      })
    }

    // Validate the discount code is unclaimed
    const validCode = await validateDiscountCode(discountCode)
    if (!validCode) {
      const reason = 'Invalid or already used discount code'
      storeError(verifiedUserId, reason)
      return res.status(200).json({
        status: 'error',
        result: false,
        error_code: 'INVALID_DISCOUNT_CODE',
        reason,
      })
    }

    // Check if this Aadhaar identity already has a voucher (one-voucher-per-identity)
    const existingVoucher = await getAssignedVoucher(nullifier)
    if (existingVoucher) {
      voucherStore.set(verifiedUserId, existingVoucher.code)
      setTimeout(() => voucherStore.delete(verifiedUserId), 30 * 60 * 1000)
      return res.status(200).json({
        status: 'success',
        result: true,
        credentialSubject: result.discloseOutput,
      })
    }

    // Assign a voucher from the same collection as the discount code
    const voucher = await assignVoucher(nullifier, validCode.collection)
    if (!voucher) {
      const reason = 'No vouchers available. Please try again later.'
      storeError(verifiedUserId, reason)
      return res.status(200).json({
        status: 'error',
        result: false,
        error_code: 'NO_VOUCHERS',
        reason,
      })
    }

    // Claim the discount code (link it to the voucher)
    await claimDiscountCode(discountCode, nullifier, voucher.code)

    // Cache in memory for the polling flow (uses session userId for frontend polling)
    voucherStore.set(verifiedUserId, voucher.code)
    setTimeout(() => voucherStore.delete(verifiedUserId), 30 * 60 * 1000)

    return res.status(200).json({
      status: 'success',
      result: true,
      credentialSubject: result.discloseOutput,
    })
  } catch (error) {
    console.error('[redeem-self] Error verifying Self proof:', error)

    // Extract userId for mobile polling error storage
    const userId = extractUserId(req.body?.userContextData)

    let reason: string
    let errorCode: string

    if (error instanceof ConfigMismatchError) {
      const issues = error.issues as Array<{ type: string; message: string }> | undefined

      if (issues?.some(i => i.type === 'InvalidMinimumAge')) {
        reason =
          "Sorry, we can't issue you a code. Your Self proof was successfully submitted however, the zero-knowledge proof provided shows that you're not over 18 years old. Devcon India will have unique, lower cost tickets for Youths aged 5-17 later this year. We recommend waiting until then to purchase a ticket. We apologize for any inconvenience."
      } else if (issues?.some(i => i.type === 'InvalidRoot')) {
        reason =
          'Verification failed: the root does not exist on-chain. Make sure you are using a real Aadhaar card, not a mock or test ID.'
      } else if (issues?.some(i => i.type === 'InvalidId')) {
        reason = 'Aadhaar cards only. Passport and other document types are not supported.'
      } else {
        reason = error.message
      }
      errorCode = 'VERIFICATION_FAILED'
    } else {
      reason = error instanceof Error ? error.message : 'Unknown error'
      errorCode = 'UNKNOWN_ERROR'
    }

    if (userId) storeError(userId, reason)

    return res.status(200).json({
      status: 'error',
      result: false,
      error_code: errorCode,
      reason,
    })
  }
}
