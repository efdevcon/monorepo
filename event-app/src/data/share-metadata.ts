import type { Metadata } from "next";
import APP_CONFIG from "@/CONFIG";
import { DATASETS, DEFAULT_DATASET_KEY, type DatasetKey } from "./dataset";
import type { DetailKind } from "@/routing/viewParams";

/**
 * Per-item social metadata for the shell routes, read by link crawlers (X,
 * Telegram, WhatsApp, Slack, iMessage, Facebook). Crawlers run no JavaScript
 * and have no service worker: they fetch `/schedule?session=<id>` (directly,
 * or after the redirect from the short `/schedule/<id>` share form) and read
 * the tags the server rendered. Without the param the shells keep the app's
 * generic metadata.
 *
 * Session cards come from devcon.org's existing generator
 * (`/api/social/schedule/<id>/`, 1200x630, DC8 design, cached in Storage);
 * speakers use their avatar. Server-only: runs inside `generateMetadata`.
 */

const DEVCON_ORG = "https://devcon.org";
const DESCRIPTION_MAX = 200;

type SearchParams = Record<string, string | string[] | undefined>;

function param(searchParams: SearchParams, key: string): string | undefined {
  const raw = searchParams[key];
  return typeof raw === "string" && raw ? raw : undefined;
}

function datasetFor(searchParams: SearchParams) {
  const key = param(searchParams, "dataset");
  return DATASETS[key && key in DATASETS ? (key as DatasetKey) : DEFAULT_DATASET_KEY];
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

export async function detailMetadata(
  kind: DetailKind,
  searchParams: SearchParams
): Promise<Metadata> {
  const id = param(searchParams, kind);
  if (!id) return {};
  const dataset = datasetFor(searchParams);
  const encoded = encodeURIComponent(id);

  if (kind === "session") {
    const session = await getJson<{ title?: string; description?: string; track?: string }>(
      `${dataset.apiUrl}/sessions/${encoded}?event=${encodeURIComponent(dataset.eventId)}`
    );
    if (!session?.title) return {};
    const title = session.title;
    const description = summary(session.description) ?? session.track ?? APP_CONFIG.APP_DESCRIPTION;
    const image = `${DEVCON_ORG}/api/social/schedule/${encoded}/`;
    return {
      title: `${title} · ${APP_CONFIG.APP_NAME}`,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        images: [{ url: image, width: 1200, height: 630 }],
      },
      twitter: { card: "summary_large_image", title, description, images: [image] },
    };
  }

  const speaker = await getJson<{ name?: string; description?: string; avatar?: string }>(
    `${dataset.apiUrl}/speakers/${encoded}`
  );
  if (!speaker?.name) return {};
  const title = speaker.name;
  const description = summary(speaker.description) ?? `Speaker at ${dataset.label}`;
  const images = speaker.avatar ? [{ url: speaker.avatar }] : undefined;
  return {
    title: `${title} · ${APP_CONFIG.APP_NAME}`,
    description,
    openGraph: { title, description, type: "profile", images },
    twitter: {
      card: "summary",
      title,
      description,
      images: speaker.avatar ? [speaker.avatar] : undefined,
    },
  };
}
