import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getFormConfigByViewId, isFormOpen } from 'services/form-config'
import { getTableFields, createRow, findRowByEmail, updateRow, getAllTableColumns } from 'services/nocodb'

// Convention: any OTP-required form is expected to have a column literally
// named "Email" on the underlying table. The server writes the OTP-verified
// email into that column on submit — no per-form lookup needed.
const EMAIL_COLUMN_NAME = 'Email'
import { classifyEligibility } from 'services/email-classifier'
import { getPaidOrdersByEmail } from 'services/pretix'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { verifyProof } from 'services/builder/proof'
import { getContributions } from 'services/builder/github-contributions'
import type { NotableCandidate } from 'services/builder/github-contributions'
import { parseRepoList } from 'services/builder/repo-ref'
import { scoreBuilder, qualifiesForAutoApproval } from 'services/builder/scoring'
import { getPastDevconEvents } from 'services/builder/poap-attendees'
import { builderIdentities, issueBuilderVoucher } from 'services/builder/voucher'
import { builderAutoApproveEnabled } from 'config/ticketing'
import { isApprovedSpeaker } from 'services/pretalx'

// Slug of the visa-collection form. Only this form gates submissions on the
// signed-in email having a paid Pretix order (purchaser or assigned attendee).
const VISA_FORM_SLUG = 'visa-collection-attendees'

// Column on the visa table where we write the newline-separated list of Pretix
// order codes belonging to the signed-in user. (LongText column.)
const VISA_ORDER_ID_COLUMN = 'Devcon 8 Order ID'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').end()
  }

  const { viewId } = req.query
  if (typeof viewId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid viewId' })
  }

  const { data } = req.body ?? {}
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return res.status(400).json({ success: false, error: 'Missing or invalid data' })
  }

  try {
    const config = await getFormConfigByViewId(viewId)

    if (config && !isFormOpen(config)) {
      return res.status(403).json({
        success: false,
        error: 'This form is no longer accepting submissions.',
      })
    }

    // Auth check: if form requires OTP, validate Supabase session
    let verifiedEmail: string | null = null

    if (config?.requireOtp) {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authentication required' })
      }

      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ success: false, error: 'Auth service not configured' })
      }

      const supabase = createClient(supabaseUrl, supabaseKey)
      const token = authHeader.slice(7)
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)

      if (authError || !user?.email) {
        console.error('[nocodb/submit] auth failed', {
          viewId,
          authError: authError?.message,
          authStatus: (authError as any)?.status,
          authName: (authError as any)?.name,
          hasUser: !!user,
          tokenLength: token.length,
          tokenPrefix: token.slice(0, 12),
          supabaseUrl,
        })
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired session',
          details: authError?.message ?? 'No user returned from getUser',
        })
      }

      verifiedEmail = user.email.toLowerCase()
    } else {
      // For non-OTP forms, still extract email from token if provided
      const authHeader = req.headers.authorization
      if (authHeader?.startsWith('Bearer ')) {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey)
          const token = authHeader.slice(7)
          const { data: { user } } = await supabase.auth.getUser(token)
          if (user?.email) verifiedEmail = user.email.toLowerCase()
        }
      }
    }

    // Validate fields against schema. Attachment columns on the underlying
    // table are always allowed (some — like the student-application enrollment_proof —
    // are hidden from the form view and uploaded via dedicated UI).
    const fields = await getTableFields(viewId)
    const validNames = new Set(fields.map(f => f.column_name))
    const allColumns = await getAllTableColumns(viewId)
    for (const c of allColumns) {
      if (c.uidt === 'Attachment') validNames.add(c.column_name)
    }

    for (const key of Object.keys(data)) {
      if (!validNames.has(key)) {
        return res.status(400).json({ success: false, error: `Unknown field: ${key}` })
      }
    }

    // Visa-form gate: signed-in email must have a paid Pretix order OR be an
    // approved (accepted/confirmed) Pretalx speaker. We check here (post-OTP) so
    // a bad actor can't bypass by replaying a submit POST. On success we autofill
    // the order-id column: the newline-separated order codes for ticket holders,
    // or the literal "Approved Speaker" for speakers (who have no Pretix order),
    // so the visa team can tell the eligibility basis apart.
    if (verifiedEmail && config?.formSlug === VISA_FORM_SLUG) {
      const orders = await getPaidOrdersByEmail(verifiedEmail)
      if (orders.length > 0) {
        data[VISA_ORDER_ID_COLUMN] = orders.map(o => o.code).join('\n')
      } else if (await isApprovedSpeaker(verifiedEmail)) {
        data[VISA_ORDER_ID_COLUMN] = 'Approved Speaker'
      } else {
        return res.status(403).json({
          success: false,
          error: 'NO_TICKET',
          details: `No Devcon ticket or approved speaker profile found for ${verifiedEmail}. Sign in with the email used to purchase your ticket or submit your talk, or reassign the ticket's attendee email in Pretix.`,
        })
      }
    }

    // Email classification & eligibility gate is specific to the student
    // application form — it classifies institutional emails and gates
    // submissions on enrollment proof. Other forms shouldn't run this (the
    // "Email Classification" column doesn't exist on those NocoDB tables and
    // would cause writes to fail).
    const isStudentApplication = config?.formSlug === 'student-application'
    if (verifiedEmail && isStudentApplication) {
      const { bucket } = await classifyEligibility(verifiedEmail)

      if (bucket === 'blocked') {
        const proof = data.enrollment_proof
        const hasProof = Array.isArray(proof) ? proof.length > 0 : !!proof
        if (!hasProof) {
          return res.status(400).json({
            success: false,
            error: 'Proof of enrollment is required for non-institutional emails.',
          })
        }
      } else {
        // Whitelisted/AI-university buckets shouldn't carry an enrollment_proof.
        delete data.enrollment_proof
      }

      // Map our cached "blocked" bucket to the NocoDB option label "proof-required".
      // (Cache keeps "blocked" — only the value written to NocoDB is renamed.)
      data['Email Classification'] = bucket === 'blocked' ? 'proof-required' : bucket
    }

    // Builder-application branch. The server is authoritative: it reads the
    // proof tokens from the TOP-LEVEL body (not `data`), verifies them, derives
    // the trusted GitHub username / wallet address, pulls the user's contributed
    // repos, scores them against the manually-claimed repos, and injects the
    // script-output columns. This MUST run after the field-validation block above
    // because the injected columns (Matched Repos / Matched Count / Match Source)
    // are not part of the form-visible allowed-field set.
    // Set when the builder branch determines the applicant qualifies for instant
    // approval (see qualifiesForAutoApproval). Acted on at write time below.
    let builderAutoApprove: { approve: boolean; reason: string | null } = { approve: false, reason: null }

    if (config?.formSlug === 'builder-application') {
      // GitHub identity is the existing NextAuth GitHub session (set via the
      // shared /signin popup). Read it server-side — never trust a client value.
      const session = await getServerSession(req, res, authOptions)
      const githubUsername = session?.type === 'github' ? session.id : null

      // Wallet stays on its own SIWE→proof flow (not NextAuth) so it can coexist
      // with the GitHub session — NextAuth is single-session.
      const walletProof = typeof req.body?.walletProof === 'string' ? req.body.walletProof : ''
      const walletAddress = walletProof ? verifyProof(walletProof, 'wallet') : null

      // Server is authoritative: overwrite any client-supplied display values with verified ones.
      if (githubUsername) data['GitHub Username'] = githubUsername
      else delete data['GitHub Username']
      if (walletAddress) {
        data['Wallet Address'] = walletAddress
        // POAP URL and Talent Protocol URL are admin-only columns derived from the
        // verified wallet (both resolve by address). Never trust client values.
        data['POAP URL'] = `https://collectors.poap.xyz/scan/${walletAddress}`
        data['Talent Protocol URL'] = `https://talent.app/${walletAddress}`
        // Auto-detect past Devcon/Devconnect attendance from the wallet's POAPs.
        data['Past Devcon POAPs'] = getPastDevconEvents(walletAddress).join(', ')
      } else {
        delete data['Wallet Address']
        delete data['POAP URL']
        delete data['Talent Protocol URL']
        delete data['Past Devcon POAPs']
      }

      const claimedRepos = parseRepoList(typeof data['Contributed Repos'] === 'string' ? data['Contributed Repos'] : '')

      let contributedRepos = new Set<string>()
      let notableCandidates: NotableCandidate[] = []
      if (githubUsername) {
        try {
          const data = await getContributions(githubUsername)
          contributedRepos = data.repos
          notableCandidates = data.notableCandidates
        } catch {
          contributedRepos = new Set<string>()
        }
      }

      const score = await scoreBuilder({ githubUsername, contributedRepos, claimedRepos, notableRepos: notableCandidates })

      data['Matched Repos'] = JSON.stringify(score.matchedRepos)
      data['Matched Count'] = score.matchedCount
      data['Match Source'] = score.matchSource

      builderAutoApprove = builderAutoApproveEnabled()
        ? qualifiesForAutoApproval(githubUsername, score.matchedRepos)
        : { approve: false, reason: null }
    }

    data['Submission Date'] = new Date().toISOString()

    // For OTP-required forms: write the OTP-verified email into the conventional
    // "Email" column and look up any existing row (re-submissions edit it).
    let existingRow: any = null
    if (verifiedEmail && config?.requireOtp) {
      data[EMAIL_COLUMN_NAME] = verifiedEmail
      existingRow = await findRowByEmail(viewId, EMAIL_COLUMN_NAME, verifiedEmail)
    }

    // Builder auto-approve: instantly issue + email the voucher when the applicant
    // clearly qualifies. Skipped if a prior submission was already decided (so we
    // never override a manual decision or re-email on re-submit). Best-effort —
    // if issuing fails, the application is simply left pending for manual review.
    let autoApproved = false
    if (config?.formSlug === 'builder-application' && builderAutoApprove.approve && verifiedEmail) {
      const priorDecision = existingRow?.['Decision']
      const alreadyDecided = priorDecision === 'Approved' || priorDecision === 'Rejected'
      if (!alreadyDecided) {
        const identities = builderIdentities({
          'Wallet Address': data['Wallet Address'],
          'GitHub Username': data['GitHub Username'],
          Email: verifiedEmail,
        })
        const result = await issueBuilderVoucher(verifiedEmail, identities)
        if (result.ok) {
          data['Decision'] = 'Approved'
          data['Auto Approved'] = true
          data['Voucher Code'] = result.code
          data['Voucher Sent'] = result.emailed
          data['Admin Notes'] = `Auto-approved on submit — ${builderAutoApprove.reason}.`
          autoApproved = true
        } else {
          console.warn('[builder auto-approve] voucher issue failed, left for review:', result.error)
        }
      }
    }

    if (existingRow) {
      await updateRow(viewId, existingRow.Id, data)
      return res.status(200).json({ success: true, updated: true, autoApproved })
    }

    await createRow(viewId, data)
    return res.status(200).json({ success: true, autoApproved })
  } catch (err) {
    const axiosBody = (err as any)?.response?.data
    console.error('[nocodb/submit]', err, axiosBody ? { axiosBody } : '')
    const msg = (err as Error).message
    if (msg.includes('Form view not found')) {
      return res.status(404).json({ success: false, error: 'Form not found' })
    }
    const details = axiosBody ? `${msg} — ${typeof axiosBody === 'string' ? axiosBody : JSON.stringify(axiosBody)}` : msg
    return res.status(500).json({ success: false, error: 'Submission failed', details })
  }
}
