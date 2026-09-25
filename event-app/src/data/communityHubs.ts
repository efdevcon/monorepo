/**
 * Devcon 8 Community Hubs and the dSheets each hub publishes its programme in.
 *
 * The sheets are the same ones devcon-api reads to put hub sessions on the
 * schedule (see docs/community-hubs.md); this page embeds them directly, the
 * way the Devconnect 2025 site did. Only view or comment links belong here:
 * whoever can open this page can open the link.
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
  /** dSheets share link (https://sheets.fileverse.io/sheet/<id>#k=<key>); unset until the hub shares one. */
  sheetUrl?: string;
  /** Logo path under /public when it isn't the default `<id>.svg` (see communityHubLogo). */
  logo?: string;
  /** Stacked lockup (mark over wordmark) for the session details banner; the mark is used when unset. */
  logoStacked?: string;
}

export const COMMUNITY_HUBS: CommunityHub[] = [
  {
    id: "privacy",
    name: "Privacy Hub",
    description: "Building, exploring and using privacy on Ethereum, onchain and off.",
    color: "#E5D4F7",
    sheetUrl: "https://sheets.fileverse.io/sheet/32gtmX5BW39G57rgDkrm4u#k=rbIDyYhIPVgAOSncg7UxQbtVpkdQJQsVS3mTCoYPUSw",
  },
  { id: "security", name: "Security Hub", description: "Closing the gap between Ethereum's security research and practice.", color: "#F7D4D4" },
  { id: "eip", name: "EIP Hub", description: "EIPs, ERC standards, protocol upgrades and standards adoption.", color: "#D4EBF7" },
  { id: "p2p-networking", name: "P2P Networking Hub", description: "The people who build and maintain Ethereum's networking layer.", color: "#F7E6D4" },
  { id: "resilient-networks", name: "Resilient Networks Hub", description: "Where Ethereum security meets P2P networking.", color: "#F7D4E6" },
  { id: "token-rights", name: "Token Rights Hub", description: "Ownership and voting rights across tokens, NFTs and RWAs.", color: "#F7F1D4" },
  {
    id: "open-source",
    name: "Open Source Hub",
    description: "Hands-on space that turns attendees into open-source contributors.",
    color: "#D4F7E0",
    sheetUrl: "https://sheets.fileverse.io/sheet/s3TVTVbiTgppsbK3YvHM8D#k=GUkKdz7R7-u__IcatV7vI2cNudXwFdFs16u-M4bRFZ4",
    // TEST (2026-09-25): gem-style artwork trial; revert to the placeholder svg or replace with the final logo.
    logo: "/community-hubs/logos/open-source-test.png",
    // TEST (2026-09-25): stacked-lockup trial for the details banner (the art reads "Agentic Hub").
    logoStacked: "/community-hubs/logos/open-source-stacked-test.png",
  },
  { id: "prediction-markets", name: "Prediction Markets Hub", description: "Prediction-market builders, researchers, traders and governance contributors.", color: "#F7DDD4" },
  { id: "world-of-desci", name: "World of DeSci Hub", description: "Where open science meets Ethereum.", color: "#D4F7F4" },
  {
    id: "onchain-art",
    name: "Onchain Art Hub",
    description: "Devcon's artist-focused hub for musicians, painters, designers and digital artists.",
    color: "#F7D4F7",
    sheetUrl: "https://sheets.fileverse.io/sheet/pSKtQGbujNeNKQnSYNuUmu#k=-YWpL1S3KGZGV9g7-kPXCZqvFgryRqFIJDuGcRWwFrk",
  },
  { id: "agentic", name: "Agentic Hub", description: "AI agents paying, trading and negotiating on Ethereum.", color: "#D4E0F7" },
  { id: "fragmentation", name: "Fragmentation Hub", description: "Mapping Ethereum's technical and social fragmentation.", color: "#E0F7D4" },
  { id: "zuzone", name: "ZuZone Hub", description: "Founders of Zuzalu-aligned permanent hubs and pop-up cities.", color: "#DAD4F7" },
  { id: "india", name: "India Hub", description: "A builder's corner that teaches Ethereum's core properties by building.", color: "#F7E0D4" },
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

/** First hub that has a sheet, the default when the URL names none. */
export function defaultCommunityHub(): CommunityHub {
  return COMMUNITY_HUBS.find((hub) => hub.sheetUrl) ?? COMMUNITY_HUBS[0];
}

/**
 * The share link in dSheets' embed mode (`?embed=1` before the `#k=` key):
 * no sign-in button or app menu, just the sheet.
 */
export function communityHubEmbedUrl(sheetUrl: string): string {
  const url = new URL(sheetUrl);
  url.searchParams.set("embed", "1");
  return url.toString();
}
