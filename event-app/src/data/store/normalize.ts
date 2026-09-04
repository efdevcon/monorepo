import type {
  EventBundle,
  EventMetaRow,
  NormalizedRows,
  RoomRow,
  SessionRow,
  SpeakerRow,
} from "./types";

/** Drop undefined keys in place so rows carry no dead weight into IndexedDB. */
export function compact<T extends object>(obj: T): T {
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] === undefined) delete obj[key];
  }
  return obj;
}

const toMs = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v) return new Date(v).getTime() || 0;
  return 0;
};

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v ? v : undefined;

const parseTags = (raw: unknown): string[] => {
  const list =
    typeof raw === "string" ? raw.split(",") : Array.isArray(raw) ? raw : [];
  return list.map((t) => String(t).trim()).filter(Boolean);
};

/**
 * Wire bundle → persisted rows for one event. Pure. Ids are kept, embeds are
 * not (there are none on the wire either); text fields default to "" so the
 * read model's required strings hold; `now` stamps syncedAt/checkedAt.
 */
export function normalizeBundle(
  bundle: EventBundle,
  eventId: string,
  now: number
): NormalizedRows {
  const sessions: SessionRow[] = bundle.sessions.map((s) =>
    compact<SessionRow>({
      eventId,
      id: s.id,
      title: s.title ?? "",
      description: s.description ?? "",
      track: s.track ?? "",
      type: s.type ?? "Talk",
      expertise: s.expertise ?? "",
      tags: parseTags(s.tags),
      featured: s.featured === true ? true : undefined,
      slotStart: toMs(s.slot_start),
      slotEnd: toMs(s.slot_end),
      roomId: str(s.slot_roomId),
      speakerIds: Array.isArray(s.speakerIds) ? s.speakerIds.map(String) : [],
      sources_youtubeId: str(s.sources_youtubeId),
      sources_streamethId: str(s.sources_streamethId),
      sources_swarmHash: str(s.sources_swarmHash),
    })
  );

  const speakers: SpeakerRow[] = bundle.speakers.map((sp) =>
    compact<SpeakerRow>({
      eventId,
      id: sp.id,
      name: sp.name ?? "",
      avatar: str(sp.avatar),
      description: str(sp.description),
      twitter: str(sp.twitter),
      github: str(sp.github),
      website: str(sp.website),
      role: str(sp.role),
      company: str(sp.company),
    })
  );

  const rooms: RoomRow[] = bundle.rooms.map((r) =>
    compact<RoomRow>({
      eventId,
      id: r.id,
      name: r.name ?? "",
      description: str(r.description),
      info: str(r.info),
      capacity: typeof r.capacity === "number" ? r.capacity : undefined,
      youtubeStreamUrl_1: str(r.youtubeStreamUrl_1),
      youtubeStreamUrl_2: str(r.youtubeStreamUrl_2),
      youtubeStreamUrl_3: str(r.youtubeStreamUrl_3),
      youtubeStreamUrl_4: str(r.youtubeStreamUrl_4),
      translationUrl: str(r.translationUrl),
    })
  );

  const meta: EventMetaRow = compact<EventMetaRow>({
    eventId,
    version: bundle.version,
    syncedAt: now,
    checkedAt: now,
    title: str(bundle.event?.title),
    startDate: str(bundle.event?.startDate),
    endDate: str(bundle.event?.endDate),
    featuredSpeakers: Array.isArray(bundle.event?.featuredSpeakers)
      ? bundle.event.featuredSpeakers.map(String)
      : undefined,
  });

  return { sessions, speakers, rooms, meta };
}
