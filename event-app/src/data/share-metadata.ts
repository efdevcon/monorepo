import type { Metadata } from "next";
import APP_CONFIG from "@/CONFIG";
import { DATASETS, DEFAULT_DATASET_KEY, type Dataset, type DatasetKey } from "./dataset";
import { detailHref, type DetailKind } from "@/routing/viewParams";

/**
 * Per-item social metadata for the detail pages (`/schedule/[id]`,
 * `/speakers/[id]`), read by link crawlers (X, Telegram, WhatsApp, Slack,
 * iMessage, Facebook). Crawlers run no JavaScript and have no service worker:
 * they fetch the page and read the tags the server rendered. The page body
 * itself is rendered on the client from the local store (see the route files).
 *
 * Both card images come from devcon.org's generators
 * (`/api/social/schedule/<id>/`, `/api/social/speaker/<id>/`: 1200x630, DC8
 * design, cached in Storage); the host is `APP_CONFIG.SOCIAL_CARD_ORIGIN` so
 * a local devcon dev server can preview cards. Server-only: runs inside
 * `generateMetadata`. `?dataset=` is honoured so preview links describe the
 * right event. Nested metadata objects replace (not merge with) the root
 * layout's, so `siteName` is restated here.
 */

const DESCRIPTION_MAX = 200;
/** Public event name for shared-link copy; dataset labels are debug-panel labels. */
const EVENT_LABEL = "Devcon 8 India";

type SearchParams = Record<string, string | string[] | undefined>;

function param(searchParams: SearchParams, key: string): string | undefined {
  const raw = searchParams[key];
  return typeof raw === "string" && raw ? raw : undefined;
}

function datasetFor(searchParams: SearchParams): Dataset {
  const key = param(searchParams, "dataset");
  return DATASETS[key && key in DATASETS ? (key as DatasetKey) : DEFAULT_DATASET_KEY];
}

function eventLabelFor(dataset: Dataset): string {
  return dataset.key === DEFAULT_DATASET_KEY ? EVENT_LABEL : dataset.label;
}

function summary(text: unknown): string | undefined {
  if (typeof text !== "string") return undefined;
  const flat = text.replace(/\s+/g, " ").trim();
  if (!flat) return undefined;
  return flat.length > DESCRIPTION_MAX ? `${flat.slice(0, DESCRIPTION_MAX - 1)}…` : flat;
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: T };
    return json.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Card image on devcon.org. Trailing slash is load-bearing: devcon.org
 * 308-redirects bare paths and social scrapers don't follow redirects.
 */
function cardImage(kind: DetailKind, encodedId: string, alt: string) {
  const path = kind === "session" ? "schedule" : "speaker";
  return {
    url: `${APP_CONFIG.SOCIAL_CARD_ORIGIN}/api/social/${path}/${encodedId}/`,
    width: 1200,
    height: 630,
    type: "image/jpeg",
    alt,
  };
}

export async function detailMetadata(
  kind: DetailKind,
  id: string,
  searchParams: SearchParams
): Promise<Metadata> {
  // Ids are slugs; anything else can't be a real item, so skip the API call.
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(id)) return {};
  const dataset = datasetFor(searchParams);
  const eventLabel = eventLabelFor(dataset);
  const encoded = encodeURIComponent(id);
  const url = detailHref(kind, id);

  if (kind === "session") {
    const session = await getJson<{ title?: string; description?: string; track?: string }>(
      `${dataset.apiUrl}/sessions/${encoded}?event=${encodeURIComponent(dataset.eventId)}`
    );
    if (!session?.title) return {};
    const title = session.title;
    const description = summary(session.description) ?? session.track ?? APP_CONFIG.APP_DESCRIPTION;
    const image = cardImage(kind, encoded, `${title} at ${eventLabel}`);
    return {
      title: `${title} · ${eventLabel}`,
      description,
      openGraph: {
        type: "article",
        siteName: APP_CONFIG.APP_NAME,
        title,
        description,
        url,
        images: [image],
      },
      twitter: { card: "summary_large_image", title, description, images: [image.url] },
    };
  }

  const speaker = await getJson<{ name?: string; description?: string }>(
    `${dataset.apiUrl}/speakers/${encoded}`
  );
  if (!speaker?.name) return {};
  const title = speaker.name;
  const description =
    summary(speaker.description) ?? `${speaker.name} is speaking at ${eventLabel}.`;
  const image = cardImage(kind, encoded, `${speaker.name} is speaking at ${eventLabel}`);
  return {
    title: `${title} · ${eventLabel}`,
    description,
    openGraph: {
      type: "profile",
      siteName: APP_CONFIG.APP_NAME,
      title,
      description,
      url,
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}
