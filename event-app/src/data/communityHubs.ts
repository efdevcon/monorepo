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
  /** Lockup (mark + wordmark) for the session details banner when it isn't the default `<id>-lockup.svg` (see communityHubLockup). */
  logoStacked?: string;
}

/**
 * Official hub names from the Community Hubs coordinator (2026-10-07), plus
 * three community-run spaces on the same sheets (Open Hardware Zone, Game
 * Zone, Music Stage), alphabetical. Hub blurbs are condensed from the forum
 * announcement (forum.devcon.org/t/announcing-the-devcon-8-india-community-hubs/9191; Scott, 2026-10-27).
 */
export const COMMUNITY_HUBS: CommunityHub[] = [
  { id: "agentic", name: "Agentic Hub", description: "The open agent stack: ERC-8004, x402, account abstraction and agent security, with live agent competitions.", color: "#C2FFDD" },
  { id: "aggregation", name: "Aggregation Hub", description: "Mapping Ethereum's technical and social fragmentation, 70+ live rollups included, and making the case for coordination without uniformity.", color: "#EDD6FF" },
  { id: "desci", name: "DeSci Hub", description: "Four days of decentralised science: scientists, builders and funders co-creating tools that treat research as a public good.", color: "#D4F7F4" },
  { id: "eip", name: "EIP Hub", description: "EIPs, ERC standards and protocol upgrades: technical discussions, office hours and how standards get adopted.", color: "#D4EBF7" },
  { id: "game-zone", name: "Game Zone", description: "Community-run games and play.", color: "#FFD6EC" },
  {
    id: "india",
    name: "India Hub",
    description: "A four-day builders' space: each day teaches one core Ethereum property, from censorship resistance to privacy, by building.",
    color: "#FFE7D1",
    // The hub delivered PNGs only (no vector artwork), 400px mark and 800px lockup.
    logo: "/community-hubs/logos/india.png",
    logoStacked: "/community-hubs/logos/india-lockup.png",
  },
  { id: "legal-governance", name: "Legal & Governance Hub", description: "Ownership, access, cashflow and voting rights across tokens, NFTs and RWAs, with India's legal-tech and digital-rights communities.", color: "#B9EFFF" },
  { id: "music-stage", name: "Music Stage", description: "Live sets, DJs and Open Source Orchestra jams anyone can join.", color: "#FFF0A8" },
  {
    id: "onchain-art",
    name: "Onchain Art Hub",
    description: "Musicians, painters, designers and digital artists showing how Ethereum relates to their work.",
    color: "#F7D4D4",
  },
  { id: "open-hardware-zone", name: "Open Hardware Zone", description: "Open-source hardware showcases and hands-on maker workshops.", color: "#E2E8F0" },
  { id: "open-source", name: "Open Source Hub", description: "Turning attendees into open-source contributors: leave with a merged PR, a funding roadmap or a maintainer partnership.", color: "#DDFDEC" },
  { id: "p2p-networking", name: "P2P Networking Hub", description: "A vendor-neutral space for builders of Ethereum's networking layer: workshops, protocol teardowns and open debugging on libp2p and devp2p.", color: "#A8FFD5" },
  { id: "prediction-markets", name: "Prediction Markets Hub", description: "Builders, researchers, traders and governance contributors on liquidity, market design, resolution and futarchy.", color: "#F5FFDB" },
  {
    id: "privacy",
    name: "Privacy Hub",
    description: "Privacy on and around Ethereum, including the offchain layers (RPCs, wallets, indexers) that decide whether onchain privacy holds.",
    color: "#FFE8E5",
  },
  { id: "resilient-networking", name: "Resilient Networking Hub", description: "How information leaks across communication layers, even in well-designed apps, and how to find, measure and mitigate it.", color: "#FFF4E0" },
  { id: "security", name: "Security Hub", description: "Security at the centre of Ethereum's credibility, after more than $1 billion lost to hacks in the first half of 2026.", color: "#E9E5FF" },
  { id: "zuzone", name: "Zuzone Hub", description: "Founders of Zuzalu-aligned permanent hubs and pop-up cities sharing experience and long-term governance experiments.", color: "#DEEDE5" },
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
 * Cache-bust key for the logo files. The service worker keeps images
 * cache-first for 30 days under their URL, so a device that warmed the old
 * placeholders would keep showing them for a month after the artwork changed
 * under the same file name. Bump when a logo file changes in place.
 */
const LOGO_VERSION = "2026-10-15";
const versioned = (path: string) => `${path}?v=${LOGO_VERSION}`;

/**
 * The hub's mark (square logo), served from /public: the hubs' own artwork
 * since 2026-10-15 (`<id>.svg`, run through svgo; India sent PNGs). Shown as
 * the gem on cards, in the timeline and the filter sheet.
 */
export function communityHubLogo(hub: CommunityHub): string {
  return versioned(hub.logo ?? `/community-hubs/logos/${hub.id}.svg`);
}

/**
 * The hub's lockup (mark + wordmark, 16:9 or stacked), the session details
 * banner. Every hub has one at `<id>-lockup.svg` unless `logoStacked` says
 * otherwise; the banner sizes it with object-contain, so the aspect is free.
 */
export function communityHubLockup(hub: CommunityHub): string {
  return versioned(hub.logoStacked ?? `/community-hubs/logos/${hub.id}-lockup.svg`);
}



