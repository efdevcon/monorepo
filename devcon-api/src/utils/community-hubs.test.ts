import type { DSheet, DSheetCell, DSheetTab } from '@/clients/fileverse'
import {
  dayFromTabName,
  eventDays,
  eventUtcOffsetMinutes,
  hubSessionId,
  parseClock,
  parseDay,
  parseHubSheet,
  parseHubSheets,
  parseSpeakers,
  pickScheduleTabs,
  shouldKeepPreviousRead,
  toUtcMs,
} from './community-hubs'

const DAYS = eventDays('2026-11-03T00:00:00.000Z', '2026-11-06T00:00:00.000Z')

test('event days span start to end inclusive', () => {
  expect(DAYS.map((d) => `${d.number}:${d.day}`)).toEqual(['1:3', '2:4', '3:5', '4:6'])
})

test('parses times as day fractions and as text', () => {
  expect(parseClock(0.375)).toBe(9 * 60)
  expect(parseClock(0.6041666667)).toBe(14 * 60 + 30)
  expect(parseClock('0.375')).toBe(9 * 60)
  expect(parseClock('9:00')).toBe(9 * 60)
  expect(parseClock('09.30')).toBe(9 * 60 + 30)
  expect(parseClock('9h30')).toBe(9 * 60 + 30)
  expect(parseClock('2:30 pm')).toBe(14 * 60 + 30)
  expect(parseClock('12 am')).toBe(0)
  expect(parseClock('1430')).toBe(14 * 60 + 30)
  expect(parseClock(null, '17:00')).toBe(17 * 60)
  expect(parseClock('noon')).toBeNull()
  expect(parseClock('25:00')).toBeNull()
})

test('recognises day labels in their common spellings', () => {
  expect(parseDay('Day 2 · Wednesday 4 November', DAYS)?.number).toBe(2)
  expect(parseDay('day 4', DAYS)?.number).toBe(4)
  expect(parseDay('Wednesday', DAYS)?.number).toBe(2)
  expect(parseDay('5 Nov', DAYS)?.number).toBe(3)
  expect(parseDay('November 6th', DAYS)?.number).toBe(4)
  expect(parseDay('2026-11-03', DAYS)?.number).toBe(1)
  expect(parseDay('Day 9', DAYS)).toBeNull()
  expect(parseDay('Monday', DAYS)).toBeNull()
  expect(parseDay('', DAYS)).toBeNull()
})

test('splits speaker names and drops placeholders', () => {
  expect(parseSpeakers('Ada Lovelace, Alan Turing & Grace Hopper')).toEqual(['Ada Lovelace', 'Alan Turing', 'Grace Hopper'])
  expect(parseSpeakers('Ada Lovelace and Alan Turing')).toEqual(['Ada Lovelace', 'Alan Turing'])
  expect(parseSpeakers('TBA')).toEqual([])
  expect(parseSpeakers('[Speaker Name]')).toEqual([])
  expect(parseSpeakers('')).toEqual([])
})

test('converts Mumbai wall-clock time to UTC', () => {
  // 09:00 IST on 3 Nov 2026 is 03:30Z
  expect(new Date(toUtcMs(DAYS[0], 9 * 60)).toISOString()).toBe('2026-11-03T03:30:00.000Z')
})

test('devcon-7 test files use Bangkok time', () => {
  expect(eventUtcOffsetMinutes('devcon-7')).toBe(420)
  expect(eventUtcOffsetMinutes('devcon8')).toBe(330)
  const dc7 = eventDays('2024-11-12T00:00:00.000Z', '2024-11-15T00:00:00.000Z')
  // 09:00 in Bangkok on 12 Nov 2024 is 02:00Z
  expect(new Date(toUtcMs(dc7[0], 9 * 60, eventUtcOffsetMinutes('devcon-7'))).toISOString()).toBe('2024-11-12T02:00:00.000Z')
})

test('session ids are unique within a hub', () => {
  const taken = new Set<string>()
  const row = (title: string, day: number) => ({ title, day: DAYS[day - 1] } as any)
  expect(hubSessionId('privacy', row('Lunch Break', 1), taken)).toBe('privacy-lunch-break')
  expect(hubSessionId('privacy', row('Lunch Break', 2), taken)).toBe('privacy-lunch-break-day-2')
  expect(hubSessionId('privacy', row('Lunch Break', 2), taken)).toBe('privacy-lunch-break-day-2-2')
})

test('a fresh read is held back only when it has problems and lost sessions', () => {
  expect(shouldKeepPreviousRead(undefined, { rows: 0, problems: 3 })).toBe(false) // nothing served yet
  expect(shouldKeepPreviousRead({ rows: 20 }, { rows: 21, problems: 1 })).toBe(false) // additive edit, one bad row
  expect(shouldKeepPreviousRead({ rows: 20 }, { rows: 18, problems: 0 })).toBe(false) // clean deletion
  expect(shouldKeepPreviousRead({ rows: 20 }, { rows: 12, problems: 8 })).toBe(true) // banner typed over
})

test('v4: one tab per day, day from the tab name, Info and Read me tabs ignored, hub name from Info', () => {
  const header = [
    ['Tuesday 3 November'],
    ['Community Hub programme'],
    [],
    ['Time', '', 'Session title', 'Format', 'Speaker(s)', 'Description (optional)'],
    ['from', 'to'],
  ]
  const day = (name: string, order: number, rows: (string | number | null)[][]): DSheetTab => ({ ...tab([...header, ...rows]), name, order })
  const sheet: DSheet = {
    dsheetId: 'x',
    publishedAt: 0,
    tabs: [
      // Tab order is the "drag today's tab first" order, not day order.
      day('Day 2 · Wed 4 Nov', 0, [['10:00', '10:45', 'AMA with the hub organizers', 'AMA', 'Margaret Hamilton', '']]),
      day('Day 1 · Tue 3 Nov', 1, [
        ['09:00', '10:00', 'Community Coffee & Chatter', 'Networking', '', ''],
        ['11:00', '10:30', 'Ends before it starts', 'Talk', '', ''],
      ]),
      { ...tab([['About the hub'], [], [], ['Hub name', 'Privacy Hub'], ['Description', 'Anything goes here']]), name: 'Info', order: 2 },
      { ...tab([...header, ['09:00', '10:00', 'Example row', 'Talk', '', '']]), name: 'Read me', order: 3 },
    ],
  }
  const parsed = parseHubSheets(sheet, DAYS)
  expect(parsed.hubName).toBe('Privacy Hub')
  expect(parsed.headerFound).toBe(true)
  expect(parsed.sessions.map((s) => [s.title, s.day.number])).toEqual([
    ['Community Coffee & Chatter', 1],
    ['AMA with the hub organizers', 2],
  ])
  expect(parsed.problems).toEqual([expect.stringMatching(/^Day 1 · Tue 3 Nov: row 7 .*before it starts/)])
  expect(pickScheduleTabs(sheet, DAYS).map((t) => t.tab.name)).toEqual(['Day 1 · Tue 3 Nov', 'Day 2 · Wed 4 Nov'])
})

test('day tabs are recognised by weekday and date, Day N, or a full date; other tabs are not', () => {
  expect(dayFromTabName('Tue 3', DAYS)?.number).toBe(1)
  expect(dayFromTabName('Wed 4', DAYS)?.number).toBe(2)
  expect(dayFromTabName('Day 3', DAYS)?.number).toBe(3)
  expect(dayFromTabName('Day 4 · Fri 6 Nov', DAYS)?.number).toBe(4)
  expect(dayFromTabName('Friday', DAYS)?.number).toBe(4)
  expect(dayFromTabName('Info', DAYS)).toBeNull()
  expect(dayFromTabName('Read me', DAYS)).toBeNull()
  expect(dayFromTabName('Mon 2', DAYS)).toBeNull() // not an event day
})

test('v3 sheets still parse through the multi-tab entry point', () => {
  const sheet: DSheet = {
    dsheetId: 'x',
    publishedAt: 0,
    tabs: [
      {
        ...tab([
          ['Time', '', 'Session title', 'Format', 'Speaker(s)'],
          ['from', 'to'],
          ['Day 3 · Thursday 5 November'],
          ['14:00', '15:00', 'Workshop', 'Workshop', 'Grace Hopper'],
        ]),
        name: 'Schedule',
      },
      { ...tab([['Hub name', 'Open Source Hub']]), name: 'Example', order: 1 },
    ],
  }
  const parsed = parseHubSheets(sheet, DAYS)
  expect(parsed.sessions.map((s) => [s.title, s.day.number])).toEqual([['Workshop', 3]])
  expect(parsed.hubName).toBe('Open Source Hub')
  expect(parsed.problems).toEqual([])
})

function tab(rows: (string | number | null)[][]): DSheetTab {
  const cells: DSheetCell[] = []
  rows.forEach((row, r) =>
    row.forEach((value, c) => {
      if (value === null || value === '') return
      cells.push({ row: r, col: c, value, text: typeof value === 'number' ? '' : String(value) })
    })
  )
  return { id: 't', name: 'Schedule', order: 0, cells }
}

test('parses the template: day banners, two-row header, sessions, and reports bad rows', () => {
  const sheet = tab([
    ['Community Hub Programming Schedule'],
    ['Hub name', 'Privacy Hub'],
    ['Fill in the yellow cells'],
    [],
    ['Time', '', 'Session title', 'Format', 'Speaker(s)', 'Description (optional)'],
    ['from', 'to'],
    ['Day 1 · Tuesday 3 November'],
    ['09:00', '10:00', 'Community Coffee & Chatter', 'Networking', '', 'Open doors'],
    ['10:00', '10:30', 'Why privacy is a public good', 'Fireside Chat', 'Ada Lovelace, Alan Turing', ''],
    ['11:00', '10:30', 'Ends before it starts', 'Talk', '', ''],
    [],
    ['Day 2 · Wednesday 4 November'],
    ['later', '11:30', 'Bad time', 'Talk', '', ''],
    ['11:00', '11:30', '', 'Talk', 'Grace Hopper', ''],
    ['14:00', '15:00', 'Second day session', 'Workshop', 'Grace Hopper', ''],
    [],
    ['Day 9 · Someday'],
    ['09:00', '10:00', 'Under an unknown banner', 'Talk', '', ''],
  ])
  const parsed = parseHubSheet(sheet, DAYS)
  expect(parsed.hubName).toBe('Privacy Hub')
  expect(parsed.headerFound).toBe(true)
  expect(parsed.sessions.map((s) => s.title)).toEqual(['Community Coffee & Chatter', 'Why privacy is a public good', 'Second day session'])
  expect(parsed.sessions[0]).toMatchObject({ line: 8, format: 'Networking', description: 'Open doors', speakers: [] })
  expect(new Date(parsed.sessions[0].start).toISOString()).toBe('2026-11-03T03:30:00.000Z')
  expect(new Date(parsed.sessions[0].end).toISOString()).toBe('2026-11-03T04:30:00.000Z')
  expect(parsed.sessions[1].speakers).toEqual(['Ada Lovelace', 'Alan Turing'])
  expect(parsed.sessions[2].day.number).toBe(2)
  expect(parsed.problems).toEqual([
    expect.stringMatching(/row 10 .*before it starts/),
    expect.stringMatching(/row 13 .*not a time/),
    expect.stringMatching(/row 14: no session title/),
    expect.stringMatching(/row 17: day banner "Day 9 · Someday" not recognised/),
    expect.stringMatching(/row 18 .*no day banner above it/),
  ])
})

test('still reads the older layout with a Day column and one header row', () => {
  const parsed = parseHubSheet(
    tab([
      ['Day', 'Start (hh:mm)', 'End (hh:mm)', 'Session title', 'Format', 'Speaker(s)'],
      ['Day 1 (Tue 3 Nov)', 0.375, 0.4166666667, 'Coffee', 'Networking', ''],
      ['Someday', '11:00', '11:30', 'Unknown day', 'Talk', ''],
    ]),
    DAYS
  )
  expect(parsed.sessions.map((s) => [s.title, s.day.number])).toEqual([['Coffee', 1]])
  expect(parsed.problems).toEqual([expect.stringMatching(/row 3 .*day "Someday" not recognised/)])
})

test('a sheet without the template header is reported, not parsed', () => {
  const parsed = parseHubSheet(
    tab([
      ['Time', 'Day 1', 'Day 2'],
      ['9:00 – 10:00', 'Coffee', 'Coffee'],
    ]),
    DAYS
  )
  expect(parsed.headerFound).toBe(false)
  expect(parsed.sessions).toEqual([])
  expect(parsed.problems[0]).toMatch(/no header row/)
})
