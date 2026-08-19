/**
 * Track visual system (Figma "Dev Handoff" → Track Selectors 4962:11002).
 *
 * Every track resolves to a Devcon 8 theme: a pastel color (drives the card
 * rail, badges, filter chips, timeline blocks and detail banner) plus a "gem"
 * artwork. Devcon 7 test data uses older track names, so an alias table maps
 * them onto the nearest DC8 theme — presentation-only, the session data is
 * never touched. Unknown tracks hash deterministically into the 9 canonical
 * themes so future events still look designed.
 */

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
  /** Community-led session ("[CLS] …" tracks). */
  isCLS?: boolean;
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

/** Community-led sessions share one lavender theme (no gem artwork). */
export const CLS_THEME: TrackTheme = {
  name: "Community-led Session",
  badge: "CLS",
  color: "#e9e5f6",
  gem: null,
  isCLS: true,
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

export function getTrackTheme(track: string | undefined): TrackTheme {
  const raw = track?.trim();
  if (!raw) return DEVCON_THEME;
  if (raw.startsWith("[CLS]")) return CLS_THEME;

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
export function trackBadgeLabel(track: string | undefined): string {
  const raw = track?.trim();
  if (!raw) return DEVCON_THEME.badge;
  if (raw.startsWith("[CLS]")) return CLS_THEME.badge;

  const key = normalizeTrackKey(raw);
  const theme = byName.get(key) ?? aliasByKey.get(key);
  if (theme) return theme.badge;
  if (key === "entertainment") return DEVCON_THEME.badge;
  return raw;
}
