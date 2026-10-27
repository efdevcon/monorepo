/**
 * Track visual system (Figma "Dev Handoff" → Track Selectors 4962:11002).
 *
 * Every track resolves to a Devcon 8 theme: a pastel color (drives the card
 * rail, badges, filter chips, timeline blocks and detail banner) plus a "gem"
 * artwork. Community sessions resolve to their community instead: a hub by
 * the session's room, a community-led group ("[CLS] - …" tracks) by the
 * track, each with its own name, badge and pastel (`src/data/communityHubs.ts`,
 * `src/data/communityLed.ts`). Devcon 7 test data uses older track names, so
 * an alias table maps them onto the nearest DC8 theme — presentation-only,
 * the session data is never touched. Unknown tracks hash deterministically
 * into the 9 canonical themes so future events still look designed.
 */

import { communityHubForRoom, communityHubLockup, communityHubLogo, shortCommunityHubName } from "@/data/communityHubs";
import { communityLedGroup } from "@/data/communityLed";

// Kept here for the callers that always found it in this module.
export { clsTrackName } from "@/data/communityLed";

export interface TrackTheme {
  /** Canonical DC8 display name (used for the detail-banner caption). */
  name: string;
  /** Short uppercase tag label (Figma Track Selectors, e.g. "PROTOCOL"). */
  badge: string;
  /** Pastel background hex. */
  color: string;
  /** Gem artwork path under /public, or null for the neutral/CLS themes. */
  gem: string | null;
  /** DEVCON treatment: white surfaces with a hairline border, no tint. */
  neutral?: boolean;
  /** Community-led session ("[CLS] …" tracks): themed as its group. */
  isCLS?: boolean;
  /** Community Hub session: `gem` is the hub's logo and stands alone in the details banner. */
  isHub?: boolean;
  /** Hub or community-led: the cards' and details' community grammar keys on it. */
  isCommunity?: boolean;
  /** Hub's stacked lockup, shown larger in the details banner in place of `gem`; a hub without one shows `gem` with its name under it. */
  banner?: string;
}

const gem = (file: string) => `/schedule/gems/${file}.webp`;

/** The 9 canonical Devcon 8 tracks, exact colors from Figma Track Selectors. */
export const DC8_TRACKS: TrackTheme[] = [
  { name: "Core Protocol", badge: "Protocol", color: "#f3cafd", gem: gem("core-protocol") },
  { name: "Futures Worth Building", badge: "Futures", color: "#fff3ac", gem: gem("futures-worth-building") },
  { name: "Security", badge: "Security", color: "#e9cba1", gem: gem("security") },
  { name: "Privacy & Consent", badge: "Privacy", color: "#f2f1f4", gem: gem("privacy-consent") },
  { name: "Rights, Freedoms & Governance", badge: "Freedoms", color: "#e9e5f6", gem: gem("rights-freedoms-governance") },
  { name: "Applied Cryptography", badge: "Applied Crypto", color: "#e7f0f9", gem: gem("applied-cryptography") },
  { name: "Permissionless Networks", badge: "Networks", color: "#dde3fe", gem: gem("permissionless-networks") },
  { name: "Users, Builders & Agents", badge: "Users", color: "#ffdfe0", gem: gem("users-builders-agents") },
  { name: "Open & Verifiable Stack", badge: "Stack", color: "#b4fff1", gem: gem("open-verifiable-stack") },
];

/** Sessions without a track (ceremonies etc.): white + hairline treatment. */
export const DEVCON_THEME: TrackTheme = {
  name: "Devcon",
  badge: "Devcon",
  color: "#ffffff",
  gem: "/schedule/devcon8-logomark.svg",
  neutral: true,
};

/**
 * Fold punctuation variants of one track name onto a single lookup key —
 * Pretalx publishes "Rights, Freedoms, and Governance" where the Figma
 * canon says "Rights, Freedoms & Governance" ("A, B, and C" / "A, B and C"
 * / "A, B & C" must all match the same theme).
 */
const normalizeTrackKey = (name: string) =>
  name
    .toLowerCase()
    .replace(/\s*,?\s+and\s+/g, " & ")
    .replace(/\s*&\s*/g, " & ")
    .replace(/\s+/g, " ")
    .trim();

const byName = new Map(DC8_TRACKS.map((t) => [normalizeTrackKey(t.name), t]));

/** Devcon 7 track names → nearest DC8 theme (exact matches hit `byName`). */
const DC7_ALIASES: Record<string, string> = {
  "layer 2": "Permissionless Networks",
  "real world ethereum": "Users, Builders & Agents",
  usability: "Users, Builders & Agents",
  "developer experience": "Open & Verifiable Stack",
  "cypherpunk & privacy": "Privacy & Consent",
  coordination: "Rights, Freedoms & Governance",
  cryptoeconomics: "Futures Worth Building",
  cryptography: "Applied Cryptography",
};

const aliasByKey = new Map(
  Object.entries(DC7_ALIASES).map(([k, v]) => [
    normalizeTrackKey(k),
    byName.get(normalizeTrackKey(v))!,
  ])
);

/** Same stable hash the old palette used, so unknown tracks keep an accent. */
function hashTrack(track: string): number {
  let hash = 0;
  for (let i = 0; i < track.length; i++) {
    hash = (hash * 31 + track.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Community Hub sessions are themed by their hub (its own pastel, its name as
 * the badge), not by the shared "Community Hubs" track. Callers pass the
 * session's room id so the hub can be recognised.
 */
function hubTheme(roomId: string | undefined): TrackTheme | undefined {
  const hub = communityHubForRoom(roomId);
  // Badge drops the trailing "Hub" ("Privacy Hub" → "Privacy"): the pill's
  // tent glyph already says it. Cards and the timeline shorten the room the same way.
  return hub
    ? {
        name: hub.name,
        badge: shortCommunityHubName(hub.name),
        color: hub.color,
        gem: communityHubLogo(hub),
        banner: communityHubLockup(hub) ?? undefined,
        isHub: true,
        isCommunity: true,
      }
    : undefined;
}

/**
 * Community-led sessions are themed by their group (its name, badge and
 * pastel; a logo where one exists), from the "[CLS] - …" track. An unknown
 * group still gets a name and the shared fallback colour.
 */
function communityLedTheme(track: string | undefined): TrackTheme | undefined {
  const group = communityLedGroup(track);
  return group
    ? {
        name: group.name,
        badge: group.badge,
        color: group.color,
        gem: group.logo ?? null,
        banner: group.lockup,
        isCLS: true,
        isCommunity: true,
      }
    : undefined;
}

export function getTrackTheme(track: string | undefined, roomId?: string): TrackTheme {
  const hub = hubTheme(roomId);
  if (hub) return hub;
  const raw = track?.trim();
  if (!raw) return DEVCON_THEME;
  const community = communityLedTheme(raw);
  if (community) return community;

  const key = normalizeTrackKey(raw);
  const exact = byName.get(key);
  if (exact) return exact;

  const alias = aliasByKey.get(key);
  if (alias) return alias;

  // Special-case DC7's "Entertainment": no plausible DC8 home → neutral.
  if (key === "entertainment") return DEVCON_THEME;

  return DC8_TRACKS[hashTrack(raw) % DC8_TRACKS.length];
}

/**
 * Short label for the small uppercase track badge (Figma Track Selectors:
 * "Core Protocol" → PROTOCOL, "Applied Cryptography" → APPLIED CRYPTO, …).
 * DC7 aliases inherit their mapped DC8 theme's label; only tracks that hash
 * into a fallback theme keep their raw name (a themed label would mislead).
 */
export function trackBadgeLabel(track: string | undefined, roomId?: string): string {
  const hub = hubTheme(roomId);
  if (hub) return hub.badge;
  const raw = track?.trim();
  if (!raw) return DEVCON_THEME.badge;
  const group = communityLedGroup(raw);
  if (group) return group.badge;

  const key = normalizeTrackKey(raw);
  const theme = byName.get(key) ?? aliasByKey.get(key);
  if (theme) return theme.badge;
  if (key === "entertainment") return DEVCON_THEME.badge;
  return raw;
}

/**
 * Full track name for the details views (side panel, expanded page, mobile
 * page) — list/timeline cards keep `trackBadgeLabel`. Returns the session's
 * own track name (as the details banner caption already does) so DC7 aliases
 * don't get relabelled with a DC8 name; a community-led session reads as its
 * group's name.
 */
export function trackFullLabel(track: string | undefined, roomId?: string): string {
  const hub = hubTheme(roomId);
  if (hub) return hub.name;
  const raw = track?.trim();
  if (!raw) return DEVCON_THEME.name;
  return communityLedGroup(raw)?.name ?? raw;
}
