import { catalogueDays, filterCatalogue, formatIndex, formatSessionList, sessionLine, type CatalogueSession } from './ai-catalogue'

const IST = 330
const days = catalogueDays('2026-11-03', '2026-11-06')
// 2026-11-04 10:00 IST = 04:30 UTC
const T = Date.UTC(2026, 10, 4, 4, 30)
const sessions: CatalogueSession[] = [
  {
    code: 'VAH3UG',
    title: 'Tokenized asset feeds',
    start: T,
    end: T + 25 * 60_000,
    room: 'Lightning Stage',
    track: 'Users, Builders, and Agents',
    type: 'Lightning Talk',
    expertise: 'Some familiarity with the topic',
    speakers: ['Bianca Buzea'],
    tags: ['DeFi', 'Security'],
    description: 'The most common way a tokenized asset can get mispriced onchain is not an attacker.\r\nIt is a misplaced decimal.',
  },
  {
    code: 'privacy-s03',
    title: 'Why privacy is a public good',
    start: T + 60 * 60_000,
    end: T + 100 * 60_000,
    room: 'Privacy Hub',
    track: 'Community Hubs',
    type: 'Fireside Chat',
    expertise: '',
    speakers: ['Ada Lovelace', 'Alan Turing'],
    tags: ['Privacy Hub', 'Zero knowledge'],
    description: '',
  },
  {
    code: 'DAY1AA',
    title: 'Opening',
    start: Date.UTC(2026, 10, 3, 4, 30),
    end: Date.UTC(2026, 10, 3, 4, 35),
    room: 'Lotus Stage',
    track: 'Core Protocol',
    type: 'Opening',
    expertise: '',
    speakers: [],
    tags: [],
    description: 'x'.repeat(400),
  },
]
const ctx = { eventId: 'devcon8', eventTitle: 'Devcon 8', days, offsetMinutes: IST, apiOrigin: 'https://api.devcon.org', appOrigin: 'https://app.devcon.org' }

test('a session line starts with its code and shows venue time, room, format, track, level, speakers, tags and a summary', () => {
  const line = sessionLine(sessions[0], IST)
  expect(line).toBe(
    '- VAH3UG · 10:00-10:25 · Lightning Stage · Lightning Talk · Users, Builders, and Agents · level: Some familiarity with the topic · "Tokenized asset feeds" · with Bianca Buzea · tags: DeFi, Security · The most common way a tokenized asset can get mispriced onchain is not an attacker. It is a misplaced decimal.',
  )
  expect(sessionLine(sessions[1], IST)).toBe('- privacy-s03 · 11:00-11:40 · Privacy Hub · Fireside Chat · Community Hubs · "Why privacy is a public good" · with Ada Lovelace, Alan Turing · tags: Privacy Hub, Zero knowledge')
})

test('long descriptions are cut to a summary unless full is asked', () => {
  expect(sessionLine(sessions[2], IST)).toMatch(/· x{120,180}…$/)
  expect(sessionLine(sessions[2], IST, true)).toContain('\n  ' + 'x'.repeat(400))
})

test('filters: day by venue date, ids, text query, room', () => {
  expect(filterCatalogue(sessions, { day: 2 }, days, IST).map((s) => s.code)).toEqual(['VAH3UG', 'privacy-s03'])
  expect(filterCatalogue(sessions, { day: 1 }, days, IST).map((s) => s.code)).toEqual(['DAY1AA'])
  expect(filterCatalogue(sessions, { ids: ['vah3ug', 'nope'] }, days, IST).map((s) => s.code)).toEqual(['VAH3UG'])
  expect(filterCatalogue(sessions, { q: 'turing' }, days, IST).map((s) => s.code)).toEqual(['privacy-s03'])
  expect(filterCatalogue(sessions, { room: 'privacy' }, days, IST).map((s) => s.code)).toEqual(['privacy-s03'])
  expect(filterCatalogue(sessions, { track: 'core' }, days, IST).map((s) => s.code)).toEqual(['DAY1AA'])
})

test('the list is grouped by event day and counts its rows', () => {
  const md = formatSessionList(sessions, { day: 2 }, ctx)
  expect(md).toContain('# Devcon 8: sessions, day 2')
  expect(md).toContain('## Day 2, Wed 4 Nov 2026')
  expect(md).not.toContain('Day 1')
  expect(md.trim().endsWith('2 sessions.')).toBe(true)
  expect(formatSessionList(sessions, { q: 'zzz' }, ctx)).toContain('No sessions match.')
})

test('the index links every day, lists the vocabularies and explains the apply link', () => {
  const md = formatIndex(sessions, [{ id: 'privacy', name: 'Privacy Hub' }], ctx)
  expect(md).toContain('- Day 1, Tue 3 Nov 2026 (1 sessions): https://api.devcon.org/events/devcon8/ai/day/1')
  expect(md).toContain('- Day 4, Fri 6 Nov 2026 (0 sessions)')
  expect(md).toContain('(3 sessions, large; use it only if your tool reads long pages in full): https://api.devcon.org/events/devcon8/ai/sessions')
  expect(md).toContain('https://api.devcon.org/events/devcon8/ai/search?ids=CODE1,CODE2&full=1')
  expect(md).toContain('Tracks: Community Hubs; Core Protocol; Users, Builders, and Agents')
  expect(md).toContain('Community Hubs (filter with &room=<hub name>): Privacy Hub')
  expect(md).toContain('https://app.devcon.org/my-interests?add=CODE1,CODE2&remove=CODE3')
  expect(md).toContain('UTC+5:30')
})
