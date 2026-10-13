/**
 * Matomo events and visit dimensions, the only way the app talks to the
 * tracker besides the page views in `src/app/matomo.tsx`.
 *
 * Every event comes from the typed catalogue below, so names stay consistent
 * across the reports. Nothing here ever carries an email, a ticket secret, an
 * order code, a bridge token or search text: session and speaker ids are
 * public slugs and fine as event names. What the database already records
 * (stars, push subscriptions) is not duplicated as events.
 *
 * Calls are no-ops outside production builds and when the site id is set to
 * an empty string, and they only queue onto the tracker's command array, so
 * nothing in the app waits on the network.
 */

export const MATOMO_URL = "https://ethereumfoundation.matomo.cloud";
/** Site 38 is app.devcon.org. Empty string = tracking off (see .env.example). */
export const MATOMO_SITE_ID = process.env.NEXT_PUBLIC_MATOMO_SITE_ID ?? "38";

/**
 * Appended by the service worker to the URL a push notification opens, read
 * and stripped by MatomoAnalytics. A hash, so it never reaches the server or
 * the page-view URL. Keep in step with the literal in `src/sw.ts`.
 */
export const PUSH_OPEN_HASH = "#from=push";

/** Visit-scope custom dimensions configured on site 38 (ids from Matomo). */
export const DIMENSION = { displayMode: 1, signedIn: 2, stars: 3 } as const;

const EVENTS = {
  install: [
    "tap",
    "prompt-accepted",
    "prompt-dismissed",
    "steps-shown",
    "safari-hop",
    "installed",
    "card-dismissed",
  ],
  "sign-in": ["code-requested", "code-failed", "verified", "verify-failed", "sign-out"],
  push: [
    "permission-granted",
    "permission-denied",
    "permission-dismissed",
    "permission-unanswered",
    "subscribed",
    "unsubscribed",
    "announcements-on",
    "announcements-off",
    "reminders-on",
    "reminders-off",
    "sheet-shown",
    "sheet-accepted",
    "sheet-dismissed",
  ],
  planner: ["open-chatgpt", "open-claude", "open-grok", "copy", "apply-opened", "applied"],
  perks: ["claim", "sheet-shown", "open-browser", "copy", "share"],
  schedule: ["day", "programme", "view", "interests-only", "filter", "search"],
  session: ["qa", "calendar"],
  announcements: ["open", "highlight", "push-open"],
  offline: ["used"],
  sw: ["update-shown", "update-accepted"],
  sync: ["bundle-failed"],
  error: ["page"],
} as const;

export type EventCategory = keyof typeof EVENTS;
export type EventAction<C extends EventCategory> = (typeof EVENTS)[C][number];

type Command = (string | number)[];

export function analyticsEnabled(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    MATOMO_SITE_ID !== "" &&
    typeof window !== "undefined"
  );
}

/** The tracker's command queue; matomo.js drains it once loaded. */
function paq(): Command[] {
  const w = window as Window & { _paq?: Command[] };
  w._paq = w._paq ?? [];
  return w._paq;
}

export function trackEvent<C extends EventCategory>(
  category: C,
  action: EventAction<C>,
  name?: string,
  value?: number
): void {
  if (!analyticsEnabled()) return;
  const args: Command = ["trackEvent", category, action];
  if (name !== undefined || value !== undefined) args.push(name ?? "");
  if (value !== undefined) args.push(value);
  paq().push(args);
}

/** Visit-scope value; rides on every following hit of the visit. */
export function setDimension(id: number, value: string): void {
  if (!analyticsEnabled()) return;
  paq().push(["setCustomDimension", id, value]);
}

/** Interest count as a band, the "Stars" dimension's values. */
export function starsBand(count: number): "0" | "1-5" | "6-20" | "21+" {
  if (count <= 0) return "0";
  if (count <= 5) return "1-5";
  if (count <= 20) return "6-20";
  return "21+";
}
