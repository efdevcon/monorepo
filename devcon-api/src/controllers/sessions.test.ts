import request from 'supertest'
import app from '../app'
import * as store from '../data/store'

// API_KEYS=test-key is set on the jest command line (see Global Constraints).
const API_KEY = 'test-key'

// A real non-devcon-7 session, picked at runtime so the test doesn't
// hardcode ids that a future sync could delete.
let session: any

// CommitSession must not hit the GitHub API from tests.
jest.mock('../services/github', () => ({
  CommitSession: jest.fn().mockResolvedValue(undefined),
  TriggerWorkflow: jest.fn().mockResolvedValue(true),
  CommitContentFile: jest.fn().mockResolvedValue(undefined),
}))

beforeAll(() => {
  store.initStore()
  session = store.getAllSessions().find((s: any) => s.eventId === 'devconnect-arg')
  expect(session).toBeDefined()
})

function putSources(id: string, body: Record<string, unknown>) {
  return request(app).put(`/sessions/sources/${id}?apiKey=${API_KEY}`).send(body)
}

describe('PUT /sessions/sources/:id', () => {
  test('bumps the version of the session own event, not devcon-7', async () => {
    const before = { ...getVersions() }

    const res = await putSources(session.id, { sources_youtubeId: 'VERSIONTEST' })
    expect(res.statusCode).toBe(204)

    const after = getVersions()
    expect(after['devconnect-arg']).not.toBe(before['devconnect-arg'])
    expect(after['devcon-7']).toBe(before['devcon-7'])
  })

  test('omitted fields are preserved (patch semantics)', async () => {
    await putSources(session.id, {
      sources_youtubeId: 'YT_KEEP',
      sources_swarmHash: 'SWARM_KEEP',
      duration: 1234,
    })

    const res = await putSources(session.id, { sources_youtubeId: 'YT_NEW' })
    expect(res.statusCode).toBe(204)

    const updated = store.getSession(session.id)
    expect(updated.sources_youtubeId).toBe('YT_NEW')
    expect(updated.sources_swarmHash).toBe('SWARM_KEEP')
    expect(updated.duration).toBe(1234)
  })

  test('explicit empty string still clears a field', async () => {
    await putSources(session.id, { sources_swarmHash: 'TO_CLEAR' })
    await putSources(session.id, { sources_swarmHash: '' })
    expect(store.getSession(session.id).sources_swarmHash).toBe('')
  })
})

describe('API key auth', () => {
  test('accepts the key via x-api-key header', async () => {
    const res = await request(app)
      .put(`/sessions/sources/${session.id}`)
      .set('x-api-key', 'test-key')
      .send({ sources_youtubeId: 'HEADER_AUTH' })
    expect(res.statusCode).toBe(204)
  })

  test('still rejects a missing key', async () => {
    const res = await request(app)
      .put(`/sessions/sources/${session.id}`)
      .send({ sources_youtubeId: 'NO_AUTH' })
    expect(res.statusCode).toBe(401)
  })
})

function getVersions(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const e of store.getEvents()) out[e.id] = e.version
  return out
}

describe('PUT /sessions/:id', () => {
  test('bumps the event version', async () => {
    const before = getVersions()[session.eventId]

    const res = await request(app)
      .put(`/sessions/${session.id}?apiKey=${API_KEY}`)
      .send({ id: session.id, title: session.title })
    expect(res.statusCode).toBe(204)

    expect(getVersions()[session.eventId]).not.toBe(before)
  })
})
