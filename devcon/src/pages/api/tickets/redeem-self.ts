import type { NextApiRequest, NextApiResponse } from 'next'
import { SelfBackendVerifier, DefaultConfigStore, ATTESTATION_ID, ConfigMismatchError } from '@selfxyz/core'
import { lookupDiscountCode, validateDiscountCode, issueVoucher, DiscountSoldOutError, claimDiscountCode, linkVoucherToDiscountCode, getAssignedVoucher, setSelfDelivery } from '../../../services/discountStore'
import { TICKETING, discountItemForCollection, discountTypeForCollection } from 'config/ticketing'
import { SERVER_INSTANCE_ID } from 'utils/serverInstance'

// One line per meaningful step, tagged with the instance id so a delivery that
// crosses lambda instances (callback on one, poll on another) is visible in
// the logs instead of inferred.
const log = (msg: string) => console.log(`[redeem-self][${SERVER_INSTANCE_ID}] ${msg}`)

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
  log(`error stored userId=${userId}: ${reason}`)
  errorStore.set(userId, reason)
  setTimeout(() => errorStore.delete(userId), 30 * 60 * 1000)
  // Also persist: the browser polls a DIFFERENT serverless invocation, which
  // may not share this process's memory (see setSelfDelivery). Fire-and-forget
  // so an outage here never changes the response we send Self.
  void setSelfDelivery(userId, { errorReason: reason })
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
    log(`POST received attestation=${attestationId} userId=${userId ?? '∅'} staging=${isStaging}`)

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
    // Deliberately NOT dumping the raw verify() result: it prints every field
    // the proof disclosed. The structured line carries what debugging needs.
    const result = await verifier.verify(attestationId, proof, publicSignals, userContextData)

    const verifiedUserId = result.userData?.userIdentifier ?? userId
    log(
      `verify done valid=${result.isValidDetails.isValid} minAge=${result.isValidDetails.isMinimumAgeValid} ` +
        `nationality=${result.discloseOutput?.nationality} userId=${verifiedUserId ?? '∅'} ` +
        `nullifier=${result.discloseOutput?.nullifier ?? '∅'}`
    )

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

    // Check that the user's nationality is India
    const requireEarlyAccess = TICKETING.self.requireEarlyAccess
    const nationality = result.discloseOutput?.nationality
    const isIndian = nationality === 'IND'

    if (!isIndian && !isStaging) {
      const reason = requireEarlyAccess
        ? 'Sorry, your nationality is not Indian. This offer is currently exclusive to Indian residents with an Aadhaar card, who attended ETHMumbai.'
        : 'Sorry, your nationality is not Indian. This offer is currently exclusive to Indian residents with an Aadhaar card.'
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
    const earlyAccessCode = (req.query.earlyAccess ?? req.body.earlyAccess ?? req.query.discountCode ?? req.body.discountCode) as string | undefined
    const emailParam = (req.query.email ?? req.body.email) as string | undefined
    // Email logged as presence only (PII); the codes/ids stay verbatim for
    // debuggability.
    log(`params email=${emailParam ? 'present' : '∅'} earlyAccess=${earlyAccessCode ?? '∅'} userId=${verifiedUserId}`)

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

    if (requireEarlyAccess && !earlyAccessCode) {
      const reason = 'Missing early access code'
      storeError(verifiedUserId, reason)
      return res.status(200).json({
        status: 'error',
        result: false,
        error_code: 'MISSING_EARLY_ACCESS_CODE',
        reason,
      })
    }

    // Check if this identity already has a voucher (one-voucher-per-identity)
    const existingVoucher = await getAssignedVoucher(nullifier)
    if (existingVoucher) {
      log(`existing voucher returned code=${existingVoucher.code} userId=${verifiedUserId}`)
      voucherStore.set(verifiedUserId, existingVoucher.code)
      errorStore.delete(verifiedUserId)
      setTimeout(() => voucherStore.delete(verifiedUserId), 30 * 60 * 1000)
      // Durable handoff for the returning-identity path too — without it a
      // returning buyer's poll on a different instance times out exactly like
      // the fresh-issue path used to.
      await setSelfDelivery(verifiedUserId, { voucherCode: existingVoucher.code })
      return res.status(200).json({
        status: 'success',
        result: true,
        credentialSubject: result.discloseOutput,
      })
    }

    let voucherCollection = TICKETING.discount.collection

    if (requireEarlyAccess && earlyAccessCode) {
      // Look up the early access code to check its status
      const codeRecord = await lookupDiscountCode(earlyAccessCode)
      if (!codeRecord) {
        const reason = 'Invalid early access code'
        storeError(verifiedUserId, reason)
        return res.status(200).json({
          status: 'error',
          result: false,
          error_code: 'INVALID_EARLY_ACCESS_CODE',
          reason,
        })
      }

      // If already claimed by this same identity, recover gracefully
      if (codeRecord.claimedBy === nullifier) {
        if (codeRecord.voucherCode) {
          // Voucher was already linked — return it
          log(`early-access voucher returned code=${codeRecord.voucherCode} userId=${verifiedUserId}`)
          voucherStore.set(verifiedUserId, codeRecord.voucherCode)
          errorStore.delete(verifiedUserId)
          setTimeout(() => voucherStore.delete(verifiedUserId), 30 * 60 * 1000)
          await setSelfDelivery(verifiedUserId, { voucherCode: codeRecord.voucherCode })
          return res.status(200).json({
            status: 'success',
            result: true,
            credentialSubject: result.discloseOutput,
          })
        }
        // Code was claimed but voucher wasn't linked (partial failure on previous attempt)
        // Fall through to assign a voucher below
        voucherCollection = codeRecord.collection
      } else if (codeRecord.claimedBy) {
        // Claimed by someone else — reject
        const reason = 'This early access code has already been used'
        storeError(verifiedUserId, reason)
        return res.status(200).json({
          status: 'error',
          result: false,
          error_code: 'EARLY_ACCESS_CODE_USED',
          reason,
        })
      } else {
        // Unclaimed — atomically claim it BEFORE assigning a voucher (prevents race condition)
        const claimed = await claimDiscountCode(earlyAccessCode, nullifier)
        if (!claimed) {
          // Re-check: a parallel request from the same identity may have just claimed it
          const recheck = await lookupDiscountCode(earlyAccessCode)
          if (recheck?.claimedBy === nullifier) {
            if (recheck.voucherCode) {
              log(`early-access recheck voucher returned code=${recheck.voucherCode} userId=${verifiedUserId}`)
              voucherStore.set(verifiedUserId, recheck.voucherCode)
              errorStore.delete(verifiedUserId)
              setTimeout(() => voucherStore.delete(verifiedUserId), 30 * 60 * 1000)
              await setSelfDelivery(verifiedUserId, { voucherCode: recheck.voucherCode })
              return res.status(200).json({
                status: 'success',
                result: true,
                credentialSubject: result.discloseOutput,
              })
            }
            // Claimed by us but voucher not linked yet — fall through to assign
            voucherCollection = recheck.collection
          } else {
            const reason = 'This early access code has already been used'
            storeError(verifiedUserId, reason)
            return res.status(200).json({
              status: 'error',
              result: false,
              error_code: 'EARLY_ACCESS_CODE_USED',
              reason,
            })
          }
        } else {
          voucherCollection = codeRecord.collection
        }
      }
    }

    // Issue a voucher on the fly that unlocks the discount ticket. The item id
    // and type are resolved from the collection (env-prefixed). issueVoucher is
    // global one-per-identity: a returning nullifier gets the same code back.
    const selfType = discountTypeForCollection(voucherCollection)
    const itemId = discountItemForCollection(voucherCollection)
    if (!itemId) {
      const reason = 'This discount is not configured. Please contact support.'
      storeError(verifiedUserId, reason)
      return res.status(200).json({
        status: 'error',
        result: false,
        error_code: 'NO_VOUCHERS',
        reason,
      })
    }
    let voucher: Awaited<ReturnType<typeof issueVoucher>> = null
    try {
      voucher = await issueVoucher(nullifier, itemId, voucherCollection, { type: selfType })
    } catch (err) {
      if (err instanceof DiscountSoldOutError) {
        const reason = 'Sorry, this ticket is sold out.'
        storeError(verifiedUserId, reason)
        return res.status(200).json({
          status: 'error',
          result: false,
          error_code: 'NO_VOUCHERS',
          reason,
        })
      }
      console.error('[redeem-self] issueVoucher failed:', err)
      voucher = null
    }
    if (!voucher) {
      const reason = 'Could not issue a voucher. Please try again later.'
      storeError(verifiedUserId, reason)
      return res.status(200).json({
        status: 'error',
        result: false,
        error_code: 'NO_VOUCHERS',
        reason,
      })
    }

    // Link the voucher back to the early access code (if applicable)
    if (requireEarlyAccess && earlyAccessCode) {
      await linkVoucherToDiscountCode(earlyAccessCode, voucher.code)
    }

    // Hand the code to the polling browser. Two layers on purpose:
    // in-memory is the fast path when the poll happens to hit this same warm
    // instance, and the DB row is what makes delivery survive a different (or
    // cold) instance. Without the second one a verified buyer sees
    // "Verification timed out" while their voucher is already assigned
    // (production, 2026-08-28). Awaited so the row exists before we tell Self
    // we succeeded, and the browser's very next poll can find it.
    voucherStore.set(verifiedUserId, voucher.code)
    errorStore.delete(verifiedUserId) // Clear any race-condition error from parallel request
    setTimeout(() => voucherStore.delete(verifiedUserId), 30 * 60 * 1000)
    await setSelfDelivery(verifiedUserId, { voucherCode: voucher.code })
    log(
      `voucher issued code=${voucher.code} collection=${voucherCollection} item=${itemId} ` +
        `userId=${verifiedUserId} — delivery persisted (mem+db)`
    )

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
