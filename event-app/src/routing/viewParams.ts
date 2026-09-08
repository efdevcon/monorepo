/**
 * Route shapes shared by the app and the service worker (src/sw.ts imports
 * this file relatively), so both agree on what a URL's identity is.
 *
 * Detail pages are real paths (`/schedule/<id>`, `/speakers/<id>`): the URLs
 * people share, crawlers fetch (per-item social metadata is rendered there)
 * and push notifications open. In the app they open in place: the list tab
 * stays mounted and the URL changes with `history.pushState` (routing/
 * detailRoute.ts), and offline the service worker answers a navigation to a
 * detail path with the precached tab shell, which renders the detail from the
 * local store. So a `/schedule/[id]` page never has to be precached per id.
 *
 * Pure module: no DOM, no React.
 */

export type DetailKind = "session" | "speaker";

/** Debug/editor params carried across navigation (routing/index.tsx, DebugPanel, announcements preview). */
export const DEBUG_PARAMS = ["dataset", "mockNow", "mockSpeed", "debug", "preview"] as const;

/**
 * Shell cache-key policy for the service worker: HTML and RSC payloads are
 * identical whatever the query string (all data is client-side), so every
 * param is ignored when looking up a shell. Only Next's `_rsc` marker stays,
 * since it distinguishes an RSC payload request from the document.
 */
export const IGNORED_URL_PARAMS: RegExp[] = [/^(?!_rsc$).*/];

/** Copy of `url` reduced to its shell identity (the input is not mutated). */
export function stripIgnoredParams(url: URL): URL {
  const out = new URL(url.toString());
  for (const key of [...out.searchParams.keys()]) {
    if (IGNORED_URL_PARAMS.some((re) => re.test(key))) out.searchParams.delete(key);
  }
  return out;
}

/**
 * The bottom-bar destinations. They are persistent panes (components/
 * TabPanes.tsx): our Link wrapper disables Next's scroll-to-top for hrefs into
 * these paths so each pane can keep its own scroll position.
 */
export const TAB_PATHS = ["/", "/schedule", "/speakers", "/map", "/ticket"] as const;

export function isTabPath(pathname: string): boolean {
  return (TAB_PATHS as readonly string[]).includes(pathname);
}

export const DETAIL_ROUTES: Record<DetailKind, string> = {
  session: "/schedule",
  speaker: "/speakers",
};

/** Canonical href of a detail page (in-app open, share link, deep link). */
export function detailHref(kind: DetailKind, id: string): string {
  return `${DETAIL_ROUTES[kind]}/${encodeURIComponent(id)}`;
}

/**
 * `/schedule/<id>` and `/speakers/<id>` (optional trailing slash). The "no
 * dot" rule keeps `/schedule/devcon8-logo.svg` and friends (static files)
 * out; ids are slugs without dots, slashes or percent signs.
 */
const DETAIL_PATH = /^\/(schedule|speakers)\/([^/.]+)\/?$/;

export function parseDetailPath(pathname: string): { kind: DetailKind; id: string } | null {
  const match = DETAIL_PATH.exec(pathname);
  if (!match) return null;
  let id = match[2];
  try {
    id = decodeURIComponent(id);
  } catch {
    // Malformed escape: keep the raw segment, the lookup simply misses.
  }
  return { kind: match[1] === "schedule" ? "session" : "speaker", id };
}

export function isDetailPath(pathname: string): boolean {
  return parseDetailPath(pathname) !== null;
}

/**
 * The tab pane that renders `pathname`: the tab itself, or the list tab a
 * detail page belongs to. Null for routes outside the tab bar (announcements,
 * room screens, admin), which render through the layout's children.
 */
export function tabPathOf(pathname: string): string | null {
  if (isTabPath(pathname)) return pathname;
  const detail = parseDetailPath(pathname);
  return detail ? DETAIL_ROUTES[detail.kind] : null;
}
