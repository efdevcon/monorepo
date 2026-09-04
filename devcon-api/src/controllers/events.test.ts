import request from 'supertest'
import app from '../app'
import * as store from '../data/store'

// Real archived event: 650 sessions, 729 speakers, rooms and a version.
const EVENT = 'devcon-7'

beforeAll(() => {
  store.initStore()
})

async function getBundle(query = '') {
  return request(app).get(`/events/${EVENT}/bundle${query}`)
}

describe('GET /events/:id/bundle', () => {
  test('returns version, event, rooms, speakers and sessions', async () => {
    const res = await getBundle()
    expect(res.statusCode).toBe(200)
    const { data } = res.body
    expect(typeof data.version).toBe('string')
    expect(data.version.length).toBeGreaterThan(0)
    expect(data.event.id).toBe(EVENT)
    expect(Array.isArray(data.event.featuredSpeakers)).toBe(true)
    expect(data.rooms.length).toBeGreaterThan(0)
    expect(data.speakers.length).toBeGreaterThan(0)
    expect(data.sessions.length).toBeGreaterThan(0)
  })

  test('version matches /events/:id/version', async () => {
    const [bundle, version] = await Promise.all([getBundle(), request(app).get(`/events/${EVENT}/version`)])
    expect(bundle.body.data.version).toBe(String(version.body.data))
  })

  test('sessions reference speakers and rooms by id only', async () => {
    const { sessions } = (await getBundle()).body.data
    for (const s of sessions) {
      expect(s).not.toHaveProperty('speakers')
      expect(s).not.toHaveProperty('slot_room')
      expect(s).not.toHaveProperty('transcript_text')
      expect(Array.isArray(s.speakerIds)).toBe(true)
      if ('slot_roomId' in s) expect(typeof s.slot_roomId).toBe('string')
    }
  })

  test('speakerIds match the embedded speakers of the full record', async () => {
    const { sessions } = (await getBundle()).body.data
    const full = new Map(store.getSessions({ event: EVENT, take: 5000 }).items.map((s: any) => [s.id, s]))
    for (const s of sessions) {
      const expected = (full.get(s.id)?.speakers || []).map((sp: any) => sp.id)
      expect(s.speakerIds).toEqual(expected)
    }
  })

  test('every speakerId resolves to a bundled speaker', async () => {
    const { sessions, speakers } = (await getBundle()).body.data
    const ids = new Set(speakers.map((sp: any) => sp.id))
    for (const s of sessions) for (const id of s.speakerIds) expect(ids.has(id)).toBe(true)
  })

  test('speakers carry no hash or sourceId', async () => {
    const { speakers } = (await getBundle()).body.data
    for (const sp of speakers) {
      expect(sp).not.toHaveProperty('hash')
      expect(sp).not.toHaveProperty('sourceId')
      expect(typeof sp.id).toBe('string')
      expect(typeof sp.name).toBe('string')
    }
  })

  test('?fields narrows sessions but always keeps id and speakerIds', async () => {
    const { sessions } = (await getBundle('?fields=title,track')).body.data
    for (const s of sessions) {
      expect(Object.keys(s).sort()).toEqual(['id', 'speakerIds', 'title', 'track'].filter((k) => k in s).sort())
      expect(s.id).toBeDefined()
      expect(s.speakerIds).toBeDefined()
    }
  })

  test('unknown event is a 404', async () => {
    const res = await request(app).get('/events/no-such-event/bundle')
    expect(res.statusCode).toBe(404)
  })

  test('is publicly cacheable for 60 seconds', async () => {
    const res = await getBundle()
    expect(res.headers['cache-control']).toMatch(/public, max-age=60, s-maxage=60/)
  })
})
