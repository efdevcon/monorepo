/**
 * URL params that select an in-page view or a debug mode on a precached
 * shell route. Shared by the app and the service worker (src/sw.ts imports
 * this file relatively), so both agree on what a URL's identity is: the HTML
 * and RSC payload of `/speakers?speaker=x` are the ones of `/speakers`.
 *
 * Pure module: no DOM, no React.
 */

export type DetailKind = "session" | "speaker";

/** Detail views: `?session=<id>` on /schedule, `?speaker=<id>` on /speakers. */
export const VIEW_PARAMS = ["session", "speaker"] as const satisfies readonly DetailKind[];

/** Debug/editor params carried across navigation (routing/index.tsx, DebugPanel, announcements preview). */
export const DEBUG_PARAMS = ["dataset", "mockNow", "mockSpeed", "debug", "preview"] as const;

/**
 * For Serwist `ignoreURLParametersMatching` and our RSC cache-key plugin: a
 * request differing only in these params maps to the same cached shell.
 */
export const IGNORED_URL_PARAMS: RegExp[] = [
  ...[...VIEW_PARAMS, ...DEBUG_PARAMS].map((p) => new RegExp(`^${p}$`)),
  /^utm_/,
  /^fbclid$/,
];

/** Copy of `url` without the ignored params (the input is not mutated). */
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

/** In-app href of a detail view (opens in place, works offline). */
export function detailHref(kind: DetailKind, id: string): string {
  return `${DETAIL_ROUTES[kind]}?${kind}=${encodeURIComponent(id)}`;
}

/**
 * Shareable href of a detail view: the short path form. Browsers and crawlers
 * are redirected to `detailHref` (next.config online, the service worker
 * offline), and the shell there serves per-item social metadata.
 */
export function shareHref(kind: DetailKind, id: string): string {
  return `${DETAIL_ROUTES[kind]}/${encodeURIComponent(id)}`;
}

/**
 * Legacy `/schedule/<id>` and `/speakers/<id>` → their query-param form,
 * preserving any query string. Null for everything else. The "no dot" rule
 * keeps `/schedule/devcon8-logo.svg` and friends (static files) out; ids are
 * slugs without dots, slashes or percent signs.
 */
const LEGACY_DETAIL = /^\/(schedule|speakers)\/([^/.]+)\/?$/;

export function legacyDetailRedirect(url: URL): URL | null {
  const match = LEGACY_DETAIL.exec(url.pathname);
  if (!match) return null;
  const kind: DetailKind = match[1] === "schedule" ? "session" : "speaker";
  const out = new URL(DETAIL_ROUTES[kind], url.origin);
  url.searchParams.forEach((value, key) => out.searchParams.set(key, value));
  out.searchParams.set(kind, decodeURIComponent(match[2]));
  return out;
}
