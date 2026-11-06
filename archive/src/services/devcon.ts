import { CONFIG } from "@/utils/config";
import { isDevconEdition } from "@/utils/editions";

export async function getEvents() {
  console.log("getEvents");
  const response = await fetch(`${CONFIG.API_BASE_URL}/events`);
  const events = await response.json();
  // The API also lists its test events and a stray "0" record (title "0", no
  // sessions); the archive shows the Devcon editions and Devconnect only.
  return events.data
    .filter((e: any) => isDevconEdition(e) || e.id === "devconnect-arg")
    .sort((a: any, b: any) => b.edition - a.edition);
}

export async function getEvent(id: string) {
  console.log("getEvent", id);
  const response = await fetch(`${CONFIG.API_BASE_URL}/events/${id}`);
  const event = await response.json();
  return event.data;
}

export async function getSessions(size: number = 20, from: number = 0) {
  console.log("getSessions", size, from);
  // Recorded sessions only: Devcon 8 talks go up as their videos are published.
  const response = await fetch(
    `${CONFIG.API_BASE_URL}/sessions?size=${size}&from=${from}&video=true`
  );

  const body = await response.json();
  if (!body.data) return [];

  return body.data.items;
}

/**
 * The sessions the programme team marked featured in Pretalx (keynotes),
 * once recorded, in schedule order. The API filters on featured and video;
 * the filter here repeats it for an API build that predates those params.
 */
export async function getRecordedFeaturedSessions(eventId: string) {
  const response = await fetch(
    `${CONFIG.API_BASE_URL}/sessions?event=${eventId}&featured=true&video=true&size=1000&sort=slot_start&order=asc`
  );
  const body = await response.json();
  const items: any[] = body?.data?.items ?? [];
  return items.filter((s) => s.featured === true && s.sources_youtubeId);
}

/**
 * Devcon 8 opening: the Main Stage (Lotus) block of Tuesday 3 November, 10:00
 * to 12:00 Mumbai time, recorded sessions in schedule order. The API filters
 * on room and video; the window is applied here (slot_start is a millisecond
 * timestamp).
 */
const DEVCON8_OPENING = {
  room: "main-stage-lotus",
  from: Date.parse("2026-11-03T10:00:00+05:30"),
  to: Date.parse("2026-11-03T12:00:00+05:30"),
};

export async function getRecordedOpeningSessions() {
  const { room, from, to } = DEVCON8_OPENING;
  const response = await fetch(
    `${CONFIG.API_BASE_URL}/sessions?event=devcon8&room=${room}&video=true&size=1000&sort=slot_start&order=asc`
  );
  const body = await response.json();
  const items: any[] = body?.data?.items ?? [];
  return items.filter(
    (s) =>
      s.sources_youtubeId &&
      s.slot_roomId === room &&
      typeof s.slot_start === "number" &&
      s.slot_start >= from &&
      s.slot_start < to
  );
}

/**
 * Devcon 8 hero picks, each with its own photo in
 * public/images/featured/devcon8/<slug>.jpg (PageHero.heroImage).
 */
const DEVCON8_PICKS = [
  "the-open-secure-and-verifiable-half-to-a-brighter-future", // opening keynote
  "post-quantum-transition", // post-quantum keynote
  "civic-ai-for-self-governing-communities", // civic AI talk
];

export async function getDevcon8Picks() {
  const sessions = await Promise.all(
    DEVCON8_PICKS.map((slug) => getSessionBySlug(slug, "devcon8"))
  );
  return sessions.filter((s) => s && s.sources_youtubeId);
}

export type FeaturedListType =
  | "most-popular"
  | "devcon-6"
  | "devcon-7"
  | "devcon-7-opening"
  | "devcon-7-picks"
  | "devcon-8"
  | "devcon-8-opening"
  | "devcon-8-picks";

export async function getFeaturedSessions(type: FeaturedListType) {
  if (type === "devcon-8") return getRecordedFeaturedSessions("devcon8");
  if (type === "devcon-8-opening") return getRecordedOpeningSessions();
  if (type === "devcon-8-picks") return getDevcon8Picks();

  let featuredSessions: string[] = [];

  if (type === "most-popular") {
    featuredSessions = [
      "keynote-ethereum-in-30-minutes",
      "introduction-to-snarks",
      "what-to-know-about-zero-knowledge",
      "opening-ceremonies-vitalik",
      "why-and-how-to-run-a-node-no-eth-required",
      "account-abstraction-panel",
      "ethereum-in-25-minutes",
      "mev-for-the-next-billion-its-time-to-get-serious",
      "dai-stablecoin",
      "cryptoeconomics-in-30-minutes",
    ];
  }

  if (type === "devcon-6") {
    featuredSessions = [
      "publishers-denial-of-digital-ownership-vs-decentralization",
      "opening-ceremonies-aya",
      "opening-ceremonies-vitalik",
      "closing-ceremonies-kurt-opsahl",
    ];
  }

  if (type === "devcon-7") {
    featuredSessions = [
      "keynote-this-year-in-ethereum",
      "keynote-redefining-boundaries-in-the-infinite-garden",
      "keynote-ethereum-in-30-minutes",
      "keynote-infinite-diversity-in-infinite-combinations",
      "keynote-programmable-cryptography-and-ethereum",
      "keynote-title-redacted",
      "keynote-the-next-10-years-of-web3-in-africa",
      "keynote-making-sense-of-stablecoins",
      "keynote-the-real-state-of-l2s",
      "keynote-the-universal-cryptographic-adapter",
      "keynote-unifying-ethereum-through-intents-and-erc-7683",
      "keynote-make-ethereum-cypherpunk-again-why-we-need-privacy",
      "keynote-nomic-foundations-vision-for-ethereums-tooling-ecosystem",
      "keynote-glass-houses-and-tornados",
      "keynote-how-to-properly-open-source-software-lessons-learned-from-the-linux-foundation",
      "keynote-lessons-learned-from-tor",
      "keynote-world-politics-world-building",
    ].sort(() => Math.random() - 0.5);
  }

  if (type === "devcon-7-opening") {
    featuredSessions = [
      "opening-ceremony",
      "keynote-this-year-in-ethereum",
      "keynote-redefining-boundaries-in-the-infinite-garden",
      "keynote-ethereum-in-30-minutes",
      "devcon-sea-overview",
    ];
  }

  if (type === "devcon-7-picks") {
    featuredSessions = [
      "keynote-ethereum-in-30-minutes",
      "keynote-redefining-boundaries-in-the-infinite-garden",
      "keynote-lessons-learned-from-tor",
      "keynote-world-politics-world-building",
    ];
  }

  return Promise.all(
    featuredSessions.map((session) => getSessionBySlug(session))
  );
}

export async function getSessionBySlug(slug: string, eventId?: string) {
  // Session ids (slugified titles) are not unique across events, and the
  // API's bare-id lookup is last-event-wins — a test-event clone of a
  // devcon-7 talk once shadowed the original and 404'd its archive page.
  // Passing ?event= makes the API resolve within the right event; the
  // eventId re-check below stays as belt-and-braces for older API deploys
  // that ignore the param.
  const query = eventId ? `?event=${encodeURIComponent(eventId)}` : "";
  const response = await fetch(
    `${CONFIG.API_BASE_URL}/sessions/${slug}${query}`
  );
  const session = await response.json();

  if (!eventId) return session.data;

  if (session?.data?.eventId === eventId) {
    return session.data;
  }
}

export async function getRelatedSessions(sessionId: string) {
  const response = await fetch(
    `${CONFIG.API_BASE_URL}/sessions/${sessionId}/related`
  );

  const relatedSessions = await response.json();
  return relatedSessions.data;
}
