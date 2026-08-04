import * as store from './store'

beforeAll(() => {
  store.initStore()
})

test('replaceEventSessions preserves enrichment the raw payload lacks', () => {
  const session = store.getAllSessions().find((s: any) => s.eventId === 'devconnect-arg')
  expect(session).toBeDefined()

  store.updateSession(session.id, {
    sources_youtubeId: 'ENRICH_TEST',
    transcript_text: 'hello world',
    duration: 999,
  })

  // Simulate what the Pretalx webhook produces: schedule data only,
  // no enrichment keys at all, but a fresher title.
  const raw = {
    id: session.id,
    sourceId: session.sourceId,
    eventId: session.eventId,
    title: session.title + ' (edited in Pretalx)',
    speakers: [],
    slot_roomId: session.slot_roomId ?? null,
  }

  store.replaceEventSessions(session.eventId, [raw])

  const after = store.getSession(session.id)
  expect(after.sources_youtubeId).toBe('ENRICH_TEST') // preserved
  expect(after.transcript_text).toBe('hello world') // preserved
  expect(after.duration).toBe(999) // preserved
  expect(after.title).toContain('(edited in Pretalx)') // Pretalx still wins for its own fields
})
