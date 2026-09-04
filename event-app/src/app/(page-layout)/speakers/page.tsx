import type { Metadata } from "next";
import { detailMetadata } from "@/data/share-metadata";

/** Per-speaker social tags when `?speaker=<id>` is present (crawlers only see this). */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  return detailMetadata("speaker", await searchParams);
}

/** Speakers tab: rendered by the layout's persistent TabPanes (see speakers.tsx). */
export default function SpeakersPage() {
  return null;
}
