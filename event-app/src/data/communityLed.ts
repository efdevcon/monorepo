/**
 * Devcon 8 community-led groups (CLS): Open Tech Summit, EPF, the Academic
 * track and the others. The programme team marks their sessions in Pretalx
 * with a "[CLS] - <name>" track; that string is theirs and must not be
 * renamed upstream. In the app a group is shown like a Community Hub (its
 * own name, badge and pastel; the shared community-led mark as its logo
 * unless it has one of its own) and filters beside the hubs in the
 * Community programme. An unknown "[CLS]" track
 * synthesises an entry from its name, so a new community never breaks the
 * view or falls back to a bare "CLS" badge. Hubs: `src/data/communityHubs.ts`.
 */
export interface CommunityLedGroup {
  /** Slug, the second half of the `cls:<id>` filter key. */
  id: string;
  /** The exact Pretalx track, trimmed. */
  track: string;
  name: string;
  /** Short label for the small uppercase badge on cards. */
  badge: string;
  /** Pastel surface colour for badges, rails and filter chips. */
  color: string;
  /** Mark (square logo) under /public, when the group has one of its own (see logoOf); else COMMUNITY_LED_LOGO. */
  logo?: string;
  /** Full logo for the session details banner, when the group has one (see lockupOf); else the mark with the track under it. */
  lockup?: string;
  description?: string;
}

const CLS_MARKER = /^\s*\[CLS\]/;

/** Colour of a group the registry does not know: the lavender CLS used to share. */
export const COMMUNITY_LED_FALLBACK_COLOR = "#e9e5f6";

/**
 * The mark every community-led group shows unless it brings its own: the
 * CLS icon (Scott, 2026-10-27), on cards, the timeline and the filter chips
 * where the Pretalx tracks show their gems. Precached beside the gems in
 * next.config.ts and listed in APP_IMAGES.
 */
export const COMMUNITY_LED_LOGO = "/schedule/gems/community-led.png";

/** The group's mark: its own logo, else the shared community-led one. */
export function communityLedLogo(group: Pick<CommunityLedGroup, "logo">): string {
  return group.logo ?? COMMUNITY_LED_LOGO;
}

/**
 * The groups' own artwork under /public/community-led/logos, as the groups
 * sent it (2026-10-31): `<id>.svg` the square mark for cards, the timeline and
 * the filter chips, `<id>-lockup.svg` the full logo for the details banner.
 * Warmed for offline through APP_IMAGES like the hubs' logos.
 */
const logoOf = (id: string) => `/community-led/logos/${id}.svg`;
const lockupOf = (id: string) => `/community-led/logos/${id}-lockup.svg`;

/** Pastels of their own, apart from the nine track colours and the hubs' (data:test enforces it). */
export const COMMUNITY_LED_GROUPS: CommunityLedGroup[] = [
  // OTS sent one wordmark and no square mark, so it stands in both slots (Scott, 2026-10-31).
  {
    id: "ots",
    track: "[CLS] - OTS",
    name: "Open Tech Summit",
    badge: "OTS",
    color: "#d9f2ff",
    logo: logoOf("ots"),
    lockup: logoOf("ots"),
  },
  { id: "epf", track: "[CLS] - EPF", name: "EPF", badge: "EPF", color: "#ffe3b3" },
  { id: "academic", track: "[CLS] - Academic", name: "Academic Track", badge: "Academic", color: "#e4dcff" },
  {
    id: "ethindia",
    track: "[CLS] - ETHIndia",
    name: "ETHIndia",
    badge: "ETHIndia",
    color: "#ffd9c2",
    logo: logoOf("ethindia"),
    lockup: lockupOf("ethindia"),
  },
  {
    id: "buidlguidl",
    track: "[CLS] - Builder Enablement & BuidlGuidl",
    name: "Builder Enablement & BuidlGuidl",
    badge: "BuidlGuidl",
    color: "#d6f5c9",
    logo: logoOf("buidlguidl"),
    lockup: lockupOf("buidlguidl"),
  },
  // The "Defi 101" track is the DSS security summit's programme (its sessions
  // are the security panels), so it carries the DSS artwork.
  {
    id: "defi-101",
    track: "[CLS] - Defi 101",
    name: "DeFi 101",
    badge: "DeFi 101",
    color: "#c9f0e6",
    logo: logoOf("defi-101"),
    lockup: lockupOf("defi-101"),
  },
  // The Career Fair is run by dev3pack, whose artwork it carries.
  {
    id: "career-fair",
    track: "[CLS] - Career Fair",
    name: "Career Fair",
    badge: "Career Fair",
    color: "#fde9b8",
    logo: logoOf("career-fair"),
    lockup: lockupOf("career-fair"),
  },
  // The hub talks on the main stages (track "[CLS] - Community Hubs"): one
  // group of their own, never attached to a hub by their title.
  { id: "community-hubs", track: "[CLS] - Community Hubs", name: "Community Hubs", badge: "Hubs", color: "#e0e8ff" },
];

const byTrack = new Map(COMMUNITY_LED_GROUPS.map((g) => [g.track, g]));

/**
 * A community-led session's own name, without the "[CLS]" marker Pretalx
 * carries (the programme team needs it there to tell CLS from the main
 * programme). The marker is followed by a separator in DC8 ("[CLS] - EPF",
 * "[CLS] - OTS"), which goes too: stripping the marker alone left every
 * name starting with a dash.
 */
export function clsTrackName(track: string): string {
  return track.replace(/^\s*\[CLS\]\s*[-–:]?\s*/, "").trim();
}

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Registry ids are the slugs of their track names, so another spelling of a
// known track ("[CLS]: OTS", padding, a different dash) still lands on its entry.
const byId = new Map(COMMUNITY_LED_GROUPS.map((g) => [g.id, g]));

/**
 * The group behind a "[CLS]" track: the registry entry for a known track (by
 * exact track, else by the slug of its name, so a re-spelled track keeps its
 * identity), a synthesised one (name, badge and id from the track, the
 * fallback colour) for an unknown track, undefined for any other track.
 */
export function communityLedGroup(track: string | undefined): CommunityLedGroup | undefined {
  if (!track || !CLS_MARKER.test(track)) return undefined;
  const trimmed = track.trim();
  const known = byTrack.get(trimmed);
  if (known) return known;
  const name = clsTrackName(trimmed) || "Community-led";
  const id = slug(name) || "community-led";
  return byId.get(id) ?? { id, track: trimmed, name, badge: name, color: COMMUNITY_LED_FALLBACK_COLOR };
}
