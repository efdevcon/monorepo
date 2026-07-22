import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAdminAuth } from 'utils/adminAuth'
import { getRowById, updateRow, listRows } from 'services/nocodb'
import { getVoucherByAnyIdentity } from 'services/discountStore'
import { builderIdentities, issueBuilderVoucher } from 'services/builder/voucher'
import { sendBuilderRejectionEmail } from 'services/builder/email'
import { getTalentProfile } from 'services/builder/talent'
import { getGithubProfile } from 'services/builder/github-profile'
import { getContributedRepos } from 'services/builder/github-contributions'
import { getDevfolioProfileByGithub } from 'services/builder/devfolio'
import { matchEthglobalProjects } from 'services/builder/ethglobal'
import { parseRepoList } from 'services/builder/repo-ref'
import { getPastDevconEvents } from 'services/builder/poap-attendees'
import { GetDiscount } from '../../discounts/validate/[id]'

const VIEW_ID = 'vwmee9a1l1dyqg34' // Builder Application form view

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
//         re-approving returns the same code rather than minting a duplicate —
//         and the email is only sent once (skipped when Voucher Sent is already
//         set, mirroring the reject-side transition guard).
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
    // Devfolio is no longer collected on the form; auto-detect it from the
    // GitHub login (only surfaced when the profile's linked GitHub matches).
    const [talent, github, devfolio, contributedRepos] = await Promise.all([
      wallet ? getTalentProfile(wallet) : Promise.resolve(null),
      ghLogin ? getGithubProfile(ghLogin) : Promise.resolve(null),
      ghLogin ? getDevfolioProfileByGithub(ghLogin, String(record['Full Name'] || '')) : Promise.resolve(null),
      ghLogin ? getContributedRepos(ghLogin) : Promise.resolve(new Set<string>()),
    ])

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
    // Devs / Protocol Guild (free) and Public Good Projects (30%). OSS
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

    // Prev/next neighbors (ordered by Id) for in-review navigation. Best-effort:
    // a failure here must not break loading the application itself.
    let nav: { prevId: number | null; nextId: number | null; position: number; total: number } = {
      prevId: null,
      nextId: null,
      position: 0,
      total: 0,
    }
    try {
      const ids = (await listRows(VIEW_ID))
        .map(r => Number(r['Id']))
        .filter(Number.isFinite)
        .sort((a, b) => a - b)
      const idx = ids.indexOf(id)
      nav = {
        prevId: idx > 0 ? ids[idx - 1] : null,
        nextId: idx >= 0 && idx < ids.length - 1 ? ids[idx + 1] : null,
        position: idx >= 0 ? idx + 1 : 0,
        total: ids.length,
      }
    } catch (err) {
      console.warn('[builder/review] nav lookup failed:', err)
    }

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
      nav,
    })
    return
  }

  if (req.method === 'POST') {
    const decision = req.body?.decision
    const comment = typeof req.body?.comment === 'string' ? (req.body.comment as string) : undefined

    // Save an admin note on its own (no decision).
    if (decision === undefined && comment !== undefined) {
      const noteRecord = await getRowById(VIEW_ID, id)
      if (!noteRecord) {
        res.status(404).json({ success: false, error: 'Builder application not found' })
        return
      }
      await updateRow(VIEW_ID, id, { 'Admin Notes': comment })
      res.status(200).json({ success: true, comment })
      return
    }

    if (decision !== 'Approved' && decision !== 'Rejected') {
      res.status(400).json({ success: false, error: "decision must be 'Approved' or 'Rejected'" })
      return
    }

    const record = await getRowById(VIEW_ID, id)
    if (!record) {
      res.status(404).json({ success: false, error: 'Builder application not found' })
      return
    }
    // Persist any note the admin typed before deciding.
    const noteUpdate = comment !== undefined ? { 'Admin Notes': comment } : {}

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
      await updateRow(VIEW_ID, id, { Decision: 'Rejected', ...noteUpdate })
      res.status(200).json({ success: true, decision: 'Rejected', emailed })
      return
    }

    // Approved: mint (or reuse) + email a builder voucher via the shared helper.
    const email = String(record['Email'] || '').trim()
    if (!email) {
      res.status(400).json({ success: false, error: 'No email on this application — cannot issue a voucher.' })
      return
    }

    // Only email on the transition INTO Approved (like the reject side) — but
    // keyed on Voucher Sent rather than Decision alone, so a failed first send
    // can still be retried by re-approving.
    const alreadyEmailed = record['Decision'] === 'Approved' && Boolean(record['Voucher Sent'])
    const result = await issueBuilderVoucher(email, builderIdentities(record), String(record['Full Name'] || ''), {
      skipEmail: alreadyEmailed,
    })
    if (!result.ok) {
      if (result.error === 'not-configured') {
        res.status(500).json({ success: false, error: 'Builder discount is not configured (no Pretix item).' })
      } else if (result.error === 'sold-out') {
        res.status(409).json({ success: false, error: 'The builder discount ticket is sold out.' })
      } else if (result.error === 'exhausted') {
        res.status(409).json({ success: false, error: 'Could not issue a voucher (pool exhausted).' })
      } else {
        res.status(502).json({ success: false, error: 'Could not issue voucher. Please try again.' })
      }
      return
    }

    await updateRow(VIEW_ID, id, {
      Decision: 'Approved',
      'Voucher Code': result.code,
      // Never downgrade the flag: a skipped (deduped) send returns emailed=false.
      'Voucher Sent': result.emailed || Boolean(record['Voucher Sent']),
      ...noteUpdate,
    })

    res.status(200).json({ success: true, decision: 'Approved', code: result.code, emailed: result.emailed, reused: result.reused })
    return
  }

  res.status(405).json({ success: false, error: 'Method not allowed' })
}
