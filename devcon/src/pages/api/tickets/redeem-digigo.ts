import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyDigigoCredential } from '@digigo/verify/server'
import { issueVoucher, DiscountSoldOutError } from '../../../services/discountStore'
import { TICKETING, discountItemForCollection, discountTypeForCollection } from 'config/ticketing'

/**
 * DigiGo verification -> India Resident voucher.
 *
 * The browser runs the DigiGo QR flow and posts the resulting credential's
 * `proof` here. `verifyDigigoCredential` checks it against DigiGo's public JWKS
 * and throws on a bad signature / issuer / expiry, so a successful return is
 * trustworthy — the client's own `publicSignals` are never read.
 *
 * A verified Indian credential issues a voucher from the same pool the Self
 * flow uses (`TICKETING.discount.collection`), keyed on DigiGo's per-event
 * nullifier so one Aadhaar identity can only ever claim one voucher.
 *
 * Absence is NOT a negative: someone who never produces a credential is
 * "not established", not "not Indian". Nothing here rejects anyone — it only
 * ever acts on a credential we actually received and verified.
 */

function fail(res: NextApiResponse, code: string, reason: string) {
  return res.status(200).json({ success: false, error: code, reason })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  if (!TICKETING.digigo.enabled) {
    return fail(res, 'DISABLED', 'DigiGo verification is not enabled.')
  }

  const { proof } = req.body ?? {}
  if (!proof || typeof proof !== 'string') {
    return fail(res, 'MISSING_FIELDS', 'Missing proof')
  }

  let credential: Awaited<ReturnType<typeof verifyDigigoCredential>>
  try {
    credential = await verifyDigigoCredential(proof)
  } catch (err) {
    console.error('[redeem-digigo] proof verification failed:', err)
    return fail(res, 'VERIFICATION_FAILED', 'We could not verify this DigiGo credential. Please try again.')
  }

  if (credential.indian !== 'INDIAN') {
    return fail(res, 'NOT_INDIAN', 'Sorry, this offer is exclusive to Indian residents with an Aadhaar card.')
  }

  // 18+ gate, matching the Self flow (which requests `minimumAge: 18` as a
  // disclosure and rejects when it isn't satisfied). Fails CLOSED: `ageAbove18`
  // is null when the DigiGo event wasn't configured to request age, and letting
  // null through would leave this check silently doing nothing. If every
  // verification starts failing here, the event needs age added to its
  // requested claims — that is a DigiGo-side config change, not a code one.
  if (credential.ageAbove18 !== true) {
    if (credential.ageAbove18 == null) {
      console.error('[redeem-digigo] credential carried no ageAbove18 — DigiGo event is not requesting age')
    }
    return fail(
      res,
      'UNDER_18',
      "Sorry, we can't issue you a code. Your DigiGo credential does not show that you're over 18 years old. Devcon India will have unique, lower cost tickets for Youths aged 5-17 later this year. We recommend waiting until then to purchase a ticket. We apologize for any inconvenience."
    )
  }

  if (!credential.nullifier) {
    return fail(res, 'VERIFICATION_FAILED', 'Could not determine identity nullifier from the credential.')
  }

  const collection = TICKETING.discount.collection
  const type = discountTypeForCollection(collection)
  const itemId = discountItemForCollection(collection)
  if (!itemId) {
    return fail(res, 'NO_VOUCHERS', 'This discount is not configured. Please contact support.')
  }

  // Namespaced so a DigiGo identity never collides with a Self nullifier in the
  // shared voucher table — and so the issuing path stays auditable.
  const assignedTo = `digigo:${credential.nullifier}`

  try {
    // issueVoucher is one-per-identity: a returning nullifier gets the same
    // code back rather than draining another voucher.
    const voucher = await issueVoucher(assignedTo, itemId, collection, { type })
    if (!voucher) {
      return fail(res, 'NO_VOUCHERS', 'Could not issue a voucher. Please try again later.')
    }
    return res.status(200).json({ success: true, voucherCode: voucher.code })
  } catch (err) {
    if (err instanceof DiscountSoldOutError) {
      return fail(res, 'NO_VOUCHERS', 'Sorry, this ticket is sold out.')
    }
    console.error('[redeem-digigo] issueVoucher failed:', err)
    return fail(res, 'NO_VOUCHERS', 'Could not issue a voucher. Please try again later.')
  }
}
