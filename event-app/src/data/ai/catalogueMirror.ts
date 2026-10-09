import { DATASETS, DEFAULT_DATASET_KEY, type Dataset } from "@/data/dataset";

/**
 * The app mirrors devcon-api's AI catalogue under its own origin
 * (`/ai`, `/ai/sessions`): assistants fetch from app.devcon.org, which Netlify
 * serves without bot challenges, while api.devcon.org sits behind Cloudflare,
 * whose bot rules can refuse an assistant's fetcher. The route handlers proxy
 * the API server-side and rewrite the links in the text so every page an
 * assistant follows stays on the app origin. Pure helpers here, tested in
 * scripts/test-data.ts.
 */

/** Query parameters the API's session list understands; anything else is dropped. */
export const CATALOGUE_PARAMS = ["day", "track", "type", "room", "q", "ids", "full"] as const;

/** The dataset an `?event=` value names, by API event id; the deployment default without one. */
export function catalogueDataset(event: string | null | undefined): Dataset | undefined {
  if (!event) return DATASETS[DEFAULT_DATASET_KEY];
  return Object.values(DATASETS).find((d) => d.eventId === event);
}

/** Upstream URL for a mirror request: the API's index or session list for `dataset`, with the allowed params. */
export function upstreamCatalogueUrl(dataset: Dataset, list: boolean, params: URLSearchParams): string {
  const base = `${dataset.apiUrl.replace(/\/$/, "")}/events/${dataset.eventId}/ai${list ? "/sessions" : ""}`;
  const query = new URLSearchParams();
  for (const name of CATALOGUE_PARAMS) {
    const value = params.get(name);
    if (value) query.set(name, value);
  }
  const q = query.toString();
  return q ? `${base}?${q}` : base;
}

/** The mirror's own URL for an index or list (what the prompt and the rewritten links point at). */
export function mirrorCatalogueUrl(appOrigin: string, eventId: string, list = false, query = ""): string {
  const params = new URLSearchParams(query);
  params.set("event", eventId);
  return `${appOrigin}/ai${list ? "/sessions" : ""}?${params.toString()}`;
}

/** Rewrite the API's links in a catalogue page so they point at the mirror. */
export function rewriteCatalogueLinks(text: string, dataset: Dataset, appOrigin: string): string {
  const api = `${dataset.apiUrl.replace(/\/$/, "")}/events/${dataset.eventId}/ai`;
  return text
    .split(`${api}/sessions?`)
    .join(`${appOrigin}/ai/sessions?event=${encodeURIComponent(dataset.eventId)}&`)
    .split(`${api}/sessions`)
    .join(`${appOrigin}/ai/sessions?event=${encodeURIComponent(dataset.eventId)}`)
    .split(api)
    .join(`${appOrigin}/ai?event=${encodeURIComponent(dataset.eventId)}`);
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

/**
 * Shared handler body for both mirror routes: pick the dataset, fetch the API
 * page, rewrite its links, answer as plain text. A failed upstream fetch is a
 * 502 with a one-line explanation the assistant can relay.
 */
export async function mirrorCatalogue(request: Request, list: boolean): Promise<Response> {
  const url = new URL(request.url);
  const dataset = catalogueDataset(url.searchParams.get("event"));
  if (!dataset) return new Response("Unknown event.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const upstream = upstreamCatalogueUrl(dataset, list, url.searchParams);
  let res: Response;
  try {
    res = await fetch(upstream, { headers: { Accept: "text/plain" }, cache: "no-store" });
  } catch {
    return new Response("The programme is not reachable right now, try again in a minute.", { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  if (!res.ok) {
    return new Response(`The programme is not reachable right now (upstream ${res.status}), try again in a minute.`, { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  const text = rewriteCatalogueLinks(await res.text(), dataset, requestOrigin(request));
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": CATALOGUE_CACHE_CONTROL },
  });
}
