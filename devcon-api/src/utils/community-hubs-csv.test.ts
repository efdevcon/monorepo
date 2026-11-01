import { csvToHubTab, parseCsv } from './community-hubs-csv'
import { eventDays, parseHubSheets } from './community-hubs'

const DAYS = eventDays('2026-11-03T00:00:00.000Z', '2026-11-06T00:00:00.000Z')

test('parses quoted fields with embedded commas, quotes and newlines', () => {
  expect(parseCsv('a,b\n"x, y","say ""hi""\nthere"\n')).toEqual([
    ['a', 'b'],
    ['x, y', 'say "hi"\nthere'],
  ])
  expect(parseCsv('﻿a,b\r\n1,2\r\n\r\n')).toEqual([
    ['a', 'b'],
    ['1', '2'],
  ])
})

const CSV = `Title,Description,Date,Start,End,Format,Location,Track,Tags,Speakers,Luma link
Base Workshop: B20,"A walkthrough of B20, Base's token standard.","Tue, Nov 3",11:30,12:30,Workshop,"Room 202, Level 2",USERS,,Youssef (Base DevRel),https://luma.com/abc
`

test('turns a programme CSV into a schedule tab the sheet parser reads', () => {
  const tab = csvToHubTab('Base Booth', CSV)
  expect(tab.cells[0]).toEqual({ row: 0, col: 0, value: 'Base Booth', text: 'Base Booth' })
  const parsed = parseHubSheets({ dsheetId: 'base-booth', tabs: [tab], publishedAt: 0 }, DAYS)
  expect(parsed.problems).toEqual([])
  expect(parsed.sessions).toHaveLength(1)
  const [s] = parsed.sessions
  expect(s.title).toBe('Base Workshop: B20')
  expect(s.day.number).toBe(1)
  expect(s.start).toBe(Date.UTC(2026, 10, 3, 6, 0)) // 11:30 in Mumbai
  expect(s.end).toBe(Date.UTC(2026, 10, 3, 7, 0))
  expect(s.format).toBe('Workshop')
  expect(s.speakers).toEqual(['Youssef'])
  expect(s.topic).toBe('')
  expect(s.key).toBe('')
  expect(s.description).toBe("A walkthrough of B20, Base's token standard.\n\nWhere: Room 202, Level 2\n\nRegister: https://luma.com/abc")
})

test('keeps an ID column as the session key and Tags as the topic', () => {
  const tab = csvToHubTab('X', 'ID,Title,Day,From,To,Tags\nB01,Hello,Wed 4 Nov,10:00,11:00,Agents\n\n,,,,,\n')
  const parsed = parseHubSheets({ dsheetId: 'x', tabs: [tab], publishedAt: 0 }, DAYS)
  expect(parsed.problems).toEqual([])
  expect(parsed.sessions).toHaveLength(1)
  expect(parsed.sessions[0].key).toBe('B01')
  expect(parsed.sessions[0].topic).toBe('Agents')
})

test('a Location or link column without a Description column still lands in the description', () => {
  const tab = csvToHubTab('X', 'Title,Day,From,To,Location,URL\nHello,Wed 4 Nov,10:00,11:00,Room 202,https://example.org/x\n')
  const parsed = parseHubSheets({ dsheetId: 'x', tabs: [tab], publishedAt: 0 }, DAYS)
  expect(parsed.problems).toEqual([])
  expect(parsed.sessions[0].description).toBe('Where: Room 202\n\nRegister: https://example.org/x')
})

test('refuses a CSV without the columns a schedule needs', () => {
  expect(() => csvToHubTab('X', 'Title,Speakers\nHello,Ada\n')).toThrow(/Day.*From.*To|no .*column/)
  expect(() => csvToHubTab('X', '')).toThrow(/empty/)
})
