import { GetData, GetSpeakerData } from '@/clients/filesystem'
import { vectorizeSession, buildDictionary, GetRecommendedVectorSearch, VectorizedSession } from '@/clients/recommendation'

// In-memory data loaded from JSON files at startup
let events: any[] = []
let rooms: any[] = []
let speakers: any[] = []
let sessions: any[] = []

// Lookup maps for fast access
let speakerMap: Map<string, any> = new Map()
let roomMap: Map<string, any> = new Map()
let sessionMap: Map<string, any> = new Map()

// Vectorized sessions for related sessions lookup
let vectorizedSessionsMap: Map<string, VectorizedSession> = new Map()
let allVectorizedSessions: VectorizedSession[] = []

export function initStore() {
  console.log('Loading data into memory...')

  rooms = GetData('rooms')
  const rawEvents = GetData('events')
  speakers = GetSpeakerData()
  const rawSessions = GetData('sessions')

  // Build lookup maps
  speakerMap = new Map()
  for (const s of speakers) {
    speakerMap.set(s.id, s)
    if (s.sourceId) speakerMap.set(s.sourceId, s)
    if (s.hash) speakerMap.set(s.hash, s)
  }

  roomMap = new Map()
  for (const r of rooms) {
    roomMap.set(r.id, r)
  }

  // Resolve sessions: expand speaker IDs to objects, attach room object
  sessions = rawSessions.map((session: any) => {
    const resolvedSpeakers = (session.speakers || [])
      .map((id: string) => speakerMap.get(id))
      .filter(Boolean)

    const slot_room = session.slot_roomId ? roomMap.get(session.slot_roomId) || null : null

    return {
      ...session,
      speakers: resolvedSpeakers,
      slot_room,
    }
  })

  // Build session lookup map (by id and sourceId)
  sessionMap = new Map()
  for (const s of sessions) {
    sessionMap.set(s.id, s)
    if (s.sourceId) sessionMap.set(s.sourceId, s)
  }

  // Resolve events: attach rooms and session count
  events = rawEvents.map((event: any) => {
    const eventRooms = (event.rooms || [])
      .map((id: string) => roomMap.get(id))
      .filter(Boolean)

    const nrOfSessions = sessions.filter((s: any) => s.eventId === event.id).length

    return {
      ...event,
      rooms: eventRooms,
      nrOfSessions,
    }
  })

  console.log(`Loaded ${events.length} events, ${rooms.length} rooms, ${speakers.length} speakers, ${sessions.length} sessions`)

  // Build vectors for related sessions (using raw sessions with string speaker IDs)
  const dictionary = buildDictionary(rawSessions, true)
  vectorizedSessionsMap = new Map()
  allVectorizedSessions = rawSessions.map((session: any) => {
    const vs: VectorizedSession = {
      session,
      vector: vectorizeSession(session, dictionary),
    }
    vectorizedSessionsMap.set(session.id, vs)
    return vs
  })

  console.log(`Vectorized ${allVectorizedSessions.length} sessions for related lookup`)
}

// --- Event queries ---

export function getEvents() {
  return events.map(({ rooms, ...event }) => event)
}

export function getEvent(id: string) {
  return events.find((e) => e.id === id) || null
}

export function getEventRooms(eventId: string) {
  const event = events.find((e) => e.id === eventId)
  return event?.rooms || null
}

// --- Session queries ---

interface SessionFilters {
  q?: string
  event?: string | string[]
  expertise?: string | string[]
  type?: string | string[]
  tags?: string | string[]
  room?: string
  sort?: string
  order?: string
  skip?: number
  take?: number
}

// Lowercase + NFD-decompose + strip combining marks so "Szilágyi" and "Szilagyi" compare equal.
function normalizeSearchText(value: string | undefined | null): string {
  if (!value) return ''
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function getSessions(filters: SessionFilters) {
  let result = [...sessions]

  // Text search — diacritic-insensitive so "Szilagyi" matches "Szilágyi"
  if (filters.q) {
    const query = normalizeSearchText(filters.q)
    result = result.filter((s) => {
      if (normalizeSearchText(s.title).includes(query)) return true
      if (normalizeSearchText(s.description).includes(query)) return true
      if (s.speakers?.some((sp: any) => normalizeSearchText(sp.name).includes(query))) return true
      return false
    })
  }

  // Event filter
  if (filters.event) {
    const eventIds = [filters.event].flat()
    result = result.filter((s) => eventIds.includes(s.eventId))
  }

  // Expertise filter
  if (filters.expertise) {
    const values = [filters.expertise].flat()
    result = result.filter((s) => values.includes(s.expertise))
  }

  // Type filter
  if (filters.type) {
    const values = [filters.type].flat()
    result = result.filter((s) => values.includes(s.type))
  }

  // Tags filter
  if (filters.tags) {
    const values = [filters.tags].flat()
    result = result.filter((s) => values.includes(s.track))
  }

  // Room filter
  if (filters.room) {
    result = result.filter((s) => s.slot_roomId === filters.room)
  }

  const total = result.length

  // Sort
  if (filters.sort) {
    const order = filters.order || 'desc'
    result.sort((a, b) => {
      const aVal = a[filters.sort!]
      const bVal = b[filters.sort!]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (aVal < bVal) return order === 'asc' ? -1 : 1
      if (aVal > bVal) return order === 'asc' ? 1 : -1
      return 0
    })
  }

  // Pagination
  const skip = filters.skip || 0
  const take = filters.take || 20
  result = result.slice(skip, skip + take)

  return { total, items: result }
}

export function getSession(id: string) {
  return sessionMap.get(id) || null
}

export function getAllSessions() {
  return sessions
}

export function getSessionsBySourceIds(sourceIds: string[]) {
  return sessions.filter((s) => sourceIds.includes(s.sourceId))
}

export function getRelatedSessions(id: string) {
  const vs = vectorizedSessionsMap.get(id)
  if (!vs) return null

  const recommendations = GetRecommendedVectorSearch(vs.vector, allVectorizedSessions, 11)
  const filtered = recommendations.filter((rec) => rec.id !== id)

  // Return resolved sessions (with full speaker objects) instead of raw ones
  return filtered.slice(0, 10).map((rec) => {
    const resolved = sessionMap.get(rec.id)
    return resolved ? { ...resolved, similarity: rec.similarity } : { ...rec }
  })
}

// --- Speaker queries ---

interface SpeakerFilters {
  event?: string | string[]
  sort?: string
  order?: string
  skip?: number
  take?: number
}

export function getSpeakers(filters: SpeakerFilters) {
  let result = [...speakers]

  // Event filter: speakers who have sessions in the given event(s)
  if (filters.event) {
    const eventIds = [filters.event].flat()
    const speakerIdsInEvents = new Set<string>()
    for (const session of sessions) {
      if (eventIds.includes(session.eventId)) {
        for (const sp of session.speakers || []) {
          speakerIdsInEvents.add(sp.id)
        }
      }
    }
    result = result.filter((s) => speakerIdsInEvents.has(s.id))
  }

  const total = result.length

  // Sort
  if (filters.sort) {
    const order = filters.order || 'desc'
    result.sort((a, b) => {
      const aVal = a[filters.sort!]
      const bVal = b[filters.sort!]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (aVal < bVal) return order === 'asc' ? -1 : 1
      if (aVal > bVal) return order === 'asc' ? 1 : -1
      return 0
    })
  }

  // Pagination
  const skip = filters.skip || 0
  const take = filters.take || 20
  result = result.slice(skip, skip + take)

  return { total, items: result }
}

export function getSpeaker(id: string) {
  const speaker = speakerMap.get(id)
  if (!speaker) return null

  // Attach sessions for this speaker (with slot_room resolved)
  const speakerSessions = sessions.filter((s) =>
    s.speakers?.some((sp: any) => sp.id === speaker.id)
  )

  return {
    ...speaker,
    sessions: speakerSessions,
  }
}

export function getSpeakersByIds(ids: string[]) {
  const result: any[] = []
  const seen = new Set<string>()
  for (const id of ids) {
    const speaker = speakerMap.get(id)
    if (speaker && !seen.has(speaker.id)) {
      seen.add(speaker.id)
      result.push(speaker)
    }
  }
  return result
}

// --- Write operations ---

export function updateSession(id: string, data: any) {
  const index = sessions.findIndex((s) => s.id === id)
  if (index === -1) return null

  const existing = sessions[index]
  const updated = { ...existing, ...data }

  // Re-resolve speakers if they changed
  if (data.speakers && Array.isArray(data.speakers)) {
    if (typeof data.speakers[0] === 'string') {
      updated.speakers = data.speakers
        .map((sid: string) => speakerMap.get(sid))
        .filter(Boolean)
    }
  }

  // Re-resolve room if changed
  if (data.slot_roomId !== undefined) {
    updated.slot_room = data.slot_roomId ? roomMap.get(data.slot_roomId) || null : null
  }

  sessions[index] = updated
  sessionMap.set(updated.id, updated)
  if (updated.sourceId) sessionMap.set(updated.sourceId, updated)

  return updated
}

export function updateEventVersion(eventId: string, version: string) {
  const event = events.find((e) => e.id === eventId)
  if (event) {
    event.version = version
  }
}

export function createSession(data: any) {
  const resolvedSpeakers = (data.speakers || [])
    .map((id: string) => {
      if (typeof id === 'string') return speakerMap.get(id)
      return id
    })
    .filter(Boolean)

  const slot_room = data.slot_roomId ? roomMap.get(data.slot_roomId) || null : null

  const session = {
    ...data,
    speakers: resolvedSpeakers,
    slot_room,
  }

  sessions.push(session)
  sessionMap.set(session.id, session)
  if (session.sourceId) sessionMap.set(session.sourceId, session)

  // Update event session count
  const event = events.find((e) => e.id === session.eventId)
  if (event) {
    event.nrOfSessions = sessions.filter((s) => s.eventId === event.id).length
  }

  return session
}

export function deleteSession(id: string) {
  const index = sessions.findIndex((s) => s.id === id)
  if (index === -1) return false

  const session = sessions[index]
  sessions.splice(index, 1)
  sessionMap.delete(session.id)
  if (session.sourceId) sessionMap.delete(session.sourceId)

  // Update event session count
  const event = events.find((e) => e.id === session.eventId)
  if (event) {
    event.nrOfSessions = sessions.filter((s) => s.eventId === event.id).length
  }

  return true
}

export function findSpeaker(id: string) {
  return speakerMap.get(id) || null
}

export function createSpeaker(data: any) {
  speakers.push(data)
  speakerMap.set(data.id, data)
  if (data.sourceId) speakerMap.set(data.sourceId, data)
  if (data.hash) speakerMap.set(data.hash, data)
}
