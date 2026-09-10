import type { Metadata } from "next";
import { detailMetadata } from "@/data/share-metadata";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Per-session social tags (crawlers and link previews read these). */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { id } = await params;
  return detailMetadata("session", id, await searchParams);
}

/**
 * Session page. The body is rendered by the Schedule tab's persistent pane
 * (layout-level TabPanes, see `schedule/[id]/session.tsx`), which reads the id
 * from the URL: that is what keeps the list mounted behind the detail, makes
 * opening one a `history.pushState` instead of a server round trip, and lets
 * the service worker serve a never-visited session offline from the precached
 * `/schedule` shell. This route exists for the URL and its metadata.
 */
export default function SessionPage() {
  return null;
}
