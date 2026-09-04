import type { Metadata } from "next";
import { detailMetadata } from "@/data/share-metadata";

/** Per-session social tags when `?session=<id>` is present (crawlers only see this). */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  return detailMetadata("session", await searchParams);
}

/** Schedule tab: rendered by the layout's persistent TabPanes (see schedule.tsx). */
export default function SchedulePage() {
  return null;
}
