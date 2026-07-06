/**
 * Configure the Builder Application Form view (vwmee9a1l1dyqg34):
 *  - SHOW only applicant-facing fields
 *  - HIDE the server-written Email, the Title display field, all admin/script
 *    columns, and system columns
 *  - mark a few core fields required
 * Idempotent: only PATCHes form columns whose show/required differ from desired.
 *
 * Run with: npx tsx src/scripts/builder/configure-form-view.ts
 */
import 'dotenv/config'
import { GITHUB_PREFIX, WALLET_PREFIX } from 'config/form-field-markers'

const BASE_URL = (process.env.NOCODB_BASE_URL || '').replace(/\/$/, '')
const TOKEN = process.env.NOCODB_API_TOKEN || ''
const TABLE_ID = 'mj5drwikc8fxslp'
const FORM_VIEW_ID = 'vwmee9a1l1dyqg34'

if (!BASE_URL || !TOKEN) {
  console.error('Missing NOCODB_BASE_URL or NOCODB_API_TOKEN')
  process.exit(1)
}
const headers = { 'xc-token': TOKEN, 'Content-Type': 'application/json' }

// Ordered, applicant-facing form fields. Order in this array = order on the form
// (connectors first). Any column NOT listed here is hidden (Email is written
// server-side; Title/system + all admin/script columns stay hidden; Gender is
// intentionally dropped). Descriptions become the field help text.
interface FieldCfg {
  // Matches the underlying table column title (the data column name).
  title: string
  required?: boolean
  description?: string
  // Optional form-view label override. Used to apply the custom-component
  // markers (e.g. "[github]"/"[wallet]") so the renderer swaps in a connector
  // instead of a plain input. The data column keeps its real `title`.
  label?: string
}

const FIELD_CONFIG: FieldCfg[] = [
  {
    title: 'Full Name',
    required: true,
    description:
      'Please enter your full name as it appears on your ID – we require ID to be shown when you register at the event.',
  },
  {
    // Renders as the combined "Connections" block (GitHub + wallet). This field's
    // description is the block's shared helper; the wallet field's is unused.
    title: 'GitHub Username',
    label: `${GITHUB_PREFIX} GitHub Username`,
    description:
      'Connect your GitHub and/or a wallet to verify your OSS and web3 contributions, as well as your onchain identity.',
  },
  {
    title: 'Wallet Address',
    label: `${WALLET_PREFIX} Wallet Address`,
    description: 'Connect a wallet to link your POAPs / onchain identity.',
  },
  { title: 'Country', required: true, description: 'Country of origin.' },
  {
    title: 'Role',
    required: true,
    description: 'Select all that apply. Choose "Other" to enter a custom role in the next field.',
  },
  { title: 'Other Role', description: 'If you selected "Other" above, tell us your role.' },
  { title: 'Team', description: 'Team / Company / Organization (if applicable).' },
  {
    title: 'Contributed Repos',
    description:
      "Connect your GitHub and we'll verify repos across OSS, Web3 and Hackathons. Alternatively, you can add significant repos here, 1-per-line, we might not detect.",
  },
  // Devfolio URL, Talent Protocol URL and POAP URL are intentionally NOT listed:
  // they're admin-only / auto-detected. Devfolio is now auto-detected from the
  // GitHub login in the review tool; Talent + POAP are server-populated from the
  // connected wallet (talent.app/<address> and collectors.poap.xyz/scan/<address>).
  { title: 'Personal Website', description: 'Personal website or portfolio. e.g. https://yourname.xyz' },
  { title: 'Social URL', description: 'Twitter / X or other social profile. e.g. https://x.com/yourname' },
  {
    // Single consolidated essay. Data is stored in the existing "Why Ethereum"
    // column; the form-view label shows the broader prompt. ("Goals" and
    // "Gender" are no longer collected.)
    title: 'Why Ethereum',
    required: true,
    label: 'Why would you like to attend Devcon?',
    description:
      "You can reference the values you're passionate about or what you currently build or contribute to. Please write in your own words; AI-generated responses are likely to result in a rejection.",
  },
]

const CONFIG_BY_TITLE = new Map<string, { order: number; cfg: FieldCfg }>(
  FIELD_CONFIG.map((cfg, i) => [cfg.title, { order: i + 1, cfg }]),
)

const FORM_HEADING = 'Sanctuary Tech Builders application'

const FORM_SUBHEADING =
  'We value the people who build sanctuary tech: the open, decentralized, privacy-preserving technology that keeps the internet free and self-sovereign. Builders of all kinds; developers, designers, researchers, organizers, artists, and more – can apply for a discounted ticket.'

const FORM_SUCCESS_MSG =
  'Thanks for applying! Our team will review your application and follow up by email. Keep an eye on your inbox.'

async function setFormMeta(): Promise<void> {
  const body = { heading: FORM_HEADING, subheading: FORM_SUBHEADING, success_msg: FORM_SUCCESS_MSG }
  let res = await fetch(`${BASE_URL}/api/v2/meta/forms/${FORM_VIEW_ID}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    res = await fetch(`${BASE_URL}/api/v1/db/meta/forms/${FORM_VIEW_ID}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    })
  }
  if (!res.ok) throw new Error(`set form heading/subheading failed: ${res.status} ${await res.text()}`)
  console.log('  set form title + description + success message')
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res.json()
}

async function patchFormColumn(id: string, body: Record<string, unknown>): Promise<void> {
  let res = await fetch(`${BASE_URL}/api/v2/meta/form-columns/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    res = await fetch(`${BASE_URL}/api/v1/db/meta/form-columns/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    })
  }
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`PATCH form-column ${id} failed: ${res.status} ${t}`)
  }
}

// Show "Other Role" only when Role includes "Other". NocoDB form-visibility
// rules live as view filters with fk_parent_column_id = the governed field.
// evaluateRule (FormRenderer) compares the MultiSelect's option titles, so the
// filter value must be the option title "Other".
async function ensureConditionalRule(idByTitle: Map<string, string>): Promise<void> {
  const roleId = idByTitle.get('Role')
  const otherRoleId = idByTitle.get('Other Role')
  if (!roleId || !otherRoleId) {
    console.log('  (skip conditional rule — Role / Other Role column not found)')
    return
  }
  const list = await getJson(`${BASE_URL}/api/v1/db/meta/views/${FORM_VIEW_ID}/filters`)
  const exists = (list.list ?? []).some(
    (f: any) => f.fk_parent_column_id === otherRoleId && f.fk_column_id === roleId,
  )
  if (exists) {
    console.log('  = conditional rule for "Other Role" already exists')
    return
  }
  const res = await fetch(`${BASE_URL}/api/v1/db/meta/views/${FORM_VIEW_ID}/filters`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fk_parent_column_id: otherRoleId,
      fk_column_id: roleId,
      comparison_op: 'anyof',
      value: 'Other',
      logical_op: 'and',
    }),
  })
  if (!res.ok) throw new Error(`create conditional rule failed: ${res.status} ${await res.text()}`)
  console.log('  + created conditional rule: show "Other Role" when Role includes "Other"')
}

export async function configureFormView(): Promise<void> {
  let tableMeta: any
  try {
    tableMeta = await getJson(`${BASE_URL}/api/v2/meta/tables/${TABLE_ID}`)
  } catch {
    tableMeta = await getJson(`${BASE_URL}/api/v1/db/meta/tables/${TABLE_ID}`)
  }
  const titleById = new Map<string, string>()
  const idByTitle = new Map<string, string>()
  for (const c of tableMeta.columns ?? []) {
    titleById.set(c.id, c.title)
    idByTitle.set(c.title, c.id)
  }

  let form: any
  try {
    form = await getJson(`${BASE_URL}/api/v2/meta/forms/${FORM_VIEW_ID}`)
  } catch {
    form = await getJson(`${BASE_URL}/api/v1/db/meta/forms/${FORM_VIEW_ID}`)
  }

  for (const fc of form.columns ?? []) {
    const title = titleById.get(fc.fk_column_id) ?? ''
    const entry = CONFIG_BY_TITLE.get(title)
    const desiredShow = !!entry
    const desiredRequired = !!entry?.cfg.required
    const desiredDescription = entry?.cfg.description ?? ''
    const desiredOrder = entry?.order
    const desiredLabel = entry?.cfg.label // undefined = leave the label as-is
    const curShow = !!fc.show
    const curRequired = !!fc.required
    const curDescription = fc.description ?? ''
    const sameOrder = desiredOrder === undefined || fc.order === desiredOrder
    const sameLabel = desiredLabel === undefined || (fc.label ?? '') === desiredLabel
    if (
      curShow === desiredShow &&
      curRequired === desiredRequired &&
      curDescription === desiredDescription &&
      sameOrder &&
      sameLabel
    ) {
      continue
    }
    const body: Record<string, unknown> = { show: desiredShow, required: desiredRequired, description: desiredDescription }
    if (desiredOrder !== undefined) body.order = desiredOrder
    if (desiredLabel !== undefined) body.label = desiredLabel
    await patchFormColumn(fc.id, body)
    console.log(
      `  updated "${title || fc.fk_column_id}": show=${desiredShow} required=${desiredRequired} order=${desiredOrder ?? fc.order}${desiredLabel !== undefined ? ` label="${desiredLabel}"` : ''}`,
    )
  }

  await ensureConditionalRule(idByTitle)
  await setFormMeta()
}

// Allow running standalone: `npx tsx src/scripts/builder/configure-form-view.ts`
if (require.main === module) {
  configureFormView()
    .then(() => console.log('Done.'))
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}
