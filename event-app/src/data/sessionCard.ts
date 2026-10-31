/**
 * The session's social card on devcon.org, the image the session page shows
 * in its banner (SessionDetailsContent) and a shared link previews.
 *
 * The URL carries a hash of everything the card is drawn from. The service
 * worker caches images cache-first for 30 days under their URL, so a card
 * fetched once would otherwise stay as it was even after speakers were added
 * (the opening ceremony, 2026-10-31). With the hash in the URL an unchanged
 * session costs nothing new, and a changed one is fetched again the next time
 * it is opened. The hash is a PATH segment, not a query string: devcon.org's
 * CDN keys its cache on the path alone, so a query would be handed the stale
 * image and the worker would then keep it for another 30 days. The card route
 * accepts the segment as a cache buster and keys its own store by id, so no
 * extra render happens (devcon src/pages/api/social/schedule/[...id].tsx).
 *
 * The last segment is a filename: browsers name a saved or dragged image
 * after it, and the old trailing slash gave them nothing ("download.jpeg",
 * or the host name in Safari). Session ids are title slugs, so the file is
 * named after the session.
 *
 * Pure module, checked in `pnpm data:test`.
 */

/** What the card shows; the same fields the renderer hashes on its side. */
export interface CardSession {
  id: string;
  title: string;
  type?: string;
  track: string;
  /** Unix seconds, as the materialised sessions carry them. */
  start: number;
  end: number;
  room?: { id: string; name: string };
  speakers: ReadonlyArray<{ id: string; name: string; avatar?: string }>;
}

/** Short digest of the card's inputs; the same on every device for the same bundle. */
export function sessionCardHash(session: CardSession): string {
  const input = JSON.stringify([
    session.title,
    session.type ?? "",
    session.track,
    session.start,
    session.end,
    session.room ? [session.room.id, session.room.name] : null,
    session.speakers.map((speaker) => [speaker.id, speaker.name, speaker.avatar ?? ""]),
  ]);
  // FNV-1a, 32 bits: a collision only means one card stays stale until its
  // next change, and the token stays short enough for a URL.
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** `<origin>/api/social/schedule/<id>/<hash>/<id>.jpg` */
export function sessionCardUrl(origin: string, session: CardSession): string {
  const id = encodeURIComponent(session.id);
  return `${origin}/api/social/schedule/${id}/${sessionCardHash(session)}/${id}.jpg`;
}
