import type { Metadata } from "next";
import { detailMetadata } from "@/data/share-metadata";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Per-speaker social tags (crawlers and link previews read these). */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { id } = await params;
  return detailMetadata("speaker", id, await searchParams);
}

/**
 * Speaker page. The body is rendered by the Speakers tab's persistent pane
 * (layout-level TabPanes, see `speakers/[id]/speaker.tsx`), which reads the id
 * from the URL; see `schedule/[id]/page.tsx` for why. This route exists for
 * the URL and its metadata.
 */
export default function SpeakerPage() {
  return null;
}
