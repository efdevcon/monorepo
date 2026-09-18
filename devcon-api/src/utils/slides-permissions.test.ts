import { deckIdFromUrl, planDeckPermissions, type DeckPermission } from './slides-permissions'

const user = (id: string, email: string, role = 'writer', inherited = false): DeckPermission => ({
  id,
  type: 'user',
  role,
  emailAddress: email,
  inherited,
})

describe('planDeckPermissions', () => {
  test('grants writer to a speaker who has no access yet', () => {
    expect(planDeckPermissions({ existing: [], speakers: ['a@example.org'] })).toEqual([{ action: 'grant-writer', email: 'a@example.org' }])
  })

  test('is case-insensitive on emails and leaves an existing writer alone', () => {
    const existing = [user('p1', 'Speaker@Example.org')]
    expect(planDeckPermissions({ existing, speakers: ['speaker@example.org'] })).toEqual([])
  })

  test('revokes the writer grant of a speaker removed from the talk', () => {
    const existing = [user('p1', 'old@example.org'), user('p2', 'new@example.org')]
    expect(planDeckPermissions({ existing, speakers: ['new@example.org'] })).toEqual([
      { action: 'revoke-writer', permissionId: 'p1', email: 'old@example.org' },
    ])
  })

  test('never touches inherited access, kept emails, non-writer roles or service accounts', () => {
    const existing = [
      user('p1', 'member@example.org', 'writer', true),
      user('p2', 'organizer@example.org'),
      user('p3', 'viewer@example.org', 'reader'),
      user('p4', 'bot@project.iam.gserviceaccount.com'),
      { id: 'p5', type: 'user', role: 'owner', emailAddress: 'owner@example.org' },
    ]
    expect(planDeckPermissions({ existing, speakers: [], keep: ['Organizer@example.org'] })).toEqual([])
  })

  test('asks nothing for a speaker who already edits through the shared drive', () => {
    const existing = [user('p1', 'organiser@example.org', 'fileOrganizer', true)]
    expect(planDeckPermissions({ existing, speakers: ['organiser@example.org'] })).toEqual([])
  })

  test('upgrades a speaker who only has read access', () => {
    const existing = [user('p1', 'a@example.org', 'commenter')]
    expect(planDeckPermissions({ existing, speakers: ['a@example.org'] })).toEqual([
      { action: 'upgrade-writer', permissionId: 'p1', email: 'a@example.org', from: 'commenter' },
    ])
  })

  test('adds the AV group as reader once and never revokes it', () => {
    const none = planDeckPermissions({ existing: [], speakers: [], avGroup: 'av@example.org' })
    expect(none).toEqual([{ action: 'grant-group-reader', email: 'av@example.org' }])
    const present = [{ id: 'g1', type: 'group', role: 'writer', emailAddress: 'av@example.org' }]
    expect(planDeckPermissions({ existing: present, speakers: [], avGroup: 'av@example.org' })).toEqual([])
  })

  test('removes public link access unless explicitly allowed', () => {
    const existing = [{ id: 'x', type: 'anyone', role: 'reader' }]
    expect(planDeckPermissions({ existing, speakers: [] })).toEqual([{ action: 'remove-public', permissionId: 'x', role: 'reader' }])
    expect(planDeckPermissions({ existing, speakers: [], allowPublic: true })).toEqual([])
  })
})

describe('deckIdFromUrl', () => {
  test('extracts the id from a stored presentation URL', () => {
    expect(deckIdFromUrl('https://docs.google.com/presentation/d/abc_DEF-123')).toBe('abc_DEF-123')
    expect(deckIdFromUrl('https://docs.google.com/presentation/d/abc123/edit')).toBe('abc123')
    expect(deckIdFromUrl('')).toBeNull()
    expect(deckIdFromUrl(undefined)).toBeNull()
  })
})
