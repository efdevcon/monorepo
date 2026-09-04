import type { Metadata } from "next";
import { detailMetadata } from "@/data/share-metadata";
import Schedule from "./schedule";

/** Per-session social tags when `?session=<id>` is present (crawlers only see this). */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  return detailMetadata("session", await searchParams);
}

export default function SchedulePage() {
  return <Schedule />;
}
