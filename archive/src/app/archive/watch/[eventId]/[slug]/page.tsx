import { permanentRedirect } from "next/navigation";
import { eventIdFromRoute } from "@/utils/editions";

export default async function ArchiveRedirect({ params, searchParams }: any) {
  const { eventId, slug } = await params;
  const query = new URLSearchParams(
    (await searchParams) as Record<string, string>
  );

  const destination = `/${eventIdFromRoute(eventId)}/${slug}${
    query.toString() ? `?${query.toString()}` : ""
  }`;

  console.log("Redirecting to", destination);
  permanentRedirect(destination);
}
