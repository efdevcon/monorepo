// Helpers shared by the /api/qr-share/* routes. Lives outside pages/ on
// purpose: Next serves every file under pages/api as a route, underscore or
// not, so a helper there would answer HTTP 500 to anyone who guesses its path.
import type { NextApiResponse } from 'next'
import { TICKETING_ENV } from 'config/ticketing'
import { updateShare, dueForRefresh, type Share, type PublicShare } from 'services/qr-shares'
import { getVoucherUsage } from 'services/qr-share-voucher'

export type { PublicShare }
export const ENV = TICKETING_ENV

export function toPublic(share: Share): PublicShare {
  const { browserKey: _browserKey, ...rest } = share
  return rest
}

/** What the device page (read-only password) gets: no redeem URL, no voucher
 *  code. It only needs the token, the title, the prices and the status. */
export function toDevice(share: Share): PublicShare {
  return { ...toPublic(share), targetUrl: null, voucherCode: null }
}

/** Refreshes `redeemed` from Pretix for the voucher shares that are due
 *  (see dueForRefresh: unclosed, unredeemed, checked more than 30 s ago,
 *  capped per call). Pretix is asked once per voucher code and the answer is
 *  written to every row carrying that code, closed ones included, so two
 *  shares of one voucher never disagree. A failure on one code degrades those
 *  rows only; the list the caller already fetched is still returned. */
export async function refreshRedeemed(shares: Share[]): Promise<Share[]> {
  const now = Date.now()
  const codes = [...new Set(dueForRefresh(shares, now).map(s => s.voucherCode!))]
  await Promise.all(
    codes.map(async code => {
      try {
        const usage = await getVoucherUsage(code)
        if (!usage) return
        const checkedAt = new Date(now).toISOString()
        const stale = shares.filter(
          s => s.voucherCode === code && (s.redeemed !== usage.usedUp || s.redemptions !== usage.redemptions || s.maxUsages !== usage.maxUsages)
        )
        for (const s of shares.filter(s => s.voucherCode === code)) {
          s.redeemed = usage.usedUp
          s.redemptions = usage.redemptions
          s.maxUsages = usage.maxUsages
          s.lastPretixCheck = checkedAt
        }
        await Promise.all(
          stale.map(s => updateShare(s.id, { redeemed: usage.usedUp, redemptions: usage.redemptions, lastPretixCheck: checkedAt }))
        )
        // The row that triggered the check keeps its timestamp even when nothing changed.
        if (!stale.length) {
          const due = shares.find(s => s.voucherCode === code && s.status !== 'closed')
          if (due) await updateShare(due.id, { lastPretixCheck: checkedAt })
        }
      } catch (e) {
        console.warn('[qr-share] redeemed refresh skipped for voucher', code, (e as Error).message)
      }
    })
  )
  // Rows of one voucher that were never refreshed together (a closed row from
  // before its redemption) follow the most recently checked row.
  const latest = new Map<string, Share>()
  for (const s of shares) {
    if (!s.voucherCode || !s.lastPretixCheck) continue
    const cur = latest.get(s.voucherCode)
    if (!cur || s.lastPretixCheck > cur.lastPretixCheck!) latest.set(s.voucherCode, s)
  }
  const fixes: Promise<void>[] = []
  for (const s of shares) {
    const src = s.voucherCode ? latest.get(s.voucherCode) : undefined
    if (!src || src === s) continue
    if (s.redeemed === src.redeemed && s.redemptions === src.redemptions && s.maxUsages === src.maxUsages) continue
    s.redeemed = src.redeemed
    s.redemptions = src.redemptions
    s.maxUsages = src.maxUsages
    s.lastPretixCheck = src.lastPretixCheck
    fixes.push(
      updateShare(s.id, { redeemed: src.redeemed, redemptions: src.redemptions, lastPretixCheck: src.lastPretixCheck }).catch(e =>
        console.warn('[qr-share] could not align share', s.id, (e as Error).message)
      )
    )
  }
  await Promise.all(fixes)
  return shares
}

export function fail(res: NextApiResponse, status: number, error: string) {
  return res.status(status).json({ success: false, error })
}

export function handleError(res: NextApiResponse, e: unknown) {
  const msg = (e as Error).message ?? 'unknown error'
  console.error('[qr-share]', msg)
  return fail(res, 502, msg.startsWith('NocoDB') ? 'NocoDB is not reachable right now' : msg)
}
