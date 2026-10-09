import * as store from '@/data/store'
import { getCommunityHubBundle } from '@/services/community-hubs'
import { COMMUNITY_HUBS, eventUtcOffsetMinutes, isCommunityHubRoom } from '@/utils/community-hubs'
import { catalogueDays, type CatalogueContext, type CatalogueSession } from '@/utils/ai-catalogue'

// Assembles the AI catalogue (utils/ai-catalogue.ts) from the store's
// sessions and the live Community Hubs bundle; the controller formats it.

/** Where the event app lives, for the apply link in the index. */
const EVENT_APP_ORIGIN = process.env.EVENT_APP_ORIGIN || 'https://app.devcon.org'

export interface Catalogue {
  sessions: CatalogueSession[]
  hubs: { id: string; name: string }[]
  ctx: CatalogueContext
}

export async function buildCatalogue(eventId: string, apiOrigin: string): Promise<Catalogue> {
  const event = store.getEvent(eventId)
  if (!event) throw new Error(`unknown event ${eventId}`)
  const rooms = new Map<string, string>((store.getEventRooms(eventId) ?? []).map((r: any) => [r.id, r.name]))
  const sessions: CatalogueSession[] = []
  // The store query paginates (20 by default); the catalogue wants the whole event.
  for (const s of store.getSessions({ event: eventId, take: 100_000 }).items as any[]) {
    if (typeof s.slot_start !== 'number' || typeof s.slot_end !== 'number') continue
    sessions.push({
      code: s.sourceId || s.id,
      title: s.title ?? '',
      start: s.slot_start,
      end: s.slot_end,
      room: rooms.get(s.slot_roomId) ?? s.slot_roomId ?? '',
      track: s.track ?? '',
      type: s.type ?? '',
      expertise: s.expertise ?? '',
      // The store resolves speakers to objects at load; raw ids are tolerated too.
      speakers: (s.speakers ?? []).map((sp: any) => (typeof sp === 'string' ? store.getSpeakersByIds([sp])[0]?.name : sp?.name)).filter(Boolean),
      tags: Array.isArray(s.tags) ? s.tags : [],
      description: s.description ?? '',
    })
  }
  // Hubs are best effort: a sheet outage must not take the main programme down with it.
  let hubs: { id: string; name: string }[] = []
  try {
    const bundle = await getCommunityHubBundle(eventId)
    const hubRooms = new Map(bundle.rooms.map((r: any) => [r.id, r.name as string]))
    const names = new Map(bundle.speakers.map((sp: any) => [sp.id, sp.name as string]))
    for (const s of bundle.sessions as any[]) {
      if (!isCommunityHubRoom(s.slot_roomId)) continue
      sessions.push({
        code: s.id,
        title: s.title ?? '',
        start: s.slot_start,
        end: s.slot_end,
        room: hubRooms.get(s.slot_roomId) ?? s.slot_roomId,
        track: s.track ?? 'Community Hubs',
        type: s.type ?? '',
        expertise: '',
        speakers: (s.speakerIds ?? []).map((id: string) => names.get(id) ?? id),
        tags: Array.isArray(s.tags) ? s.tags : [],
        description: s.description ?? '',
      })
    }
    hubs = COMMUNITY_HUBS.filter((h) => hubRooms.has(`community-hub-${h.id}`)).map((h) => ({ id: h.id, name: h.name }))
  } catch (error) {
    console.warn('[ai-catalogue] hubs unavailable:', error instanceof Error ? error.message : error)
  }
  const ctx: CatalogueContext = {
    eventId,
    eventTitle: event.title ?? eventId,
    days: event.startDate && event.endDate ? catalogueDays(event.startDate, event.endDate) : [],
    offsetMinutes: eventUtcOffsetMinutes(eventId),
    apiOrigin,
    appOrigin: EVENT_APP_ORIGIN,
  }
  return { sessions, hubs, ctx }
}
