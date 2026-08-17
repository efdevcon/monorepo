import request from 'supertest'
import app from '../app'
import * as store from '../data/store'
import { GetSessions, clearPretalxCache, getPublishedScheduleVersion } from '../clients/pretalx'

// WEBHOOK_SECRET=test-secret is set on the jest command line.

jest.mock('../services/github', () => ({
  CommitSession: jest.fn().mockResolvedValue(undefined),
  TriggerWorkflow: jest.fn().mockResolvedValue(true),
  CommitContentFile: jest.fn().mockResolvedValue(undefined),
}))

// No network in tests: if the handler wrongly proceeds into a sync, the
// mocked client records the call instead of hitting cfp.devcon.org.
jest.mock('../clients/pretalx', () => ({
  GetSessions: jest.fn().mockResolvedValue([]),
  GetSpeaker: jest.fn().mockResolvedValue(null),
  clearPretalxCache: jest.fn(),
  // Matches the webhook payloads used below so the release-race guard
  // proceeds without retry sleeps in tests.
  getPublishedScheduleVersion: jest.fn().mockImplementation(async () => 'v2'),
}))

beforeAll(() => {
  store.initStore()
})

const payload = {
  event: 'some-unknown-event',
  user: 'tester',
  schedule: 'v1',
  changes: { new_talks: [], canceled_talks: [], moved_talks: [] },
}

describe('POST /hooks/pretalx/schedule', () => {
  test('rejects a missing/wrong secret', async () => {
    const res = await request(app).post('/hooks/pretalx/schedule').send(payload)
    expect(res.statusCode).toBe(403)
  })

  test('rejects an unknown event slug instead of syncing devcon-7', async () => {
    const res = await request(app)
      .post('/hooks/pretalx/schedule')
      .set('X-Webhook-Secret', 'test-secret')
      .send(payload)

    expect(res.statusCode).toBe(400)
    // The old fallback would have resynced devcon-7 here.
    expect(GetSessions).not.toHaveBeenCalled()
  })
})


describe('SyncPretalx staleness guards', () => {
  const syncPayload = {
    event: 'test-devcon-8',
    user: 'tester',
    schedule: 'v2',
    changes: { new_talks: [], canceled_talks: [], moved_talks: [] },
  }

  test('invalidates the Pretalx response cache before fetching', async () => {
    // Without this, a long-lived process re-serves the pre-publish cached
    // response and every re-publish is a silent no-op (2026-08-15 bug).
    const res = await request(app)
      .post('/hooks/pretalx/schedule')
      .set('X-Webhook-Secret', 'test-secret')
      .send(syncPayload)
    expect(res.statusCode).toBe(204)
    expect(clearPretalxCache).toHaveBeenCalledWith('test-devcon-8')
    expect(GetSessions).toHaveBeenCalled()
    // Ordering: cache cleared before the fetch that would repopulate it.
    const clearOrder = (clearPretalxCache as jest.Mock).mock.invocationCallOrder[0]
    const fetchOrder = (GetSessions as jest.Mock).mock.invocationCallOrder[0]
    expect(clearOrder).toBeLessThan(fetchOrder)
  })

  test('does not bump the event version when synced data is unchanged', async () => {
    // First sync in the process snapshots the data and bumps.
    await request(app).post('/hooks/pretalx/schedule').set('X-Webhook-Secret', 'test-secret').send(syncPayload)
    const versionAfterFirst = store.getEvent('test-devcon-8')?.version
    // Identical data on re-publish: version must NOT move (a bump without a
    // diff masks sync failures — it is what hid the stale-cache bug).
    await request(app).post('/hooks/pretalx/schedule').set('X-Webhook-Secret', 'test-secret').send(syncPayload)
    expect(store.getEvent('test-devcon-8')?.version).toBe(versionAfterFirst)
  })
})


describe('release-race guard', () => {
  test('checks the published schedule version against the webhook payload before fetching', async () => {
    ;(getPublishedScheduleVersion as jest.Mock).mockClear()
    ;(GetSessions as jest.Mock).mockClear()
    const res = await request(app)
      .post('/hooks/pretalx/schedule')
      .set('X-Webhook-Secret', 'test-secret')
      .send({ event: 'test-devcon-8', user: 'tester', schedule: 'v2', changes: { new_talks: [], canceled_talks: [], moved_talks: [] } })
    expect(res.statusCode).toBe(204)
    expect(getPublishedScheduleVersion).toHaveBeenCalled()
    // Guard must run BEFORE the session fetch.
    const guardOrder = (getPublishedScheduleVersion as jest.Mock).mock.invocationCallOrder[0]
    const fetchOrder = (GetSessions as jest.Mock).mock.invocationCallOrder.at(-1)!
    expect(guardOrder).toBeLessThan(fetchOrder)
  })

  test('unknown published version (null) proceeds without blocking', async () => {
    ;(getPublishedScheduleVersion as jest.Mock).mockResolvedValueOnce(null)
    ;(GetSessions as jest.Mock).mockClear()
    const res = await request(app)
      .post('/hooks/pretalx/schedule')
      .set('X-Webhook-Secret', 'test-secret')
      .send({ event: 'test-devcon-8', user: 'tester', schedule: 'v3', changes: { new_talks: [], canceled_talks: [], moved_talks: [] } })
    expect(res.statusCode).toBe(204)
    expect(GetSessions).toHaveBeenCalled()
  })
})
