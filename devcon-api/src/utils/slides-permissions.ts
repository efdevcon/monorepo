/**
 * Decides what a talk's Google Slides deck should look like permission-wise
 * and what has to change to get there. Pure: Drive I/O lives in
 * clients/slides.ts, so this is unit-testable and the sync can print a
 * dry-run plan before touching anything. Policy (docs/av §11.9):
 *   - current speakers hold writer access; a speaker removed from the talk
 *     in Pretalx loses the writer grant the pipeline gave them
 *   - the AV team group (if configured) holds reader access from creation
 *   - no "anyone with the link" access unless explicitly allowed, which only
 *     happens once the event is over
 * Only direct grants on the deck are ever touched; access inherited from the
 * shared drive or its folders is left alone, as are non-writer roles other
 * than upgrading a speaker who somehow only has read access.
 */

export interface DeckPermission {
  id: string
  type: string
  role: string
  emailAddress?: string | null
  /** True when the grant comes from the folder/shared drive, not the deck. */
  inherited?: boolean
}

export type PermissionChange =
  | { action: 'grant-writer'; email: string }
  | { action: 'upgrade-writer'; permissionId: string; email: string; from: string }
  | { action: 'revoke-writer'; permissionId: string; email: string }
  | { action: 'grant-group-reader'; email: string }
  | { action: 'remove-public'; permissionId: string; role: string }

export interface PlanInput {
  existing: DeckPermission[]
  /** Current speaker emails from Pretalx. */
  speakers: string[]
  /** Google Group of the AV team, reader from creation. */
  avGroup?: string | null
  /** Direct writer grants that must never be revoked (organizers, tooling). */
  keep?: string[]
  /** Leave "anyone with the link" grants in place (post-event publishing). */
  allowPublic?: boolean
}

const norm = (e: string | null | undefined) => (e ?? '').trim().toLowerCase()
const EDIT_ROLES = new Set(['writer', 'fileOrganizer', 'organizer', 'owner'])

export function planDeckPermissions(input: PlanInput): PermissionChange[] {
  const changes: PermissionChange[] = []
  const speakers = new Set(input.speakers.map(norm).filter(Boolean))
  const keep = new Set((input.keep ?? []).map(norm).filter(Boolean))
  const avGroup = norm(input.avGroup)
  const direct = input.existing.filter((p) => !p.inherited)
  const directUsers = direct.filter((p) => p.type === 'user')

  for (const email of speakers) {
    // A speaker who can already edit through the shared drive or the folder
    // (an organiser giving a talk) needs nothing: Drive would not store a
    // redundant direct grant, and the pass would ask again on every run.
    const canEditAlready = input.existing.some((p) => p.type === 'user' && norm(p.emailAddress) === email && EDIT_ROLES.has(p.role))
    if (canEditAlready) continue
    const current = directUsers.find((p) => norm(p.emailAddress) === email)
    if (!current) changes.push({ action: 'grant-writer', email })
    else changes.push({ action: 'upgrade-writer', permissionId: current.id, email, from: current.role })
  }

  for (const p of directUsers) {
    const email = norm(p.emailAddress)
    if (p.role !== 'writer' || !email) continue
    if (speakers.has(email) || keep.has(email) || email === avGroup) continue
    // Never touch machine identities: the pipeline's own account, or another
    // integration someone granted on purpose.
    if (email.endsWith('.gserviceaccount.com')) continue
    changes.push({ action: 'revoke-writer', permissionId: p.id, email })
  }

  if (avGroup && !direct.some((p) => p.type === 'group' && norm(p.emailAddress) === avGroup)) {
    changes.push({ action: 'grant-group-reader', email: avGroup })
  }

  if (!input.allowPublic) {
    for (const p of direct) {
      if (p.type === 'anyone') changes.push({ action: 'remove-public', permissionId: p.id, role: p.role })
    }
  }

  return changes
}

/** Deck id from a stored `resources_presentation` URL, or null. */
export function deckIdFromUrl(url: string | null | undefined): string | null {
  const m = (url ?? '').match(/\/presentation\/d\/([A-Za-z0-9_-]+)/)
  return m ? m[1] : null
}
