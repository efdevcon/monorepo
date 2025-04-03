import { CONFIG } from "@/utils/config";

export async function getEvents() {
  console.log("getEvents");
  const response = await fetch(`${CONFIG.API_BASE_URL}/events`);
  const events = await response.json();
  return events.data.sort((a: any, b: any) => b.edition - a.edition);
}

export async function getEvent(id: string) {
  console.log("getEvent", id);
  const response = await fetch(`${CONFIG.API_BASE_URL}/events/${id}`);
  const event = await response.json();
  return event.data;
}

export async function getFeaturedSessions(
  type: "most-popular" | "devcon-6" | "devcon-7" | "devcon-7-opening"
) {
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

  return Promise.all(
    featuredSessions.map((session) => getSessionBySlug(session))
  );
}

export async function getSessionBySlug(slug: string, eventId?: string) {
  const response = await fetch(`${CONFIG.API_BASE_URL}/sessions/${slug}`);
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
