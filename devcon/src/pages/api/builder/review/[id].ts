import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAdminAuth } from 'utils/adminAuth'
import { getRowById, updateRow } from 'services/nocodb'
import {
  issueVoucher,
  setVoucherEmail,
  setVoucherEmailSent,
  getVoucherByAnyIdentity,
  DiscountSoldOutError,
} from 'services/discountStore'
import { sendVoucherEmail } from 'services/voucherEmail'
import { sendBuilderRejectionEmail } from 'services/builder/email'
import { getTalentProfile } from 'services/builder/talent'
import { getGithubProfile } from 'services/builder/github-profile'
import { getContributedRepos } from 'services/builder/github-contributions'
import { getDevfolioProfile } from 'services/builder/devfolio'
import { matchEthglobalProjects } from 'services/builder/ethglobal'
import { parseRepoList } from 'services/builder/repo-ref'
import { getPastDevconEvents } from 'services/builder/poap-attendees'
import { GetDiscount } from '../../discounts/validate/[id]'
import { discountItem, discountCollection } from 'config/ticketing'

const VIEW_ID = 'vwmee9a1l1dyqg34' // Builder Application form view
const BUILDER_DISCOUNT_TYPE = 'builder'

// A person's voucher-dedup identities, in priority order (wallet > GitHub >
// email). Lowercased to match the keyspace the community discount flows use
// (claim/[id] and claim-wallet store lowercased wallet / GitHub login), so a
// builder approval reuses any voucher the person already holds in ANY program.
function builderIdentities(record: Record<string, any>): string[] {
  const wallet = String(record['Wallet Address'] || '').trim().toLowerCase()
  const github = String(record['GitHub Username'] || '').trim().toLowerCase()
  const email = String(record['Email'] || '').trim().toLowerCase()
  return [wallet, github, email].filter(Boolean)
}

interface MatchedRepo {
  repo: string
  project?: string
  stars?: number | null
  list?: 'web2' | 'web3'
  source: string
}

// Admin "builder review" endpoint (shared admin key via x-admin-key).
// GET  -> the full record + parsed matched repos.
// POST -> { decision: 'Approved' | 'Rejected' }. On Approve: mints a single-use
//         builder voucher, emails it to the applicant, and records the code +
//         Voucher Sent on the row. issueVoucher is idempotent per identity, so
//         re-approving returns the same code rather than minting a duplicate.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Review data + live enrichment must always be current — never cache.
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  if (!checkAdminAuth(req, res)) return

  const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
  const id = Number(rawId)
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ success: false, error: 'Invalid id' })
    return
  }

  if (req.method === 'GET') {
    const record = await getRowById(VIEW_ID, id)
    if (!record) {
      res.status(404).json({ success: false, error: 'Builder application not found' })
      return
    }
    let matchedRepos: MatchedRepo[] = []
    try {
      const parsed = JSON.parse(record['Matched Repos'] || '[]')
      if (Array.isArray(parsed)) matchedRepos = parsed
    } catch {
      // leave empty if the column isn't valid JSON
    }
    // Live, always-current enrichment (best-effort, null if absent):
    // Talent Protocol (by wallet) + GitHub profile/activity (by login).
    const wallet = String(record['Wallet Address'] || '').trim()
    const ghLogin = String(record['GitHub Username'] || '').trim()
    const devfolioUrl = String(record['Devfolio URL'] || '').trim()
    const [talent, github, devfolio, contributedRepos] = await Promise.all([
      wallet ? getTalentProfile(wallet) : Promise.resolve(null),
      ghLogin ? getGithubProfile(ghLogin) : Promise.resolve(null),
      devfolioUrl ? getDevfolioProfile(devfolioUrl) : Promise.resolve(null),
      ghLogin ? getContributedRepos(ghLogin) : Promise.resolve(new Set<string>()),
    ])
    // Verify the Devfolio profile actually belongs to the applicant: its linked
    // GitHub must match the applicant's connected login.
    if (devfolio && devfolio.github && ghLogin) {
      devfolio.githubVerified = devfolio.github.toLowerCase() === ghLogin.toLowerCase()
    }

    // Cross-match against ETHGlobal hackathon projects — using both their GitHub
    // pull and any repos they manually listed (team-org projects often can't be
    // auto-detected via GitHub attribution, so a claimed repo is the way to surface them).
    const matchSet = new Set<string>([...contributedRepos, ...parseRepoList(String(record['Contributed Repos'] || ''))])
    const ethglobal = matchEthglobalProjects(matchSet)
    // Past Devcon/Devconnect POAPs — computed live from the wallet so it works
    // for records submitted before this check existed (not just the stored column).
    const pastDevcons = wallet ? getPastDevconEvents(wallet) : []

    // Discount eligibility (Core Devs, Public Goods, Past POAP, …) from their
    // connected GitHub login / wallet. Shown to the admin for context regardless
    // of whether they've already claimed a voucher. OSS Contributors is excluded
    // everywhere: it's no longer a standalone discount — it's been merged into
    // the builder discount itself.
    const eligibleMap = new Map<string, { type: string; name: string; discount: number }>()
    for (const idVal of [ghLogin, wallet].filter(Boolean)) {
      for (const d of GetDiscount(idVal).discounts) {
        if (d.type === 'oss-contributors') continue
        const existing = eligibleMap.get(d.type)
        if (!existing || d.discount > existing.discount) {
          eligibleMap.set(d.type, { type: d.type, name: d.name, discount: d.discount })
        }
      }
    }
    const eligibleDiscounts = Array.from(eligibleMap.values()).sort((a, b) => b.discount - a.discount)

    // The subset that warrants a "don't double-allocate" warning banner: Core
    // Devs / Protocol Guild (free) and Public Good Projects (50%). OSS
    // Contributors is now part of the builder discount, and Past-POAP (10%) is
    // worse than the builder discount — neither is a meaningful alternative.
    const WARN_DISCOUNT_TYPES = new Set(['core-devs', 'pg-projects'])
    const autoDiscounts = eligibleDiscounts.filter(d => WARN_DISCOUNT_TYPES.has(d.type))

    // A voucher this person ALREADY holds (any program), matched across their
    // wallet / GitHub / email — so the admin sees it before approving and
    // doesn't double-allocate. Approving reuses this code rather than minting.
    const existing = await getVoucherByAnyIdentity(builderIdentities(record))
    const existingVoucher = existing
      ? { code: existing.code, collection: existing.collection, assignedTo: existing.assignedTo }
      : null

    res.status(200).json({
      success: true,
      record,
      matchedRepos,
      talent,
      github,
      devfolio,
      ethglobal,
      pastDevcons,
      autoDiscounts,
      existingVoucher,
    })
    return
  }

  if (req.method === 'POST') {
    const decision = req.body?.decision
    if (decision !== 'Approved' && decision !== 'Rejected') {
      res.status(400).json({ success: false, error: "decision must be 'Approved' or 'Rejected'" })
      return
    }

    const record = await getRowById(VIEW_ID, id)
    if (!record) {
      res.status(404).json({ success: false, error: 'Builder application not found' })
      return
    }

    if (decision === 'Rejected') {
      // Email the applicant — but only on the transition INTO Rejected, so
      // re-clicking Reject on an already-rejected row doesn't re-send.
      const alreadyRejected = record['Decision'] === 'Rejected'
      const email = String(record['Email'] || '').trim()
      let emailed = false
      if (!alreadyRejected && email) {
        const sent = await sendBuilderRejectionEmail(email, String(record['Full Name'] || ''))
        emailed = sent.success
        if (!sent.success) console.warn('[builder/review] rejection email failed:', sent.error)
      }
      await updateRow(VIEW_ID, id, { Decision: 'Rejected' })
      res.status(200).json({ success: true, decision: 'Rejected', emailed })
      return
    }

    // Approved: mint + email a builder voucher.
    const email = String(record['Email'] || '').trim()
    if (!email) {
      res.status(400).json({ success: false, error: 'No email on this application — cannot issue a voucher.' })
      return
    }

    const itemId = discountItem(BUILDER_DISCOUNT_TYPE)
    if (!itemId) {
      res.status(500).json({ success: false, error: 'Builder discount is not configured (no Pretix item).' })
      return
    }

    // One discount per person: if this human already holds a voucher under ANY
    // of their identities (wallet / GitHub / email, across all programs), reuse
    // it instead of minting a second. Otherwise mint a builder voucher keyed by
    // their highest-priority identity (wallet > GitHub > email).
    const identities = builderIdentities(record)
    let voucher: Awaited<ReturnType<typeof issueVoucher>> = await getVoucherByAnyIdentity(identities)
    const reused = Boolean(voucher)
    if (!voucher) {
      const primaryIdentity = identities[0] || email.toLowerCase()
      try {
        voucher = await issueVoucher(primaryIdentity, itemId, discountCollection(BUILDER_DISCOUNT_TYPE), {
          tag: BUILDER_DISCOUNT_TYPE,
          type: BUILDER_DISCOUNT_TYPE,
        })
      } catch (err) {
        if (err instanceof DiscountSoldOutError) {
          res.status(409).json({ success: false, error: 'The builder discount ticket is sold out.' })
          return
        }
        console.error('[builder/review] issueVoucher failed:', err)
        res.status(502).json({ success: false, error: 'Could not issue voucher. Please try again.' })
        return
      }
    }
    if (!voucher) {
      res.status(409).json({ success: false, error: 'Could not issue a voucher (pool exhausted).' })
      return
    }

    // Email the voucher to the applicant.
    let emailed = false
    try {
      const sent = await sendVoucherEmail(email, voucher.code)
      if (sent.success) {
        await setVoucherEmail(voucher.code, email)
        await setVoucherEmailSent(voucher.code)
        emailed = true
      } else {
        console.warn('[builder/review] sendVoucherEmail failed:', sent.error)
      }
    } catch (err) {
      console.warn('[builder/review] sendVoucherEmail threw:', err)
    }

    await updateRow(VIEW_ID, id, {
      Decision: 'Approved',
      'Voucher Code': voucher.code,
      'Voucher Sent': emailed,
    })

    res.status(200).json({ success: true, decision: 'Approved', code: voucher.code, emailed, reused })
    return
  }

  res.status(405).json({ success: false, error: 'Method not allowed' })
}
