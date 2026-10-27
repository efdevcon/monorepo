/**
 * Devcon 8 community-led groups (CLS): Open Tech Summit, EPF, the Academic
 * track and the others. The programme team marks their sessions in Pretalx
 * with a "[CLS] - <name>" track; that string is theirs and must not be
 * renamed upstream. In the app a group is shown like a Community Hub (its
 * own name, badge and pastel; a logo only where one exists) and filters
 * beside the hubs in the Community programme. An unknown "[CLS]" track
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
  /** Mark (square logo) under /public, when the group has one. */
  logo?: string;
  /** Lockup for the session details banner, when the group has one. */
  lockup?: string;
  description?: string;
}

const CLS_MARKER = /^\s*\[CLS\]/;

/** Colour of a group the registry does not know: the lavender CLS used to share. */
export const COMMUNITY_LED_FALLBACK_COLOR = "#e9e5f6";

/** Pastels of their own, apart from the nine track colours and the hubs' (data:test enforces it). */
export const COMMUNITY_LED_GROUPS: CommunityLedGroup[] = [
  { id: "ots", track: "[CLS] - OTS", name: "Open Tech Summit", badge: "OTS", color: "#d9f2ff" },
  { id: "epf", track: "[CLS] - EPF", name: "EPF", badge: "EPF", color: "#ffe3b3" },
  { id: "academic", track: "[CLS] - Academic", name: "Academic Track", badge: "Academic", color: "#e4dcff" },
  { id: "ethindia", track: "[CLS] - ETHIndia", name: "ETHIndia", badge: "ETHIndia", color: "#ffd9c2" },
  {
    id: "buidlguidl",
    track: "[CLS] - Builder Enablement & BuidlGuidl",
    name: "Builder Enablement & BuidlGuidl",
    badge: "BuidlGuidl",
    color: "#d6f5c9",
  },
  { id: "defi-101", track: "[CLS] - Defi 101", name: "DeFi 101", badge: "DeFi 101", color: "#c9f0e6" },
  { id: "career-fair", track: "[CLS] - Career Fair", name: "Career Fair", badge: "Career Fair", color: "#fde9b8" },
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

/**
 * The group behind a "[CLS]" track: the registry entry for a known track, a
 * synthesised one (name, badge and id from the track, the fallback colour)
 * for an unknown track, undefined for any other track.
 */
export function communityLedGroup(track: string | undefined): CommunityLedGroup | undefined {
  if (!track || !CLS_MARKER.test(track)) return undefined;
  const trimmed = track.trim();
  const known = byTrack.get(trimmed);
  if (known) return known;
  const name = clsTrackName(trimmed) || "Community-led";
  return { id: slug(name) || "community-led", track: trimmed, name, badge: name, color: COMMUNITY_LED_FALLBACK_COLOR };
}
