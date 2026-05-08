/**
 * Event-level apply: create or adopt the target event, then PATCH its
 * user-visible settings. Forces live=false, testmode=true, is_public=false
 * regardless of what the source set.
 *
 * Settings copy uses an allowlist — Pretix returns a wide blob that includes
 * payment-provider credentials, mail SMTP config, invoice numbering counters,
 * and other instance-bound state we must not transplant.
 */
import { PretixClient } from '../pretixClient'
import { CliOptions, Snapshot } from '../types'
import { suffixMultilingual } from '../suffix'

// Locale settings — applied first so multilingual text fields below will validate.
const SETTINGS_LOCALE_PASS: string[] = ['locales', 'locale', 'timezone']

// Everything else, applied after locales are set.
// Excludes: `logo_image`, `og_image` (instance-bound file IDs that don't exist on the target),
// `name_scheme` (version-dependent enum that may not exist on the target Pretix version).
const SETTINGS_ALLOWLIST: string[] = [
  // Branding / public-facing copy
  'imprint_url',
  'contact_mail',
  'frontpage_text',
  'voucher_explanation_text',
  'attendee_names_asked',
  'attendee_names_required',
  'attendee_emails_asked',
  'attendee_emails_required',
  'attendee_company_asked',
  'attendee_company_required',
  'attendee_addresses_asked',
  'attendee_addresses_required',
  'order_email_asked_twice',
  'show_quota_left',
  'waiting_list_enabled',
  'waiting_list_hours',
  'max_items_per_order',
  'reservation_time',
  'show_dates_on_frontpage',
  'show_times',
  'name_format',
  'last_order_modification_date',
  'cancel_allow_user',
  'cancel_allow_user_until',
  'tax_rate_default',
  'primary_color',
  'theme_color_success',
  'theme_color_danger',
  'theme_color_background',
  'meta_noindex',
]

/**
 * PATCH /settings/ with a one-shot fallback: if Pretix returns 400 with per-field
 * validation errors, drop the offending keys (instance-bound file IDs, unsupported
 * languages on multilingual values, version-specific enums) and retry once. This
 * keeps the clone running end-to-end on dev where the target Pretix instance has
 * a different feature/locale surface than prod.
 */
async function patchSettingsWithFallback(
  client: PretixClient,
  url: string,
  body: Record<string, unknown>,
): Promise<void> {
  try {
    await client.patch(url, body)
    return
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    const m = msg.match(/failed \(400\): ([\s\S]+)$/)
    if (!m) throw err
    let parsed: unknown
    try {
      parsed = JSON.parse(m[1])
    } catch {
      throw err
    }
    if (!parsed || typeof parsed !== 'object') throw err
    const offendingKeys = Object.keys(parsed as Record<string, unknown>)
    const filtered: Record<string, unknown> = { ...body }
    let dropped = 0
    for (const k of offendingKeys) {
      if (k in filtered) {
        delete filtered[k]
        dropped++
      }
    }
    if (dropped === 0) throw err
    console.warn(
      '[event] dropping ' + dropped + ' settings keys rejected by target: ' + offendingKeys.join(', '),
    )
    if (Object.keys(filtered).length === 0) return
    await client.patch(url, filtered)
  }
}

interface CreateEventBody {
  slug: string
  name: Record<string, string> | string
  live: false
  testmode: true
  is_public: false
  currency: string
  date_from?: string | null
  date_to?: string | null
  presale_start?: string | null
  presale_end?: string | null
  timezone?: string
  plugins?: string[]
  has_subevents?: boolean
}

export async function applyEvent(opts: {
  targetClient: PretixClient
  orgClient: PretixClient // organizer-scoped client (no event)
  snapshot: Snapshot
  cli: CliOptions
  targetEventSlug: string
}): Promise<{ created: boolean }> {
  const { targetClient, orgClient, snapshot, cli, targetEventSlug } = opts
  const ev = snapshot.event as Record<string, unknown>

  // 1) Does the target event already exist?
  // 404 → doesn't exist, proceed to create.
  // 403 → token can't see it; usually means it doesn't exist or has no event-level role yet.
  //       We treat this as "proceed to create" — if it actually exists, the create call will fail clearly.
  let exists = false
  try {
    await targetClient.getJson(targetClient.eventUrl('/'))
    exists = true
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (!msg.includes('404') && !msg.includes('403')) throw err
  }

  if (exists && !cli.force) {
    throw new Error(
      'Target event slug "' +
        targetEventSlug +
        '" already exists. Pass --force to reuse it, or pick a different slug.',
    )
  }

  // Suffixed event name is used both for create body and for re-stamping on reuse.
  const suffixedName = suffixMultilingual(
    (ev.name as Record<string, string> | string) ?? targetEventSlug,
  ) as Record<string, string> | string

  if (!exists) {
    if (cli.dryRun) {
      console.log('[event] DRY RUN: would create event ' + targetEventSlug)
      return { created: true }
    }
    const body: CreateEventBody = {
      slug: targetEventSlug,
      name: suffixedName,
      live: false,
      testmode: true,
      is_public: false,
      currency: (ev.currency as string) ?? 'EUR',
      date_from: (ev.date_from as string | null | undefined) ?? null,
      date_to: (ev.date_to as string | null | undefined) ?? null,
      presale_start: (ev.presale_start as string | null | undefined) ?? null,
      presale_end: (ev.presale_end as string | null | undefined) ?? null,
      timezone: (ev.timezone as string | undefined) ?? 'UTC',
      plugins: (ev.plugins as string[] | undefined) ?? [],
      has_subevents: (ev.has_subevents as boolean | undefined) ?? false,
    }
    console.log('[event] creating ' + targetEventSlug)
    await orgClient.post(orgClient.orgUrl('/events/'), body)
  } else {
    console.log('[event] reusing existing target event ' + targetEventSlug + ' (--force)')
    // Re-apply the suffixed name so re-runs propagate any source rename
    // and re-stamp the suffix if it was edited away.
    if (!cli.dryRun) {
      await targetClient.patch(targetClient.eventUrl('/'), { name: suffixedName })
      console.log('[event] re-applied event name')
    }
  }

  // 2) Apply settings in two passes:
  //    Pass A: locales/locale/timezone — must come first so multilingual fields validate.
  //    Pass B: everything else.
  const settingsObj = snapshot.settings as Record<string, unknown>
  const localesPatch: Record<string, unknown> = {}
  for (const key of SETTINGS_LOCALE_PASS) {
    if (key in settingsObj) localesPatch[key] = settingsObj[key]
  }
  const restPatch: Record<string, unknown> = {}
  for (const key of SETTINGS_ALLOWLIST) {
    if (key in settingsObj) restPatch[key] = settingsObj[key]
  }
  if (cli.dryRun) {
    console.log(
      '[event] DRY RUN: would PATCH ' +
        Object.keys(localesPatch).length +
        ' locale settings, then ' +
        Object.keys(restPatch).length +
        ' other settings',
    )
  } else {
    if (Object.keys(localesPatch).length) {
      console.log('[event] patching ' + Object.keys(localesPatch).length + ' locale settings')
      await patchSettingsWithFallback(targetClient, targetClient.eventUrl('/settings/'), localesPatch)
    }
    console.log('[event] patching ' + Object.keys(restPatch).length + ' other settings')
    await patchSettingsWithFallback(targetClient, targetClient.eventUrl('/settings/'), restPatch)
  }

  return { created: !exists }
}
