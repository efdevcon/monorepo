import request from 'supertest'
import app from '../app'
import * as store from '../data/store'
import { GetSessions } from '../clients/pretalx'

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
