import {
  LAYOUT_V1,
  LAYOUT_V2,
  LAYOUT_V3,
  RosLayout,
  RosSession,
  ExistingRow,
  FOOTER,
  REMOVED_HEADER,
  EVENT_TIMEZONES,
  buildIndex,
  detectLayout,
  detectLayoutInRows,
  endTimeFormula,
  formulas,
  hyperlinkTarget,
  numberFormula,
  padRow,
  parseClock,
  parseExistingRows,
  planFile,
  slidesCell,
  linkCell,
  blockFor,
  qaMinutesFor,
} from './run-of-show'

// Synthetic fixtures only: made-up codes, titles and times.
const V1 = LAYOUT_V1.col as Required<RosLayout['col']>
const V2 = LAYOUT_V2.col as Required<RosLayout['col']>
const V3 = LAYOUT_V3.col as Required<RosLayout['col']>

function session(over: Partial<RosSession>): RosSession {
  return {
    code: 'AAA111',
    title: 'Example talk',
    type: 'Talk',
    speakers: 'Ada Example',
    start: '10:00',
    end: '10:30',
    durationMin: 30,
    day: '2030-01-01',
    roomId: 'stage-a',
    roomName: 'Stage A',
    ...over,
  }
}

const A = { fileKey: '2030-01-01/stage-a', label: 'Stage A · Day 1' }
const B = { fileKey: '2030-01-01/stage-b', label: 'Stage B · Day 1' }

function existing(code: string, fileKey: string, over: Partial<Record<keyof typeof V1, string>> = {}, layout = LAYOUT_V1): ExistingRow {
  const col = layout.col as Required<RosLayout['col']>
  const values = new Array(layout.headers.length).fill('')
  values[col.num] = '1'
  values[col.status] = 'CONFIRMED'
  values[col.start] = '10:00'
  values[col.dur] = '30'
  values[col.end] = '10:30'
  values[col.segment] = 'Example talk'
  values[col.format] = 'Talk'
  values[col.speakers] = 'Ada Example'
  if (col.stage !== undefined) values[col.stage] = 'Stage A'
  values[col.mic] = '1x lapel'
  values[col.onSite] = layout.emptyCheckbox
  values[col.cueRef] = 'AV-042'
  if (col.internal !== undefined) values[col.internal] = 'green room 09:30'
  if (col.notes !== undefined) values[col.notes] = 'green room 09:30'
  values[col.id] = code
  for (const [k, v] of Object.entries(over)) values[col[k as keyof typeof col]] = v
  return { code, values, status: values[col.status], fileKey, fileLabel: fileKey === A.fileKey ? A.label : B.label }
}

function plan(sessions: RosSession[], allRows: ExistingRow[], file = A, layout = LAYOUT_V1, extra: Partial<Parameters<typeof planFile>[0]> = {}) {
  const locationOf = new Map(sessions.map((s) => [s.code, file]))
  return planFile({
    layout,
    ...file,
    sessions,
    existingRows: allRows.filter((r) => r.fileKey === file.fileKey),
    index: buildIndex(allRows),
    locationOf,
    firstSheetRow: 6,
    ...extra,
  })
}
const notes = (row: { values: (string | number)[] }, layout = LAYOUT_V1) => row.values[(layout.col.internal ?? layout.col.notes)!]

test('first run: every session is ADDED, carried columns start empty with an unticked box', () => {
  const p = plan([session({})], [])
  const rows = p.rows
  expect(rows[0]).toMatchObject({ kind: 'divider', values: ['— MORNING SESSION —'] })
  expect(rows[1].kind).toBe('session')
  expect(rows[1].values[V1.num]).toBe(numberFormula(6, 7))
  expect(rows[1].values[V1.status]).toBe('CONFIRMED')
  expect(rows[1].values[V1.end]).toBe(endTimeFormula(7))
  expect(rows[1].values[V1.onSite]).toBe('☐')
  expect(rows[1].values[V1.id]).toBe('AAA111')
  expect(rows[rows.length - 1].values[0]).toBe(FOOTER)
  expect(p.changes).toEqual([{ code: 'AAA111', title: 'Example talk', field: 'ADDED', from: '', to: 'Stage A · Day 1' }])
  expect(p.stats.added).toBe(1)
  expect(rows[1].changed.length).toBeGreaterThan(0)
  // a brand-new sheet highlights nothing: every row would be yellow
  const fresh = plan([session({})], [], A, LAYOUT_V1, { initial: true })
  expect(fresh.rows[1].changed).toEqual([])
  expect(fresh.changes).toHaveLength(1)
})

test('unchanged session keeps AV columns and reports nothing', () => {
  const p = plan([session({})], [existing('AAA111', A.fileKey)])
  const row = p.rows.find((r) => r.kind === 'session')!
  expect(row.values[V1.mic]).toBe('1x lapel')
  expect(row.values[V1.cueRef]).toBe('AV-042')
  expect(notes(row)).toBe('green room 09:30')
  expect(row.changed).toEqual([])
  expect(p.changes).toEqual([])
  expect(p.stats.unchanged).toBe(1)
})

test('time change is logged and highlighted, notes stay attached', () => {
  const p = plan([session({ start: '11:00', end: '11:30' })], [existing('AAA111', A.fileKey)])
  const row = p.rows.find((r) => r.kind === 'session')!
  expect(row.changed.sort()).toEqual([V1.start, V1.end].sort())
  expect(p.changes.map((c) => c.field)).toEqual(['START TIME', 'END TIME'])
  expect(notes(row)).toBe('green room 09:30')
})

test('hand-set TBC survives a resync, CANCELLED does not', () => {
  const tbc = plan([session({})], [existing('AAA111', A.fileKey, { status: 'TBC' })])
  expect(tbc.rows.find((r) => r.kind === 'session')!.values[V1.status]).toBe('TBC')
  const back = plan([session({})], [existing('AAA111', A.fileKey, { status: 'CANCELLED' })])
  expect(back.rows.find((r) => r.kind === 'session')!.values[V1.status]).toBe('CONFIRMED')
  expect(back.changes[0]).toMatchObject({ field: 'STATUS', from: 'CANCELLED', to: 'CONFIRMED' })
})

test('moderator and slides are carried when the sync has no value of its own', () => {
  const rows = [existing('AAA111', A.fileKey, { moderator: 'Moe Host', slides: 'deck.pptx' })]
  const kept = plan([session({})], rows).rows.find((r) => r.kind === 'session')!
  expect(kept.values[V1.moderator]).toBe('Moe Host')
  expect(kept.values[V1.slides]).toBe('deck.pptx')
  const known = plan([session({ slides: 'https://docs.google.com/presentation/d/x' })], rows).rows.find((r) => r.kind === 'session')!
  expect(known.values[V1.slides]).toBe('=HYPERLINK("https://docs.google.com/presentation/d/x","Slides")')
  // the deck link is compared as a URL, so an unchanged link is not reported
  const same = plan(
    [session({ slides: 'https://docs.google.com/presentation/d/x' })],
    [existing('AAA111', A.fileKey, { slides: 'https://docs.google.com/presentation/d/x' })]
  )
  expect(same.changes).toEqual([])
  expect(hyperlinkTarget('=HYPERLINK("https://x.y/z","Slides")')).toBe('https://x.y/z')
  expect(hyperlinkTarget('deck.pptx')).toBe('deck.pptx')
  expect(slidesCell('')).toBe('')
})

test('session moved to another stage: arrives with its notes, old sheet parks it as CANCELLED', () => {
  const all = [existing('AAA111', A.fileKey)]
  const moved = session({ roomId: 'stage-b', roomName: 'Stage B' })
  const locationOf = new Map([['AAA111', B]])

  const onB = planFile({ layout: LAYOUT_V1, ...B, sessions: [moved], existingRows: [], index: buildIndex(all), locationOf, firstSheetRow: 6 })
  const rowB = onB.rows.find((r) => r.kind === 'session')!
  expect(notes(rowB)).toBe('green room 09:30')
  expect(rowB.values[V1.stage]).toBe('Stage B')
  expect(rowB.changed).toContain(V1.stage)
  expect(onB.changes[0]).toMatchObject({ field: 'MOVED IN', from: 'Stage A · Day 1', to: 'Stage B · Day 1' })
  expect(onB.stats.movedIn).toBe(1)
  expect(onB.stats.changed).toBe(0)

  const onA = planFile({ layout: LAYOUT_V1, ...A, sessions: [], existingRows: all, index: buildIndex(all), locationOf, firstSheetRow: 6 })
  expect(onA.rows[0].values[0]).toBe(REMOVED_HEADER)
  const parked = onA.rows[1]
  expect(parked.kind).toBe('removed')
  expect(parked.values[V1.status]).toBe('CANCELLED')
  expect(parked.values[V1.num]).toBe('')
  expect(notes(parked)).toBe('green room 09:30')
  expect(onA.changes[0]).toMatchObject({ field: 'MOVED OUT', from: 'Stage A · Day 1', to: 'Stage B · Day 1' })
  expect(onA.stats.movedOut).toBe(1)
})

test('session dropped from the schedule is parked once, later runs stay quiet', () => {
  const first = plan([], [existing('AAA111', A.fileKey)])
  expect(first.changes[0]).toMatchObject({ field: 'REMOVED', to: 'not in schedule' })
  expect(first.rows[1].changed).toEqual([V1.status])
  const again = plan([], [existing('AAA111', A.fileKey, { status: 'CANCELLED' })])
  expect(again.changes).toEqual([])
  expect(again.rows[1].changed).toEqual([])
  expect(again.stats.removed).toBe(0)
})

test('index prefers the live row over a parked copy of the same code', () => {
  const parked = existing('AAA111', A.fileKey, { status: 'CANCELLED', internal: 'stale' })
  const live = existing('AAA111', B.fileKey, { internal: 'fresh' })
  expect(notes(buildIndex([parked, live]).get('AAA111')!)).toBe('fresh')
  expect(notes(buildIndex([live, parked]).get('AAA111')!)).toBe('fresh')
})

test('dividers follow the conference clock and numbering restarts per sheet', () => {
  expect(['09:00', '12:00', '12:59', '13:00', '17:59', '18:00'].map(blockFor)).toEqual([
    'MORNING',
    'MORNING',
    'MORNING',
    'AFTERNOON',
    'AFTERNOON',
    'EVENING',
  ])
  const p = plan(
    [
      session({ code: 'A1', start: '09:00', end: '09:30' }),
      session({ code: 'A2', start: '12:00', end: '12:10', durationMin: 10 }),
      session({ code: 'A3', start: '13:10', end: '13:40' }),
      session({ code: 'A4', start: '19:00', end: '19:30' }),
    ],
    []
  )
  expect(p.rows.filter((r) => r.kind === 'divider').map((r) => r.values[0])).toEqual([
    '— MORNING SESSION —',
    '— AFTERNOON SESSION —',
    '— EVENING SESSION —',
  ])
  // # is a running COUNTA over the title column so hand-inserted rows renumber themselves
  expect(p.rows.filter((r) => r.kind === 'session').map((r) => r.values[V1.num])).toEqual([
    numberFormula(6, 7),
    numberFormula(6, 8),
    numberFormula(6, 10),
    numberFormula(6, 12),
  ])
  expect(p.rows[1].values[V1.end]).toBe(endTimeFormula(7))
})

test('hand-added rows without an id are kept and slotted by start time', () => {
  const doors = new Array(18).fill('')
  doors[V1.status] = 'CONFIRMED'
  doors[V1.start] = '09:30'
  doors[V1.dur] = '15'
  doors[V1.end] = '09:45'
  doors[V1.segment] = 'Doors open'
  doors[V1.format] = 'Break'
  doors[V1.internal] = 'house music'
  const rows = parseExistingRows([doors, ['— MORNING SESSION —']], LAYOUT_V1, A.fileKey)
  expect(rows).toEqual([{ code: '', values: doors, status: 'CONFIRMED', fileKey: A.fileKey, fileLabel: undefined, manual: true }])
  expect(buildIndex(rows).size).toBe(0)

  const p = plan([session({ code: 'A1', start: '09:00', end: '09:30' }), session({ code: 'A2', start: '10:00', end: '10:30' })], rows)
  expect(p.rows.map((r) => r.kind)).toEqual(['divider', 'session', 'manual', 'session', 'footer'])
  const manual = p.rows[2]
  expect(manual.values[V1.segment]).toBe('Doors open')
  expect(notes(manual)).toBe('house music')
  expect(manual.values[V1.num]).toBe(numberFormula(6, 8))
  expect(manual.values[V1.end]).toBe(endTimeFormula(8))
  expect(p.changes.map((c) => c.code)).toEqual(['A1', 'A2'])
  expect(p.stats.removed).toBe(0)
})

test('a hand-added row without a time lands after the timed rows', () => {
  const note = new Array(18).fill('')
  note[V1.segment] = 'Strike stage'
  const p = plan([session({ start: '09:00', end: '09:30' })], parseExistingRows([note], LAYOUT_V1, A.fileKey))
  expect(p.rows.map((r) => r.kind)).toEqual(['divider', 'session', 'manual', 'footer'])
  expect(p.rows[2].values[V1.end]).toBe('')
  expect(parseClock('9:05')).toBe(545)
  expect(parseClock('tbc')).toBeNull()
})

test('parseExistingRows skips structure rows and pads short rows', () => {
  const rows = parseExistingRows(
    [
      ['— MORNING SESSION —'],
      ['1', 'CONFIRMED', '10:00', '30', '10:30', 'T', 'Talk', 'S', '', 'Stage A', '', '', '', '', '', '', '', 'ZZZ999'],
      ['⚑ END'],
    ],
    LAYOUT_V1,
    A.fileKey
  )
  expect(rows).toHaveLength(1)
  expect(rows[0].code).toBe('ZZZ999')
  expect(padRow(['a'], 18)).toHaveLength(18)
})

test('layouts are recognised from the template header row', () => {
  expect(
    detectLayout([
      '#',
      'STATUS',
      '\nSTART TIME',
      'DUR\n(mins)',
      'END\nTIME',
      'SESSION SEGMENT',
      'FORMAT',
      ' SPEAKER NAME',
      'MODERATOR ',
      'LOCATION /\nSTAGE',
      'SLIDES / MEDIA',
      'MIC CONFIG',
      'SPEAKER\nARRIVED?',
      'AV CUE\nREF',
      'INTERNAL NOTES',
      'PUBLIC NOTES',
      'LAST\nEDITED BY',
    ])
  ).toBe(LAYOUT_V1)
  expect(detectLayout(LAYOUT_V2.headers.map((h) => h.replace(' ', '\n')))).toBe(LAYOUT_V2)
  // a generated v1 sheet has the key column the sync appended
  expect(detectLayout([...LAYOUT_V1.headers])).toBe(LAYOUT_V1)
  expect(detectLayout(['#', 'STATUS', 'SOMETHING ELSE'])).toBeNull()
})

test('v2 layout: track and recording are synced, checkboxes default to FALSE, formulas target the right columns', () => {
  const s = session({ track: 'Core', record: false, slides: 'https://docs.google.com/presentation/d/x' })
  const p = plan([s], [], A, LAYOUT_V2, { cuesGid: 42 })
  const row = p.rows.find((r) => r.kind === 'session')!
  expect(row.values[V2.track]).toBe('Core')
  expect(row.values[V2.rec]).toBe('NO REC')
  expect(row.values[V2.deckOk]).toBe('FALSE')
  expect(row.values[V2.onSite]).toBe('FALSE')
  expect(row.values[V2.num]).toBe('=COUNTA(H$6:H7)')
  expect(row.values[V2.end]).toBe('=IF(C7<>"",C7+D7/1440,"")')
  expect(row.values[V2.delta]).toBe('=IF(F7<>"",ROUND((F7-C7)*1440),"")')
  expect(String(row.values[V2.cueType])).toContain('#gid=42&range=A')
  expect(String(row.values[V2.cueType])).toContain('$R7')
  expect(formulas.cueType(LAYOUT_V2, 7, undefined)).toBe('')
})

test('v2 layout: crew columns travel and a recording opt-out is reported as a change', () => {
  const prev = existing(
    'AAA111',
    A.fileKey,
    { actual: '10:04', deckOk: 'TRUE', mic: 'Handheld', cueRef: 'AV-007', rec: 'REC', track: 'Core' } as any,
    LAYOUT_V2
  )
  const p = plan([session({ track: 'Core', record: false })], [prev], A, LAYOUT_V2)
  const row = p.rows.find((r) => r.kind === 'session')!
  expect(row.values[V2.actual]).toBe('10:04')
  expect(row.values[V2.deckOk]).toBe('TRUE')
  expect(row.values[V2.mic]).toBe('Handheld')
  expect(row.values[V2.cueRef]).toBe('AV-007')
  expect(notes(row, LAYOUT_V2)).toBe('green room 09:30')
  expect(p.changes).toEqual([{ code: 'AAA111', title: 'Example talk', field: 'REC', from: 'REC', to: 'NO REC' }])
  expect(row.changed).toEqual([V2.rec])
})

test('event timezones are wall-clock for the crew', () => {
  expect(EVENT_TIMEZONES['devcon8']).toBe('Asia/Kolkata')
  expect(EVENT_TIMEZONES['devcon-7']).toBe('Asia/Bangkok')
})

// v3: Carlota's layout. Header on row 2, data from row 3, no time-of-day dividers.
function v3Row(code: string, over: Partial<Record<keyof typeof V3, string>> = {}): ExistingRow {
  const values = new Array(LAYOUT_V3.headers.length).fill('')
  values[V3.num] = '1'
  values[V3.status] = 'CONFIRMED'
  values[V3.start] = '10:00'
  values[V3.dur] = '30'
  values[V3.end] = '10:30'
  values[V3.qa] = '5'
  values[V3.segment] = 'Example talk'
  values[V3.speakers] = 'Ada Example'
  values[V3.contact] = 'Ada Example: TG @ada'
  values[V3.format] = 'Talk'
  values[V3.rec] = 'REC'
  values[V3.deckOk] = 'FALSE'
  values[V3.notes] = 'green room 09:30'
  values[V3.id] = code
  for (const [k, v] of Object.entries(over)) values[V3[k as keyof typeof V3]] = v
  return { code, values, status: values[V3.status], fileKey: A.fileKey, fileLabel: A.label }
}
const v3 = (sessions: RosSession[], rows: ExistingRow[] = []) => plan(sessions, rows, A, LAYOUT_V3, { firstSheetRow: 3 })

test('v3 layout is found on row 2, the older layouts on row 5', () => {
  const v3Rows = [['', 'DAY', 'STAGE'], LAYOUT_V3.headers.map((h) => h.replace(' ', '\n'))]
  expect(detectLayoutInRows(v3Rows)).toBe(LAYOUT_V3)
  const v2Rows = [['RUN OF SHOW'], [], ['DAY 1'], ['legend'], [...LAYOUT_V2.headers]]
  expect(detectLayoutInRows(v2Rows)).toBe(LAYOUT_V2)
  expect(detectLayoutInRows([['RUN OF SHOW'], ['#', 'STATUS']])).toBeNull()
  expect(LAYOUT_V3.headerRow).toBe(2)
})

test('Q&A minutes default by format, from the AV timer table', () => {
  expect(qaMinutesFor('Talk')).toBe(5)
  expect(qaMinutesFor('Lightning Talk')).toBe(2)
  expect(qaMinutesFor('Workshop')).toBe(0)
  expect(qaMinutesFor('CLS - Lightning Talk (Open Tech Summit)')).toBe(0)
  expect(qaMinutesFor('')).toBe(0)
})

test('v3 first run: defaults, synced contact, formulas, no dividers or footer', () => {
  const talk = session({
    contact: 'Ada Example: TG @ada',
    slides: 'https://docs.google.com/presentation/d/x',
  })
  const lightning = session({ code: 'BBB222', type: 'Lightning Talk', start: '10:35', end: '10:42', durationMin: 7 })
  const p = v3([talk, lightning])
  expect(p.rows.map((r) => r.kind)).toEqual(['session', 'session'])
  const [first, second] = p.rows
  expect(first.values[V3.qa]).toBe('5')
  expect(second.values[V3.qa]).toBe('2')
  expect(first.values[V3.contact]).toBe('Ada Example: TG @ada')
  expect(LAYOUT_V3.headers).not.toContain('Q&A QR')
  expect(first.values[V3.slides]).toBe('=HYPERLINK("https://docs.google.com/presentation/d/x","Slides")')
  expect(first.values[V3.deckOk]).toBe('FALSE')
  expect(first.values[V3.streaming]).toBe('')
  expect(first.values[V3.num]).toBe('=COUNTA(H$3:H3)')
  expect(first.values[V3.end]).toBe('=IF(C3<>"",C3+D3/1440,"")')
  // MC: the gap to the next live row's START, in minutes
  expect(first.values[V3.mc]).toBe(formulas.mc(LAYOUT_V3, 3))
  expect(formulas.mc(LAYOUT_V3, 3)).toBe('=IF(E3="","",IFERROR(ROUND((INDEX(FILTER($C4:$C,$C4:$C<>"",$B4:$B<>"CANCELLED"),1)-E3)*1440),""))')
  expect(second.values[V3.id]).toBe('BBB222')
})

test('v3 resync: crew Q&A and a Laptop slide stay, a new deck link is reported but not applied', () => {
  const laptop = v3Row('AAA111', { qa: '10', slides: 'Laptop', streaming: 'NO STREAM', intro: 'https://example.org/intro.mp4' })
  const linked = v3Row('BBB222', { slides: 'https://docs.google.com/presentation/d/old', start: '11:00', end: '11:30' })
  const p = v3(
    [
      session({
        slides: 'https://docs.google.com/presentation/d/new',
        contact: 'Ada Example: TG @ada',
      }),
      session({
        code: 'BBB222',
        start: '11:00',
        end: '11:30',
        slides: 'https://docs.google.com/presentation/d/new',
        contact: 'Ada Example: TG @ada',
      }),
    ],
    [laptop, linked]
  )
  const [a, b] = p.rows
  expect(a.values[V3.qa]).toBe('10')
  expect(a.values[V3.slides]).toBe('Laptop')
  expect(a.values[V3.streaming]).toBe('NO STREAM')
  expect(a.values[V3.intro]).toBe('https://example.org/intro.mp4')
  expect(a.changed).toEqual([])
  expect(b.values[V3.slides]).toBe('=HYPERLINK("https://docs.google.com/presentation/d/old","Slides")')
  expect(b.changed).toEqual([V3.slides])
  expect(p.changes).toEqual([
    {
      code: 'BBB222',
      title: 'Example talk',
      field: 'SLIDES (new link in Pretalx, not applied)',
      from: 'https://docs.google.com/presentation/d/old',
      to: 'https://docs.google.com/presentation/d/new',
    },
  ])
})

test('v3: an empty SLIDES cell is filled once the deck exists, a contact change is logged', () => {
  const row = v3Row('AAA111', { slides: '' })
  const p = v3(
    [
      session({
        slides: 'https://docs.google.com/presentation/d/x',
        contact: 'Ada Example: TG @ada_new',
      }),
    ],
    [row]
  )
  const r = p.rows[0]
  expect(r.values[V3.slides]).toBe('=HYPERLINK("https://docs.google.com/presentation/d/x","Slides")')
  expect(r.values[V3.contact]).toBe('Ada Example: TG @ada_new')
  expect(p.changes.map((c) => c.field)).toEqual(['SPEAKER CONTACT'])
  expect(r.changed).toEqual([V3.contact])
})

test('v3: the REMOVED section appears only when a session leaves, without MC or footer', () => {
  const p = v3([], [v3Row('AAA111', { mc: '5' })])
  expect(p.rows.map((r) => r.kind)).toEqual(['removed-header', 'removed'])
  expect(p.rows[0].values[0]).toBe(REMOVED_HEADER)
  expect(p.rows[1].values[V3.mc]).toBe('')
  expect(p.rows[1].values[V3.status]).toBe('CANCELLED')
})

test('link cells: a URL becomes a short label, anything typed by hand stays text', () => {
  expect(linkCell('https://devcon.org/qr/meerkat/a?svg&download', 'QR')).toBe('=HYPERLINK("https://devcon.org/qr/meerkat/a?svg&download","QR")')
  expect(linkCell('Laptop', 'Slides')).toBe('Laptop')
  expect(hyperlinkTarget('=HYPERLINK("https://devcon.org/qr/meerkat/a?svg&download","QR")')).toBe('https://devcon.org/qr/meerkat/a?svg&download')
})
