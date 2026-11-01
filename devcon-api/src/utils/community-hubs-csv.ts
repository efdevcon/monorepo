import type { DSheetCell, DSheetTab } from '@/clients/fileverse'

// A community that sends its programme as a spreadsheet export instead of
// filling the dSheets template (the Base Booth, 2026-11-01). The file is kept
// in the repo (COMMUNITY_HUB_CSV_DIR/<hub id>.csv, as sent) and turned here
// into the cells of a v5 "Schedule" tab, so the sheet parser
// (utils/community-hubs.ts) and everything after it work unchanged: the hub
// name on row 1, the template's header row, one row per session. Columns are
// matched by header text in the spellings such exports use (Title, Date,
// Start/End, Speakers, Tags...). A Location column and a link column (Luma
// link, URL...) have no template equivalent and are appended to the
// description, where the app renders them. Rows are keyed by an ID column
// when the file has one; without it the session id falls back to the title.

interface ColumnSpec {
  /** Header text in the generated tab (the template's), which the sheet parser matches. */
  header: string
  /** Header spellings accepted in the CSV. */
  match: RegExp
  required?: boolean
}

const COLUMNS: ColumnSpec[] = [
  { header: 'ID', match: /^(id|key)$/i },
  { header: 'Day', match: /^(day|date)$/i, required: true },
  { header: 'From', match: /^(from|start|start time)$/i, required: true },
  { header: 'To', match: /^(to|end|end time)$/i, required: true },
  { header: 'Session title', match: /^((session )?title|session( name)?)$/i, required: true },
  { header: 'Format (optional)', match: /^(format|type)$/i },
  { header: 'Speaker(s)', match: /^speaker/i },
  { header: 'Description (optional)', match: /^desc/i },
  { header: 'Topic (optional)', match: /^(topic|tags?)$/i },
]
const LOCATION = /^(location|room|venue|where)$/i
const LINK = /^(link|url|registration|rsvp)$|\b(link|url)$/i
const TIME_HEADERS = new Set(['From', 'To'])

/** RFC 4180: comma-separated, double quotes around fields that hold commas, quotes (doubled) or line breaks; CRLF or LF; a BOM is dropped. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += ch
      continue
    }
    if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      field = ''
      rows.push(row)
      row = []
    } else field += ch
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  // Blank lines (an export's trailing newline, a spacer) are not rows.
  return rows.filter((r) => r.some((v) => v.trim() !== ''))
}

/**
 * The programme CSV as one v5 schedule tab. Throws when the file is empty or
 * lacks a column the schedule needs, with the headers it found, so the export
 * reports it like an unreadable sheet.
 */
export function csvToHubTab(hubName: string, csv: string): DSheetTab {
  const rows = parseCsv(csv)
  if (rows.length === 0) throw new Error('the CSV is empty')
  const headers = rows[0].map((h) => h.trim())
  const sourceCol = new Map<string, number>()
  for (const spec of COLUMNS) {
    const at = headers.findIndex((h, i) => spec.match.test(h) && ![...sourceCol.values()].includes(i))
    if (at >= 0) sourceCol.set(spec.header, at)
  }
  const missing = COLUMNS.filter((c) => c.required && !sourceCol.has(c.header)).map((c) => c.header)
  if (missing.length) throw new Error(`the CSV has no ${missing.join(', ')} column (headers: ${headers.join(', ') || 'none'})`)
  const locationCol = headers.findIndex((h) => LOCATION.test(h))
  const linkCol = headers.findIndex((h) => LINK.test(h))
  // The template's columns the file provides, in the template's order; a Location or link column needs a description cell to land in.
  const extrasCol = locationCol >= 0 || linkCol >= 0
  const present = COLUMNS.filter((c) => sourceCol.has(c.header) || (c.header === 'Description (optional)' && extrasCol))

  const cells: DSheetCell[] = [{ row: 0, col: 0, value: hubName, text: hubName }]
  present.forEach((c, col) => cells.push({ row: 1, col, value: c.header, text: c.header }))
  const at = (row: string[], col: number) => (col >= 0 ? (row[col] ?? '').trim() : '')
  for (const [index, row] of rows.slice(1).entries()) {
    const line = index + 2
    for (const [col, spec] of present.entries()) {
      let text = at(row, sourceCol.get(spec.header) ?? -1)
      if (spec.header === 'Description (optional)') {
        const extras = [
          locationCol >= 0 && at(row, locationCol) ? `Where: ${at(row, locationCol)}` : '',
          linkCol >= 0 && at(row, linkCol) ? `Register: ${at(row, linkCol)}` : '',
        ].filter(Boolean)
        text = [text, ...extras].filter(Boolean).join('\n\n')
      }
      if (!text) continue
      cells.push({ row: line, col, value: text, text, ...(TIME_HEADERS.has(spec.header) ? { format: '@' } : {}) })
    }
  }
  return { id: 'csv', name: 'Schedule', order: 0, cells }
}
