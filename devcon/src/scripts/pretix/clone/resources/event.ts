/**
 * Event-level apply: create or adopt the target event, then PATCH its
 * user-visible settings. Forces live=false, testmode=true, is_public=false
 * regardless of what the source set.
 *
 * Settings copy uses an allowlist — Pretix returns a wide blob that includes
 * payment-provider credentials, mail SMTP config, invoice numbering counters,
 * and other instance-bound state we must not transplant.
 *
 * File-typed settings (`logo_image`, `invoice_logo_image`) are mirrored via
 * uploadFile — Pretix file IDs are instance-bound, so we download the source
 * public media URL and upload to the target. Results are cached in state to
 * avoid re-uploading unchanged images.
 *
 * Tax-rule-id-typed settings (`tax_rule_cancellation`, `tax_rule_payment`)
 * are applied in a separate post-tax-rules phase via `applyEventSettingsAfterTaxRules`
 * because state.ids.tax_rules isn't populated until phase 2.
 */
import { PretixClient } from '../pretixClient'
import { CliOptions, CloneState, Snapshot } from '../types'
import { suffixMultilingual } from '../suffix'

// Locale settings — applied first so multilingual text fields below will validate.
const SETTINGS_LOCALE_PASS: string[] = ['locales', 'locale', 'timezone']

// File-typed settings: source value is a public media URL, must be re-uploaded to target.
const SETTINGS_FILE_FIELDS: string[] = ['logo_image', 'invoice_logo_image']

// Tax-rule-id-typed settings: need remapping through state.ids.tax_rules.
// Patched in a separate phase after applyTaxRules has populated the map.
const SETTINGS_TAX_RULE_REFS: string[] = ['tax_rule_cancellation', 'tax_rule_payment']

// Key prefixes — anything matching is copied as-is. Used for mail templates
// (mail_text_*, mail_subject_*, mail_html_*) where the per-event template count
// can run into the dozens. The source is the editorial truth; the dev target
// won't actually send these mails unless its SMTP is wired, so copying them is
// safe and useful for end-to-end UX testing.
const SETTINGS_KEY_PREFIXES: string[] = ['mail_text_', 'mail_subject_', 'mail_html_']

// Everything else, applied after locales are set.
// Excludes: payment provider credentials, mail SMTP server config, instance-bound
// invoice address details, invoice numbering counters (would clobber target's
// sequence), and any setting whose value is a file ID (handled separately above).
const SETTINGS_ALLOWLIST: string[] = [
  // ── Branding / public-facing copy ──
  'imprint_url',
  'contact_mail',
  'frontpage_text',
  'voucher_explanation_text',
  'primary_color',
  'primary_font',
  'theme_color_success',
  'theme_color_danger',
  'theme_color_background',
  'theme_round_borders',
  'logo_image_large',
  'logo_show_title',
  'meta_noindex',

  // ── Attendee form & order data collection ──
  'attendee_names_asked',
  'attendee_names_required',
  'attendee_emails_asked',
  'attendee_emails_required',
  'attendee_company_asked',
  'attendee_company_required',
  'attendee_addresses_asked',
  'attendee_addresses_required',
  'order_email_asked_twice',
  'invoice_address_asked',
  'invoice_address_not_asked_free',
  'name_format',
  'name_scheme',
  'hide_prices_from_attendees',

  // ── Shop browse / checkout flow ──
  'show_quota_left',
  'show_dates_on_frontpage',
  'show_date_to',
  'show_times',
  'show_items_outside_presale_period',
  'event_list_filters',
  'event_list_type',
  'frontpage_subevent_ordering',
  'redirect_to_checkout_directly',
  'max_items_per_order',
  'reservation_time',
  'confirm_texts',

  // ── Payment terms & order expiry ──
  'payment_term_days',
  'payment_term_minutes',
  'payment_term_mode',
  'payment_term_weekdays',
  'payment_term_accept_late',
  'payment_term_expire_automatically',
  'payment_term_expire_delay_days',
  'mail_days_order_expire_warning',

  // ── Cancellation policy ──
  'cancel_allow_user',
  'cancel_allow_user_until',
  'cancel_allow_user_paid',
  'cancel_allow_user_paid_until',
  'cancel_allow_user_paid_adjust_fees_explanation',
  'cancel_allow_user_paid_keep',
  'cancel_allow_user_paid_keep_percentage',
  'cancel_allow_user_paid_refund_as_giftcard',
  'cancel_allow_user_unpaid_keep',
  'cancel_allow_user_unpaid_keep_percentage',
  'last_order_modification_date',
  'allow_modifications',
  'change_allow_user_price',

  // ── Waitlist ──
  'waiting_list_enabled',
  'waiting_list_auto',
  'waiting_list_hours',
  'waiting_list_limit_per_user',

  // ── Ticket download ──
  'ticket_download',
  'ticket_download_addons',
  'ticket_download_nonadm',
  'ticket_secret_length',

  // ── Tax ──
  'tax_rate_default',
  'tax_rounding',

  // ── Email (non-template settings; templates handled via SETTINGS_KEY_PREFIXES) ──
  'mail_from_name',
  'mail_attach_tickets',

  // ── Locale / region ──
  'region',

  // ── NFC / reusable media (only relevant if testing those flows) ──
  'reusable_media_type_barcode_identifier_length',
  'reusable_media_type_nfc_mf0aes_autocreate_giftcard_currency',
  'reusable_media_type_nfc_uid_autocreate_giftcard_currency',
]

/**
 * Mirror a public media URL from the source instance to the target. Returns a
 * `file:<uuid>` reference suitable for assigning to a settings file field.
 * Caches results in state.settingsFiles keyed by setting name + source URL so
 * unchanged images aren't re-uploaded on every clone run.
 */
async function ensureSettingFile(
  targetClient: PretixClient,
  state: CloneState,
  settingKey: string,
  sourceUrl: string,
): Promise<string | null> {
  state.settingsFiles = state.settingsFiles ?? {}
  const cached = state.settingsFiles[settingKey]
  if (cached && cached.sourceUrl === sourceUrl) return cached.targetFileId

  try {
    const dl = await fetch(sourceUrl)
    if (!dl.ok) {
      console.warn(
        '[event.file] download failed for ' + settingKey + ': ' + dl.status + ' (' + sourceUrl + ')',
      )
      return null
    }
    const buf = Buffer.from(await dl.arrayBuffer())
    const contentType = dl.headers.get('content-type') ?? 'application/octet-stream'
    const filename = decodeURIComponent(sourceUrl.split('/').pop() || settingKey)
    const fileId = await targetClient.uploadFile(buf, filename, contentType)
    state.settingsFiles[settingKey] = { sourceUrl, targetFileId: fileId }
    console.log('[event.file] uploaded ' + settingKey + ' → ' + fileId + ' (' + filename + ')')
    return fileId
  } catch (err) {
    console.warn(
      '[event.file] upload failed for ' + settingKey + ': ' + (err as Error).message,
    )
    return null
  }
}

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

// Event-level fields copied at create AND re-applied on every patch run.
// Excludes: `seating_plan`, `seat_category_mapping` (FK to organizer-level seating
// plans; the target org may not have a matching plan). `item_meta_properties` is
// also excluded — it references org-level meta property definitions by ID.
const EVENT_FIELDS: string[] = [
  'date_from',
  'date_to',
  'date_admission',
  'presale_start',
  'presale_end',
  'currency',
  'timezone',
  'location',
  'geo_lat',
  'geo_lon',
  'comment',
  'plugins',
  'has_subevents',
  'meta_data',
  'sales_channels',
  'all_sales_channels',
  'limit_sales_channels',
]

function buildEventBody(
  ev: Record<string, unknown>,
  suffixedName: Record<string, string> | string,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: suffixedName,
    live: false,
    testmode: true,
    is_public: false,
  }
  for (const k of EVENT_FIELDS) {
    if (k in ev) body[k] = ev[k]
  }
  return body
}

export async function applyEvent(opts: {
  targetClient: PretixClient
  orgClient: PretixClient // organizer-scoped client (no event)
  snapshot: Snapshot
  state: CloneState
  cli: CliOptions
  targetEventSlug: string
}): Promise<{ created: boolean }> {
  const { targetClient, orgClient, snapshot, state, cli, targetEventSlug } = opts
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

  const eventBody = buildEventBody(ev, suffixedName)

  if (!exists) {
    if (cli.dryRun) {
      console.log('[event] DRY RUN: would create event ' + targetEventSlug)
    } else {
      console.log('[event] creating ' + targetEventSlug)
      await orgClient.post(orgClient.orgUrl('/events/'), { slug: targetEventSlug, ...eventBody })
    }
  } else {
    console.log('[event] reusing existing target event ' + targetEventSlug + ' (--force)')
    if (cli.dryRun) {
      console.log('[event] DRY RUN: would PATCH event-level fields')
    } else {
      // Re-apply event-level fields so re-runs propagate source edits to
      // dates, location, meta_data, plugins, etc. Slug is immutable.
      try {
        await targetClient.patch(targetClient.eventUrl('/'), eventBody)
        console.log('[event] re-applied event-level fields')
      } catch (err) {
        // Some fields (e.g. meta_data referencing org-level properties that
        // don't exist on target) can fail. Retry without meta_data so the
        // run still progresses.
        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('meta_data') && 'meta_data' in eventBody) {
          console.warn('[event] event PATCH rejected meta_data; retrying without it')
          const fallback = { ...eventBody }
          delete fallback.meta_data
          await targetClient.patch(targetClient.eventUrl('/'), fallback)
        } else {
          throw err
        }
      }
    }
  }

  // 2) Resolve file fields (logo_image, invoice_logo_image): download from
  // source, upload to target, capture file:<uuid> reference.
  const settingsObj = snapshot.settings as Record<string, unknown>
  const fileFieldPatch: Record<string, unknown> = {}
  if (!cli.dryRun) {
    for (const key of SETTINGS_FILE_FIELDS) {
      const src = settingsObj[key]
      if (typeof src !== 'string' || !src.startsWith('http')) continue
      const fileId = await ensureSettingFile(targetClient, state, key, src)
      if (fileId) fileFieldPatch[key] = fileId
    }
  } else {
    for (const key of SETTINGS_FILE_FIELDS) {
      const src = settingsObj[key]
      if (typeof src === 'string' && src.startsWith('http')) {
        console.log('[event.file] DRY RUN: would mirror ' + key + ' from ' + src.slice(0, 80))
      }
    }
  }

  // 3) Apply settings in two passes:
  //    Pass A: locales/locale/timezone — must come first so multilingual fields validate.
  //    Pass B: everything else (allowlist + prefix-matched mail templates + file refs).
  const localesPatch: Record<string, unknown> = {}
  for (const key of SETTINGS_LOCALE_PASS) {
    if (key in settingsObj) localesPatch[key] = settingsObj[key]
  }
  const restPatch: Record<string, unknown> = {}
  for (const key of SETTINGS_ALLOWLIST) {
    if (key in settingsObj) restPatch[key] = settingsObj[key]
  }
  // Prefix-matched keys (mail_text_*, mail_subject_*, mail_html_*) — copy as-is.
  for (const key of Object.keys(settingsObj)) {
    if (SETTINGS_KEY_PREFIXES.some((p) => key.startsWith(p))) {
      restPatch[key] = settingsObj[key]
    }
  }
  Object.assign(restPatch, fileFieldPatch)
  // Dev-only overrides — settings forced regardless of source. Adds friction-free
  // testing; e.g. don't ask for email twice on the order form.
  restPatch.order_email_asked_twice = false
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

/**
 * Settings that reference tax-rule IDs (`tax_rule_cancellation`,
 * `tax_rule_payment`). Run AFTER applyTaxRules so state.ids.tax_rules is
 * populated. Source IDs are remapped to target IDs before patching; a value
 * that can't be remapped is logged as a warning and skipped.
 */
export async function applyEventSettingsAfterTaxRules(opts: {
  targetClient: PretixClient
  snapshot: Snapshot
  state: CloneState
  cli: CliOptions
}): Promise<void> {
  const { targetClient, snapshot, state, cli } = opts
  const settingsObj = snapshot.settings as Record<string, unknown>
  const patch: Record<string, unknown> = {}
  for (const key of SETTINGS_TAX_RULE_REFS) {
    const srcVal = settingsObj[key]
    if (srcVal == null || srcVal === '' || srcVal === 'default' || srcVal === 'none') {
      // String enums ('default', 'none') pass through unchanged. Null/empty also.
      if (srcVal != null && srcVal !== '') patch[key] = srcVal
      continue
    }
    // Numeric source ID — remap to target.
    const srcId = typeof srcVal === 'number' ? srcVal : Number(srcVal)
    if (Number.isFinite(srcId)) {
      const targetId = state.ids.tax_rules[String(srcId)]
      if (targetId == null) {
        console.warn(
          '[event.tax_rule_refs] ' + key + '=' + srcId + ' has no target mapping; skipping',
        )
        continue
      }
      patch[key] = targetId
    }
  }
  if (!Object.keys(patch).length) return
  if (cli.dryRun) {
    console.log('[event.tax_rule_refs] DRY RUN: PATCH ' + JSON.stringify(patch))
    return
  }
  await patchSettingsWithFallback(targetClient, targetClient.eventUrl('/settings/'), patch)
  console.log('[event.tax_rule_refs] patched ' + Object.keys(patch).join(', '))
}
