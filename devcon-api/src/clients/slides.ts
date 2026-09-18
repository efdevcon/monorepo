import { AuthenticateServiceAccount, GetAccessToken } from '@/clients/google'
import { GoogleApis } from 'googleapis'
import { planDeckPermissions, type DeckPermission, type PermissionChange } from '@/utils/slides-permissions'

const SCOPES = ['https://www.googleapis.com/auth/presentations', 'https://www.googleapis.com/auth/drive']
// Where decks live and what they are copied from. No defaults on purpose: the
// Devcon 7 folder and template are retired, and a run that has not set these
// explicitly must fail before touching Drive rather than land decks in the
// wrong place. Set SLIDES_DRIVE_ID / SLIDES_FOLDER_ID / SLIDES_TEMPLATE_ID in
// the environment (see sync-pretalx.ts and docs/av/av-stack-overview.md §2d).
function requireSlidesEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set; the slides pipeline refuses to run without an explicit target`)
  return value
}
// Devcon 7
// const DRIVE_ID = '0AJsI-Zeg-2IbUk9PVA'
// const FOLDER_ID = '1IXkffNcDyycQe5Cxrc9Dtirgw1WitV1j'
// const TEMPLATE_ID = '1pDxePJwWHpzIxIjl3OZVnkS9N_tBQKRfg57PeEkTqeU'
// Devcon 8
const DRIVE_ID = requireSlidesEnv('SLIDES_DRIVE_ID')
const FOLDER_ID = requireSlidesEnv('SLIDES_FOLDER_ID')
const TEMPLATE_ID = requireSlidesEnv('SLIDES_TEMPLATE_ID')
const emailMessage = 'Your Devcon 8 presentation'
// SLIDES_SKIP_PERMISSIONS=true creates decks without granting speakers access.
// For test runs against an event that mirrors real talks (test-devcon-8), so
// no real speaker is handed a deck they never asked for.
const skipPermissions = process.env.SLIDES_SKIP_PERMISSIONS === 'true'

let client: GoogleApis | null = null
let token: string | null | undefined = undefined

export async function CreateFolders(folders: string[]) {
  console.log('Create folders', folders)
  if (!client) {
    client = await AuthenticateServiceAccount(SCOPES)
  }
  const drive = client.drive('v3')

  for (const folder of folders) {
    const exists = await drive.files.list({
      q: `name='${folder}' and trashed=false and mimeType='application/vnd.google-apps.folder' and '${FOLDER_ID}' in parents`,
      corpora: 'drive',
      spaces: 'drive',
      driveId: DRIVE_ID,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    })

    if (exists.data.files && exists.data.files.length > 0) {
      console.log('Folder already exists', folder)
      continue
    }

    const file = await drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name: folder,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [FOLDER_ID],
      },
    })

    console.log('Folder created', file.data.id)
  }
}

export interface CreatedDeck {
  id: string
  /** False when a deck with this code already existed in the folder. */
  created: boolean
  /** Speaker emails granted writer access silently (empty when skipped or none). */
  granted: string[]
  /** Speaker emails without a Google account: granted with Drive's invitation email. */
  invited: string[]
  /** Speaker emails the grant failed for; the deck exists regardless. */
  grantFailures: string[]
  skippedPermissions: boolean
}

export type GrantOutcome = 'granted' | 'invited'

/**
 * Writer grant for one email. Silent (no Drive notification) whenever Google
 * allows it. An address without a Google account cannot be granted silently:
 * Drive answers "you must check the Notify people box", and the invitation
 * email is the only way that person can ever open the deck, so for that case
 * alone the grant is retried with the notification on.
 */
async function grantWriter(drive: ReturnType<GoogleApis['drive']>, fileId: string, email: string): Promise<GrantOutcome> {
  const requestBody = { type: 'user', role: 'writer', emailAddress: email }
  try {
    await drive.permissions.create({ fileId, supportsAllDrives: true, sendNotificationEmail: false, requestBody })
    return 'granted'
  } catch (e: any) {
    if (!/notify people/i.test(e?.message ?? '')) throw e
    await drive.permissions.create({
      fileId,
      supportsAllDrives: true,
      sendNotificationEmail: true,
      emailMessage: emailMessage,
      requestBody,
    })
    return 'invited'
  }
}

/** Concise, actionable message for a Drive API failure (no stack dumps in the sync log). */
function driveErrorMessage(e: any, what: string): string {
  const code = e?.code ?? e?.status
  const msg = e?.message ?? String(e)
  if (code === 404) return `${what}: not found, or the Google identity cannot see it (share it with the account, or check the SLIDES_* ids)`
  if (code === 403) return `${what}: forbidden (${msg})`
  return `${what}: ${msg}`
}

/**
 * Deck for one talk: the existing one when a deck named "[code]" is already
 * in the folder, otherwise a copy of the template, shared with the speakers.
 * Throws with a one-line message on failure; the caller logs it.
 */
export async function CreatePresentationFromTemplate(title: string, id: string, emails: string[]): Promise<CreatedDeck> {
  if (!client) {
    client = await AuthenticateServiceAccount(SCOPES)
  }
  const drive = client.drive('v3')

  let exists
  try {
    exists = await drive.files.list({
      q: `name contains '[${id}]' and trashed=false and mimeType='application/vnd.google-apps.presentation' and '${FOLDER_ID}' in parents`,
      corpora: 'drive',
      spaces: 'drive',
      driveId: DRIVE_ID,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    })
  } catch (e) {
    throw new Error(driveErrorMessage(e, 'listing the decks folder'))
  }
  const existing = exists.data.files?.[0]?.id
  if (existing) return { id: existing, created: false, granted: [], invited: [], grantFailures: [], skippedPermissions: skipPermissions }

  let presentationId: string | null | undefined
  try {
    const presentation = await drive.files.copy({
      fileId: TEMPLATE_ID,
      supportsAllDrives: true,
      requestBody: {
        name: `${title} [${id}]`,
        parents: [FOLDER_ID],
      },
    })
    presentationId = presentation.data.id
  } catch (e) {
    throw new Error(driveErrorMessage(e, 'copying the template'))
  }
  if (!presentationId) throw new Error('copying the template returned no file id')

  const granted: string[] = []
  const invited: string[] = []
  const grantFailures: string[] = []
  if (!skipPermissions) {
    for (const email of emails) {
      try {
        const outcome = await grantWriter(drive, presentationId, email)
        ;(outcome === 'invited' ? invited : granted).push(email)
      } catch (e) {
        grantFailures.push(email)
      }
    }
  }
  return { id: presentationId, created: true, granted, invited, grantFailures, skippedPermissions: skipPermissions }
}

export async function UploadSlides(id: string, buffer: Buffer) {
  if (!client) {
    client = await AuthenticateServiceAccount(SCOPES)
  }
  const drive = client.drive('v3')

  try {
    console.log('Upload slides', id)
    const file = await drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name: `${id}.pdf`,
        parents: ['1w2B2d5ZM1i03HrV5TAlkLKuihkgDYlxf'],
      },
      media: {
        mimeType: 'application/pdf',
        body: require('stream').Readable.from(buffer),
      },
    })

    console.log('Slides uploaded', file.data.id)
    return file.data.id
  } catch (e) {
    console.log('Error upload slides', id)
    console.error(e)
  }
}

export async function RunPermissions(title: string, id: string, emails: string[]) {
  if (!client) {
    client = await AuthenticateServiceAccount(SCOPES)
  }
  const drive = client.drive('v3')

  let presentationId = null
  let lastEditor = null
  try {
    const exists = await drive.files.list({
      q: `name contains '[${id}]' and trashed=false and mimeType='application/vnd.google-apps.presentation' and '${FOLDER_ID}' in parents`,
      corpora: 'drive',
      spaces: 'drive',
      driveId: DRIVE_ID,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: 'files(id, lastModifyingUser)',
    })

    presentationId = exists?.data?.files?.[0]?.id
    lastEditor = exists?.data?.files?.[0]?.lastModifyingUser
  } catch (e) {
    console.log('Error fetching file', id, title)
    // console.error(e)
  }

  if (!presentationId) {
    console.log('Presentation not found', id, title)
    return
  }

  if (lastEditor?.emailAddress !== 'service@efdevcon.iam.gserviceaccount.com') {
    return
  }

  try {
    for (const email of emails) {
      console.log('Sending Notification Email', id, email)
      await drive.permissions.create({
        fileId: presentationId,
        supportsAllDrives: true,
        requestBody: {
          type: 'user',
          role: 'writer',
          emailAddress: email,
        },
        sendNotificationEmail: false,
      })
    }

    return true
  } catch (e) {
    console.log('Error setting permissions. Grant manually', id)
    // console.error(e)
  }
}

export interface ReconcileOptions {
  avGroup?: string | null
  keep?: string[]
  allowPublic?: boolean
  /** Plan and report only; nothing is written to Drive. */
  dryRun: boolean
}

/**
 * Bring one deck's direct grants in line with the current speaker list (see
 * utils/slides-permissions for the policy). Works from the deck id stored in
 * the session JSON, not from a folder search, so it does not depend on the
 * account being able to list the folder. Returns the planned changes; when
 * not a dry run they have been applied (failures are logged per change and
 * do not stop the others).
 */
export type AppliedChange = PermissionChange & {
  note?: string
  /** The address has no Google account; Drive sent (or tried to send) its invitation. */
  invited?: boolean
}

export async function ReconcileDeckPermissions(deckId: string, speakers: string[], opts: ReconcileOptions): Promise<AppliedChange[]> {
  if (!client) {
    client = await AuthenticateServiceAccount(SCOPES)
  }
  const drive = client.drive('v3')
  const res = await drive.permissions.list({
    fileId: deckId,
    supportsAllDrives: true,
    fields: 'permissions(id,type,role,emailAddress,permissionDetails(inherited))',
  })
  const existing: DeckPermission[] = (res.data.permissions ?? []).map((p) => ({
    id: p.id ?? '',
    type: p.type ?? '',
    role: p.role ?? '',
    emailAddress: p.emailAddress,
    inherited: p.permissionDetails?.some((d) => d.inherited) ?? false,
  }))
  const changes: AppliedChange[] = planDeckPermissions({ existing, speakers, ...opts })
  if (opts.dryRun) return changes

  for (const change of changes) {
    try {
      change.note = await applyChange(drive, deckId, change)
      if (change.note?.startsWith('no Google account')) change.invited = true
    } catch (e) {
      change.note = `FAILED: ${driveErrorMessage(e, 'applying')}`
    }
  }
  return changes
}

/** Applies one change; returns a short note for the log (how it was done). */
async function applyChange(drive: ReturnType<GoogleApis['drive']>, fileId: string, change: PermissionChange): Promise<string | undefined> {
  switch (change.action) {
    case 'grant-writer': {
      const outcome = await grantWriter(drive, fileId, change.email)
      return outcome === 'invited' ? 'no Google account, Drive invitation email sent' : undefined
    }
    case 'upgrade-writer':
      await drive.permissions.update({
        fileId,
        permissionId: change.permissionId,
        supportsAllDrives: true,
        requestBody: { role: 'writer' },
      })
      return
    case 'revoke-writer':
    case 'remove-public':
      await drive.permissions.delete({ fileId, permissionId: change.permissionId, supportsAllDrives: true })
      return
    case 'grant-group-reader':
      await drive.permissions.create({
        fileId,
        supportsAllDrives: true,
        sendNotificationEmail: false,
        requestBody: { type: 'group', role: 'reader', emailAddress: change.email },
      })
      return
  }
}

export async function GetSlides(id: string) {
  if (!token) {
    token = (await GetAccessToken(SCOPES)).token
  }

  const res = await fetch(`https://docs.google.com/presentation/d/${id}/export/pdf?opts=shs%3D0`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const arrayBuffer = await res.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (buffer.length > 3125) {
    return buffer
  } else {
    console.log('Invalid slides', id)
  }
}

export function getSlidesId(url: string): string {
  let id = url
  id = id.replace('https://docs.google.com/presentation/d/', '')
  id = id.replace('/edit?usp=sharing', '')
  id = id.replace('/edit#slide=id.p', '')
  id = id.replace('/edit#slide=id.g13737362dea_0_1', '')
  id = id.replace('/edit?usp=drive_web&ouid=114193972392563644912', '')
  id = id.replace('/edit#slide=id.g14286fcf6b3_0_92', '')
  id = id.replace('/edit#slide=id.p1', '')
  id = id.replace('/edit#slide=id.g1433c566fdb_1_78', '')
  id = id.replace('/edit#slide=id.p1', '')
  id = id.replace('/edit#slide=id.p1', '')
  id = id.replace('/edit', '')

  return id
}
