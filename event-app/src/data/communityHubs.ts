/**
 * Devcon 8 Community Hubs, as the app shows them. Their programme reaches the
 * app through devcon-api, which reads each hub's dSheet (see
 * docs/community-hubs.md); the sheets themselves are never shown here, so no
 * sheet links live in the app.
 *
 * Each hub has a colour of its own (a pastel, like the track palette) used for
 * its badge and cards in the schedule; the same hue, darker, heads the hub's
 * sheet template. Keep in step with devcon-api/src/utils/community-hubs.ts.
 */
export interface CommunityHub {
  /** Slug, also the id in devcon-api (`community-hub-<id>` room). */
  id: string;
  name: string;
  description: string;
  /** Pastel surface colour for badges and timeline cards. */
  color: string;
  /** Logo path under /public when it isn't the default `<id>.svg` (see communityHubLogo). */
  logo?: string;
  /** Stacked lockup (mark over wordmark) for the session details banner; the mark is used when unset. */
  logoStacked?: string;
}

/** Official names from the Community Hubs coordinator (2026-10-07), alphabetical. */
export const COMMUNITY_HUBS: CommunityHub[] = [
  { id: "agentic", name: "Agentic Hub", description: "AI agents paying, trading and negotiating on Ethereum.", color: "#C2FFDD" },
  { id: "aggregation", name: "Aggregation Hub", description: "Bringing Ethereum's fragmented chains, apps and communities back together.", color: "#EDD6FF" },
  { id: "desci", name: "DeSci Hub", description: "Where open science meets Ethereum.", color: "#D4F7F4" },
  { id: "eip", name: "EIP Hub", description: "EIPs, ERC standards, protocol upgrades and standards adoption.", color: "#D4EBF7" },
  { id: "india", name: "India Hub", description: "A builder's corner that teaches Ethereum's core properties by building.", color: "#FFE7D1" },
  { id: "legal-governance", name: "Legal & Governance Hub", description: "Legal and governance questions around tokens, protocols and onchain organisations.", color: "#B9EFFF" },
  {
    id: "onchain-art",
    name: "Onchain Art Hub",
    description: "Devcon's artist-focused hub for musicians, painters, designers and digital artists.",
    color: "#F7D4D4",
  },
  {
    id: "open-source",
    name: "Open Source Hub",
    description: "Hands-on space that turns attendees into open-source contributors.",
    color: "#DDFDEC",
    // TEST (2026-09-25): gem-style artwork trial; revert to the placeholder svg or replace with the final logo.
    logo: "/community-hubs/logos/open-source-test.png",
    // TEST (2026-09-25): stacked-lockup trial for the details banner (the art reads "Agentic Hub").
    logoStacked: "/community-hubs/logos/open-source-stacked-test.png",
  },
  { id: "p2p-networking", name: "P2P Networking Hub", description: "The people who build and maintain Ethereum's networking layer.", color: "#A8FFD5" },
  { id: "prediction-markets", name: "Prediction Markets Hub", description: "Prediction-market builders, researchers, traders and governance contributors.", color: "#F5FFDB" },
  {
    id: "privacy",
    name: "Privacy Hub",
    description: "Building, exploring and using privacy on Ethereum, onchain and off.",
    color: "#FFE8E5",
  },
  { id: "resilient-networking", name: "Resilient Networking Hub", description: "Where Ethereum security meets P2P networking.", color: "#FFF4E0" },
  { id: "security", name: "Security Hub", description: "Closing the gap between Ethereum's security research and practice.", color: "#E9E5FF" },
  { id: "zuzone", name: "Zuzone Hub", description: "Founders of Zuzalu-aligned permanent hubs and pop-up cities.", color: "#DEEDE5" },
];

/** Hub rooms in the API bundle are `community-hub-<hub id>`. */
export const COMMUNITY_HUB_ROOM_PREFIX = "community-hub-";

export function communityHubIdFromRoom(roomId: string | undefined): string | undefined {
  return roomId?.startsWith(COMMUNITY_HUB_ROOM_PREFIX) ? roomId.slice(COMMUNITY_HUB_ROOM_PREFIX.length) : undefined;
}

/** A session from a hub's sheet (no recording, no Q&A, no map footprint). */
export function isCommunityHubSession(session: { room?: { id: string } }): boolean {
  return communityHubIdFromRoom(session.room?.id) !== undefined;
}

/** A hub's name ("Privacy Hub"): hub sessions carry it as their first tag. */
export function isCommunityHubName(name: string): boolean {
  return COMMUNITY_HUBS.some((hub) => hub.name === name);
}

/**
 * "Privacy Hub" → "Privacy" where space is tight (badges, cards, the timeline's
 * room column, reminder lines). Details pages keep the full name. Non-hub
 * names pass through unchanged.
 */
export function shortCommunityHubName(name: string): string {
  return isCommunityHubName(name) ? name.replace(/\s+Hub$/, "") : name;
}

/** A hub session's topics: its tags minus the hub's own name (the sheet's Topic column). */
export function communityHubTopics(session: { tags?: string[] }): string[] {
  return (session.tags ?? []).map((t) => t.trim()).filter((t) => t && !isCommunityHubName(t));
}

export function findCommunityHub(id: string | undefined): CommunityHub | undefined {
  return id ? COMMUNITY_HUBS.find((hub) => hub.id === id) : undefined;
}

/** The hub behind a session's room, if it is a hub room. */
export function communityHubForRoom(roomId: string | undefined): CommunityHub | undefined {
  return findCommunityHub(communityHubIdFromRoom(roomId));
}

/**
 * The hub's logo, served from /public. Placeholders (initials on the hub's
 * colour) ship under this path until the hubs send their own artwork; replace
 * the file, keep the name.
 */
export function communityHubLogo(hub: CommunityHub): string {
  return hub.logo ?? `/community-hubs/logos/${hub.id}.svg`;
}


