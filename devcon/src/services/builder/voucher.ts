import {
  issueVoucher,
  getVoucherByAnyIdentity,
  setVoucherEmail,
  setVoucherEmailSent,
  DiscountSoldOutError,
} from 'services/discountStore'
import { sendBuilderApprovalEmail } from 'services/builder/email'
import { discountItem, discountCollection } from 'config/ticketing'

export const BUILDER_DISCOUNT_TYPE = 'builder'

// A person's voucher-dedup identities, in priority order (wallet > GitHub >
// email). Lowercased to match the keyspace the community discount flows use, so
// a builder voucher reuses any voucher the person already holds in ANY program.
export function builderIdentities(record: Record<string, any>): string[] {
  const wallet = String(record['Wallet Address'] || '').trim().toLowerCase()
  const github = String(record['GitHub Username'] || '').trim().toLowerCase()
  const email = String(record['Email'] || '').trim().toLowerCase()
  return [wallet, github, email].filter(Boolean)
}

export type IssueResult =
  | { ok: true; code: string; emailed: boolean; reused: boolean }
  | { ok: false; error: 'not-configured' | 'sold-out' | 'exhausted' | 'failed' }

/**
 * Mint (or reuse) a builder voucher for this applicant and email it. Shared by
 * the admin Approve action and the submit-time auto-approve. One voucher per
 * person: if any of their identities already holds a voucher (any program), it's
 * reused instead of minting a second. Pass skipEmail when the applicant was
 * already notified, so the voucher still resolves without a duplicate email.
 */
export async function issueBuilderVoucher(
  email: string,
  identities: string[],
  name?: string,
  opts?: { skipEmail?: boolean }
): Promise<IssueResult> {
  const itemId = discountItem(BUILDER_DISCOUNT_TYPE)
  if (!itemId) return { ok: false, error: 'not-configured' }

  let voucher = await getVoucherByAnyIdentity(identities)
  const reused = Boolean(voucher)
  if (!voucher) {
    const primaryIdentity = identities[0] || email.toLowerCase()
    try {
      voucher = await issueVoucher(primaryIdentity, itemId, discountCollection(BUILDER_DISCOUNT_TYPE), {
        tag: BUILDER_DISCOUNT_TYPE,
        type: BUILDER_DISCOUNT_TYPE,
      })
    } catch (err) {
      if (err instanceof DiscountSoldOutError) return { ok: false, error: 'sold-out' }
      console.error('[builder voucher] issueVoucher failed:', err)
      return { ok: false, error: 'failed' }
    }
  }
  if (!voucher) return { ok: false, error: 'exhausted' }

  let emailed = false
  if (!opts?.skipEmail) {
    try {
      const sent = await sendBuilderApprovalEmail(email, voucher.code, name)
      if (sent.success) {
        await setVoucherEmail(voucher.code, email)
        await setVoucherEmailSent(voucher.code)
        emailed = true
      } else {
        console.warn('[builder voucher] sendBuilderApprovalEmail failed:', sent.error)
      }
    } catch (err) {
      console.warn('[builder voucher] sendBuilderApprovalEmail threw:', err)
    }
  }

  return { ok: true, code: voucher.code, emailed, reused }
}
