import type { AreaId } from "./areas";
import type { CategoryId } from "./categories";

/**
 * What people type that the place names do not say: each entry's terms
 * bring up the listed categories and areas in Search, on top of the name
 * and category-label matches (Scott, 2026-10-26). A term matches when the
 * query is it, starts it (three letters or more) or contains it whole.
 * Keep the terms lower-case; a multi-word term matches the spaced form.
 */
export type SearchTerms = { terms: readonly string[]; categories?: readonly CategoryId[]; areas?: readonly AreaId[] };

export const SEARCH_TERMS: readonly SearchTerms[] = [
  // Wayfinding and services
  { terms: ["exit", "entrance", "entry"], areas: ["escalator", "stairs"] },
  { terms: ["lift"], areas: ["elevator"] },
  { terms: ["toilet", "restroom", "bathroom", "wc", "loo"], categories: ["toilets"] },
  { terms: ["info", "information", "help"], areas: ["help-desk"] },
  { terms: ["lost", "lost and found", "cloakroom", "coat", "bag", "luggage"], areas: ["cloak-room-lost-and-found"] },
  { terms: ["check in", "check-in", "ticket", "wristband", "register", "sign in"], areas: ["registration"] },
  { terms: ["badge", "lanyard"], areas: ["badge-pickup"] },
  { terms: ["locker"], areas: ["storage-room"] },
  { terms: ["baby", "nursing", "breastfeeding", "changing room", "parents"], areas: ["baby-care-room"] },
  // Food and drink
  { terms: ["snack", "meal", "lunch", "dinner", "eat", "hungry", "food court", "canteen", "restaurant"], categories: ["food"] },
  { terms: ["café", "cafe", "water", "drink", "drinks"], areas: ["tea-coffee"] },
  // Stages and programme
  { terms: ["stage", "talk", "talks", "keynote", "ceremony", "opening", "closing"], categories: ["stages"] },
  { terms: ["main stage"], areas: ["lotus-stage"] },
  { terms: ["cls", "open tech summit", "community led", "community-led"], areas: ["cls-stage"] },
  { terms: ["music", "concert", "dj", "party"], areas: ["music-stage"] },
  { terms: ["class", "session", "hands-on"], areas: ["workshop"] },
  // Community and supporters
  { terms: ["booth", "booths", "sponsor", "sponsors", "exhibitor", "expo"], categories: ["supporters"] },
  // Work and rest
  { terms: ["meeting", "meeting room", "room", "rooms"], categories: ["suites"] },
  { terms: ["work", "laptop", "desk", "cowork", "coworking", "quiet"], categories: ["cowork"] },
  { terms: ["nap", "rest", "chill", "relax", "sleep", "recharge"], areas: ["decompression-zone"] },
  { terms: ["discussion", "chat", "debate"], areas: ["blue-discussion-corner", "pink-discussion-corner"] },
  // Fun and culture
  { terms: ["merch", "merchandise", "t-shirt", "shirt", "goodies"], areas: ["swag-station"] },
  { terms: ["game", "games", "play", "arcade", "console"], areas: ["game-zone"] },
  { terms: ["art", "gallery", "exhibition"], areas: ["art-gallery"] },
  { terms: ["poster", "posters"], areas: ["poster-display", "poster-printing-station"] },
  { terms: ["print", "printing", "printer"], areas: ["poster-printing-station"] },
  { terms: ["press", "media", "recording", "interview booth"], areas: ["content-corner"] },
  { terms: ["hardware", "maker", "makers", "soldering"], areas: ["open-hardware-zone"] },
  // Rooms
  { terms: ["green room", "backstage", "speaker room"], areas: ["speakers-lounge"] },
  { terms: ["podcast", "filming"], areas: ["interview-room"] },
];
