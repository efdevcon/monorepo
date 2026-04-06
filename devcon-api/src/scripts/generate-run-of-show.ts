import { google } from 'googleapis'
import { JWT } from 'google-auth-library'
import { GetRooms, GetSessions, GetSpeakers } from '@/clients/pretalx'
import { getPretalxConfig } from '@/utils/config'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']

function authenticateGoogle() {
  const clientEmail = process.env.ROS_GOOGLE_CLIENT_EMAIL
  const privateKey = process.env.ROS_GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!clientEmail || !privateKey) {
    throw new Error('ROS_GOOGLE_CLIENT_EMAIL and ROS_GOOGLE_PRIVATE_KEY must be set')
  }

  console.log(`Using service account: ${clientEmail}`)

  const auth = new JWT({ email: clientEmail, key: privateKey, scopes: SCOPES })
  google.options({ auth: auth as any })
  return google
}

const eventId = process.argv[2] || 'devcon-mumbai-playground'

console.log(`Generating Run of Show for: ${eventId}`)

interface SessionData {
  id: string
  sourceId: string
  title: string
  track: string
  type: string
  expertise: string
  speakers: any[]
  slot_start: number | string | null
  slot_end: number | string | null
  slot_roomId: string | null
  eventId: string
}

interface RoomData {
  id: string
  name: string
}

async function main() {
  const config = getPretalxConfig(eventId)

  // Fetch directly from pretalx — independent of the sync pipeline
  console.log(`Fetching data from pretalx (${config.PRETALX_BASE_URI})...`)
  const [sessions, rooms, speakers] = await Promise.all([
    GetSessions({}, config) as Promise<SessionData[]>,
    GetRooms(config) as Promise<RoomData[]>,
    GetSpeakers({}, config),
  ])

  console.log(`Fetched ${sessions.length} sessions, ${rooms.length} rooms, ${speakers.length} speakers`)

  if (!sessions.length) {
    console.log('No sessions found, nothing to generate')
    return
  }

  // Group sessions by day and room
  const sessionsByDayRoom = groupSessionsByDayRoom(sessions)
  const days = Object.keys(sessionsByDayRoom).sort()

  const gClient = authenticateGoogle()
  const sheets = gClient.sheets('v4')
  const drive = gClient.drive('v3')

  const title = `Run of Show — ${eventId}`
  let sheetId: string | undefined = process.env.ROS_SPREADSHEET_ID

  if (sheetId) {
    console.log(`Updating spreadsheet: https://docs.google.com/spreadsheets/d/${sheetId}`)
  } else {
    console.error(`\nROS_SPREADSHEET_ID is not set.`)
    console.error(`Create a Google Spreadsheet manually, share it with the service account as Editor,`)
    console.error(`then set ROS_SPREADSHEET_ID=<spreadsheet-id> in .env\n`)
    process.exit(1)
  }

  // Get existing sheets
  const existing = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
  const existingSheets = existing.data.sheets || []

  // Build sheet names: one per day per room
  const sheetConfigs: { name: string; day: string; roomId: string; room: RoomData }[] = []
  for (const day of days) {
    const roomIds = Object.keys(sessionsByDayRoom[day]).sort()
    for (const roomId of roomIds) {
      const room = rooms.find((r) => r.id === roomId) || { id: roomId, name: roomId }
      const dayLabel = dayjs(day).format('ddd MMM D')
      const name = `${dayLabel} — ${room.name}`.substring(0, 100)
      sheetConfigs.push({ name, day, roomId, room })
    }
  }

  // Unscheduled sessions sheet
  const unscheduled = sessions.filter((s) => !s.slot_start)
  if (unscheduled.length > 0) {
    sheetConfigs.push({ name: 'Unscheduled', day: '', roomId: '', room: { id: '', name: '' } })
  }

  if (sheetConfigs.length === 0) {
    console.log('No scheduled or unscheduled sessions to display')
    return
  }

  // Rebuild sheets: delete all except first, rename first, add new ones
  const requests: any[] = []

  for (let i = existingSheets.length - 1; i >= 1; i--) {
    requests.push({ deleteSheet: { sheetId: existingSheets[i].properties?.sheetId } })
  }

  requests.push({
    updateSheetProperties: {
      properties: { sheetId: existingSheets[0]?.properties?.sheetId || 0, title: sheetConfigs[0].name },
      fields: 'title',
    },
  })

  for (let i = 1; i < sheetConfigs.length; i++) {
    requests.push({ addSheet: { properties: { title: sheetConfigs[i].name } } })
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: sheetId, requestBody: { requests } })
  }

  // Re-fetch to get sheet IDs
  const updated = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
  const updatedSheets = updated.data.sheets || []

  // Populate each sheet
  for (let i = 0; i < sheetConfigs.length; i++) {
    const sheetConfig = sheetConfigs[i]
    const sheet = updatedSheets[i]
    const sheetGid = sheet?.properties?.sheetId || 0

    let rows: any[][]

    if (sheetConfig.day === '' && sheetConfig.roomId === '') {
      rows = buildUnscheduledRows(unscheduled, speakers)
    } else {
      const daySessions = sessionsByDayRoom[sheetConfig.day]?.[sheetConfig.roomId] || []
      rows = buildDayRoomRows(sheetConfig.day, sheetConfig.room, daySessions, speakers)
    }

    // Clear existing data then write
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `'${sheetConfig.name}'`,
    })

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${sheetConfig.name}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    })

    await applyFormatting(sheets, sheetId, sheetGid, rows)

    console.log(`  Done: ${sheetConfig.name} (${rows.length} rows)`)
  }

  console.log(`\nDone! https://docs.google.com/spreadsheets/d/${sheetId}`)
}

// ============================================================================
// DATA GROUPING
// ============================================================================

function groupSessionsByDayRoom(sessions: SessionData[]): Record<string, Record<string, SessionData[]>> {
  const result: Record<string, Record<string, SessionData[]>> = {}

  for (const session of sessions) {
    if (!session.slot_start) continue

    const start = typeof session.slot_start === 'number' ? dayjs(session.slot_start) : dayjs(session.slot_start)
    const day = start.format('YYYY-MM-DD')
    const roomId = session.slot_roomId || 'unassigned'

    if (!result[day]) result[day] = {}
    if (!result[day][roomId]) result[day][roomId] = []
    result[day][roomId].push(session)
  }

  for (const day of Object.keys(result)) {
    for (const room of Object.keys(result[day])) {
      result[day][room].sort((a, b) => {
        const aStart = typeof a.slot_start === 'number' ? a.slot_start : new Date(a.slot_start!).getTime()
        const bStart = typeof b.slot_start === 'number' ? b.slot_start : new Date(b.slot_start!).getTime()
        return aStart - bStart
      })
    }
  }

  return result
}

// ============================================================================
// HELPERS
// ============================================================================

function resolveSpeakerNames(session: SessionData, allSpeakers: any[]): string {
  if (!session.speakers || session.speakers.length === 0) return ''
  return session.speakers
    .map((id: any) => {
      if (typeof id === 'object') return id.name
      const speaker = allSpeakers.find((s) => s.id === id || s.sourceId === id)
      return speaker?.name || id
    })
    .join(', ')
}

function formatTime(value: number | string | null): string {
  if (!value) return ''
  const d = typeof value === 'number' ? dayjs(value) : dayjs(value)
  return d.utc().format('HH:mm')
}

function getDurationMinutes(start: number | string | null, end: number | string | null): number {
  if (!start || !end) return 0
  const s = typeof start === 'number' ? start : new Date(start).getTime()
  const e = typeof end === 'number' ? end : new Date(end).getTime()
  return Math.round((e - s) / 60000)
}

function getSessionBlock(time: string): string {
  const hour = parseInt(time.split(':')[0])
  if (hour < 12) return 'MORNING'
  if (hour < 14) return 'MIDDAY'
  if (hour < 17) return 'AFTERNOON'
  return 'EVENING'
}

// ============================================================================
// ROW BUILDERS
// ============================================================================

const HEADERS = [
  '#', 'STATUS', 'START TIME', 'DUR (mins)', 'END TIME', 'SESSION SEGMENT',
  'FORMAT', 'SPEAKER NAME', 'MODERATOR', 'LOCATION / STAGE', 'SLIDES / MEDIA',
  'MIC CONFIG', 'SPEAKER ARRIVED?', 'AV CUE REF', 'INTERNAL NOTES',
  'PUBLIC NOTES', 'LAST EDITED BY',
]

function buildDayRoomRows(day: string, room: RoomData, sessions: SessionData[], allSpeakers: any[]): any[][] {
  const dayLabel = dayjs(day).format('dddd, MMMM D, YYYY')
  const rows: any[][] = []

  rows.push(['RUN OF SHOW'])
  rows.push([])
  rows.push([`${dayLabel} — ${room.name}`])
  rows.push([])
  rows.push(HEADERS)

  let currentBlock = ''
  let counter = 0

  for (const session of sessions) {
    const startTime = formatTime(session.slot_start)
    const block = getSessionBlock(startTime)

    if (block !== currentBlock) {
      currentBlock = block
      rows.push([`— ${block} SESSION —`])
    }

    counter++
    rows.push([
      counter,
      'CONFIRMED',
      startTime,
      getDurationMinutes(session.slot_start, session.slot_end),
      formatTime(session.slot_end),
      session.title,
      session.type || '',
      resolveSpeakerNames(session, allSpeakers),
      '',
      room.name,
      '',
      '',
      false,
      `AV-${String(counter).padStart(3, '0')}`,
      '',
      '',
      '',
    ])
  }

  return rows
}

function buildUnscheduledRows(sessions: SessionData[], allSpeakers: any[]): any[][] {
  const rows: any[][] = []

  rows.push(['RUN OF SHOW'])
  rows.push([])
  rows.push(['UNSCHEDULED SESSIONS'])
  rows.push([])
  rows.push(HEADERS)

  let counter = 0
  for (const session of sessions) {
    counter++
    rows.push([
      counter, 'TBC', '', '', '', session.title, session.type || '',
      resolveSpeakerNames(session, allSpeakers),
      '', '', '', '', false, '', '', '', '',
    ])
  }

  return rows
}

// ============================================================================
// FORMATTING
// ============================================================================

async function applyFormatting(sheets: any, spreadsheetId: string, sheetId: number, rows: any[][]) {
  const requests: any[] = []

  // Column widths
  const widths = [40, 100, 80, 70, 70, 250, 100, 180, 120, 120, 120, 100, 100, 70, 180, 180, 100]
  for (let i = 0; i < widths.length; i++) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: widths[i] },
        fields: 'pixelSize',
      },
    })
  }

  // Title (row 0) — bold, large, centered, merged
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 17 },
      cell: {
        userEnteredFormat: {
          textFormat: { bold: true, fontSize: 18 },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
        },
      },
      fields: 'userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment)',
    },
  })
  requests.push({
    mergeCells: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 17 },
      mergeType: 'MERGE_ALL',
    },
  })

  // Day/room header (row 2) — dark bg, white text, merged
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 17 },
      cell: {
        userEnteredFormat: {
          textFormat: { bold: true, fontSize: 12, foregroundColorStyle: { rgbColor: { red: 1, green: 1, blue: 1 } } },
          backgroundColor: { red: 0.2, green: 0.2, blue: 0.2 },
        },
      },
      fields: 'userEnteredFormat(textFormat,backgroundColor)',
    },
  })
  requests.push({
    mergeCells: {
      range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 17 },
      mergeType: 'MERGE_ALL',
    },
  })

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]

    // Column headers row
    if (row[0] === '#' && row[1] === 'STATUS') {
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 0, endColumnIndex: 17 },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true, fontSize: 10 },
              backgroundColor: { red: 0.85, green: 0.85, blue: 0.85 },
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE',
              wrapStrategy: 'WRAP',
            },
          },
          fields: 'userEnteredFormat(textFormat,backgroundColor,horizontalAlignment,verticalAlignment,wrapStrategy)',
        },
      })
    }

    // Section dividers
    if (typeof row[0] === 'string' && row[0].startsWith('—') && row[0].endsWith('—')) {
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 0, endColumnIndex: 17 },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true, italic: true, fontSize: 11, foregroundColorStyle: { rgbColor: { red: 0.8, green: 0.7, blue: 0.2 } } },
              backgroundColor: { red: 0.15, green: 0.15, blue: 0.25 },
              horizontalAlignment: 'CENTER',
            },
          },
          fields: 'userEnteredFormat(textFormat,backgroundColor,horizontalAlignment)',
        },
      })
      requests.push({
        mergeCells: {
          range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 0, endColumnIndex: 17 },
          mergeType: 'MERGE_ALL',
        },
      })
    }

    // Status coloring
    if (row[1] === 'CONFIRMED') {
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 1, endColumnIndex: 2 },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true, foregroundColorStyle: { rgbColor: { red: 0, green: 0.5, blue: 0 } } },
              horizontalAlignment: 'CENTER',
            },
          },
          fields: 'userEnteredFormat(textFormat,horizontalAlignment)',
        },
      })
    } else if (row[1] === 'TBC') {
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 1, endColumnIndex: 2 },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true, foregroundColorStyle: { rgbColor: { red: 0.85, green: 0.55, blue: 0 } } },
              backgroundColor: { red: 1, green: 0.93, blue: 0.87 },
              horizontalAlignment: 'CENTER',
            },
          },
          fields: 'userEnteredFormat(textFormat,backgroundColor,horizontalAlignment)',
        },
      })
    }

    // Checkbox for "Speaker Arrived?"
    if (row[12] === false) {
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 12, endColumnIndex: 13 },
          cell: { dataValidation: { condition: { type: 'BOOLEAN' }, showCustomUi: true } },
          fields: 'dataValidation',
        },
      })
    }
  }

  // Freeze first 5 rows
  requests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 5 } },
      fields: 'gridProperties.frozenRowCount',
    },
  })

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } })
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
