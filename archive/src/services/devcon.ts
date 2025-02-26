import { CONFIG } from "@/utils/config";

export async function getEvents() {
  console.log("getEvents");
  const response = await fetch(`${CONFIG.API_BASE_URL}/events`);
  const events = await response.json();
  return events.data;
}

export async function getEvent(id: string) {
  console.log("getEvent", id);
  const response = await fetch(`${CONFIG.API_BASE_URL}/events/${id}`);
  const event = await response.json();
  return event.data;
}

export async function getFeaturedSessions() {
  const featuredSessions = [
    "publishers-denial-of-digital-ownership-vs-decentralization",
    "opening-ceremonies-aya",
    "opening-ceremonies-vitalik",
    "closing-ceremonies-kurt-opsahl",
  ];

  return Promise.all(
    featuredSessions.map((session) => getSessionBySlug(session, "devcon-6"))
  );
}

export async function getSessionBySlug(slug: string, eventId: string) {
  console.log("getSessionBySlug", slug, eventId);
  const response = await fetch(`${CONFIG.API_BASE_URL}/sessions/${slug}`);
  const session = await response.json();

  if (session?.data?.eventId === eventId) {
    return session.data;
  }
}
