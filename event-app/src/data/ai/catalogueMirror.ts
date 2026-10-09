import { DATASETS, DEFAULT_DATASET_KEY, type Dataset } from "@/data/dataset";

/**
 * The app mirrors devcon-api's AI catalogue under its own origin: assistants
 * fetch from app.devcon.org, which Netlify serves without bot challenges,
 * while api.devcon.org sits behind Cloudflare, whose bot rules can refuse an
 * assistant's fetcher. The route handlers under `src/app/ai/[event]/` proxy
 * the API server-side and rewrite the links in the text so every page an
 * assistant follows stays on the app origin.
 *
 * One path per page, mirroring the API's shape (`catalogueUrls` there):
 *   /ai/<event>            index          cached
 *   /ai/<event>/day/<n>    one day        cached
 *   /ai/<event>/sessions   all days       cached
 *   /ai/<event>/search?…   filters        never cached
 * Netlify's CDN keys a Next response by path alone (its Netlify-Vary covers
 * only the RSC params), so a query-string variant must not be cached: a
 * cached `?event=devcon8` once answered `?event=devcon-7`, and day 1 day 2.
 * Pure helpers here, tested in scripts/test-data.ts.
 */

/** Query parameters the API's search understands; anything else is dropped. */
export const CATALOGUE_PARAMS = ["day", "track", "type", "room", "q", "ids", "full"] as const;

export type MirrorPage = "index" | "day" | "sessions" | "search";

/** The dataset an event id names (the API event id, which the hubs ride on). */
export function catalogueDataset(event: string | null | undefined): Dataset | undefined {
  if (!event) return DATASETS[DEFAULT_DATASET_KEY];
  return Object.values(DATASETS).find((d) => d.eventId === event);
}

const apiBase = (dataset: Dataset) => `${dataset.apiUrl.replace(/\/$/, "")}/events/${dataset.eventId}/ai`;

/** Upstream URL for a mirror request. */
export function upstreamCatalogueUrl(dataset: Dataset, page: MirrorPage, params: URLSearchParams, day?: string): string {
  const base = apiBase(dataset);
  if (page === "index") return base;
  if (page === "day") return `${base}/day/${encodeURIComponent(day ?? "")}`;
  if (page === "sessions") return `${base}/sessions`;
  const query = new URLSearchParams();
  for (const name of CATALOGUE_PARAMS) {
    const value = params.get(name);
    if (value) query.set(name, value);
  }
  const q = query.toString();
  return q ? `${base}/search?${q}` : `${base}/search`;
}

/** The mirror's index URL for an event (what the prompt and llms.txt point at). */
export function mirrorCatalogueUrl(appOrigin: string, eventId: string): string {
  return `${appOrigin}/ai/${encodeURIComponent(eventId)}`;
}

/** Rewrite the API's links in a catalogue page so they point at the mirror (same path shape, other base). */
export function rewriteCatalogueLinks(text: string, dataset: Dataset, appOrigin: string): string {
  return text.split(apiBase(dataset)).join(mirrorCatalogueUrl(appOrigin, dataset.eventId));
}

export const CATALOGUE_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";

/**
 * The origin the visitor used. On Netlify a route handler's `request.url`
 * carries the deploy's internal address (`<deploy id>--site.netlify.app`),
 * so the links we write must come from the forwarded headers instead, or an
 * assistant following them leaves the public domain.
 */
export function requestOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host")?.split(",")[0].trim() || request.headers.get("host");
  if (!host) return new URL(request.url).origin;
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim() || "https";
  return `${proto}://${host}`;
}

const plain = (body: string, status: number, cache?: string) =>
  new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": cache ?? "no-store" },
  });

/**
 * Shared handler body for the mirror routes: pick the dataset, fetch the API
 * page, rewrite its links, answer as plain text. A failed upstream fetch is a
 * 502 with a one-line explanation the assistant can relay.
 */
export async function mirrorCatalogue(request: Request, event: string, page: MirrorPage, day?: string): Promise<Response> {
  const dataset = catalogueDataset(event);
  if (!dataset) return plain("Unknown event.", 404);
  const upstream = upstreamCatalogueUrl(dataset, page, new URL(request.url).searchParams, day);
  let res: Response;
  try {
    res = await fetch(upstream, { headers: { Accept: "text/plain" }, cache: "no-store" });
  } catch {
    return plain("The programme is not reachable right now, try again in a minute.", 502);
  }
  if (!res.ok) return plain(`The programme is not reachable right now (upstream ${res.status}), try again in a minute.`, 502);
  const text = rewriteCatalogueLinks(await res.text(), dataset, requestOrigin(request));
  return plain(text, 200, page === "search" ? undefined : CATALOGUE_CACHE_CONTROL);
}
