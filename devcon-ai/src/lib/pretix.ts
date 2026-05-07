/**
 * Thin Pretix client — only what we need to check whether an email has a
 * paid Devcon 8 ticket. Mirrors the pattern from devconnect/src/pages/api/coupons/pretix.ts.
 */

const PRETIX_BASE_URL =
  process.env.PRETIX_BASE_URL || "https://mum.ticketh.xyz";
const ORGANIZER_SLUG = process.env.PRETIX_ORGANIZER || "devcon";
const EVENT_SLUG = process.env.PRETIX_EVENT || "8";

interface CacheEntry {
  expiresAt: number;
  hasTicket: boolean;
}

const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

export async function emailHasPaidTicket(email: string): Promise<boolean> {
  const apiKey = process.env.PRETIX_API_KEY;
  if (!apiKey) {
    throw new Error("PRETIX_API_KEY is not set");
  }

  const lowerEmail = email.toLowerCase().trim();

  const cached = cache.get(lowerEmail);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.hasTicket;
  }

  const params = new URLSearchParams({ status: "p", search: lowerEmail });
  const url = `${PRETIX_BASE_URL}/api/v1/organizers/${ORGANIZER_SLUG}/events/${EVENT_SLUG}/orders/?${params}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Pretix orders search failed ${response.status}: ${text}`);
  }

  const data = (await response.json()) as { results?: any[] };
  const orders = data.results ?? [];

  // Pretix `search` is fuzzy. Filter to exact email matches on either
  // the order buyer (order.email) or any position attendee (position.attendee_email).
  const hasTicket = orders.some((order) => {
    if (order.email?.toLowerCase() === lowerEmail) return true;
    return order.positions?.some(
      (p: any) => p.attendee_email?.toLowerCase() === lowerEmail,
    );
  });

  cache.set(lowerEmail, { hasTicket, expiresAt: Date.now() + TTL_MS });
  return hasTicket;
}
