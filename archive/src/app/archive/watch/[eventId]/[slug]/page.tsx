import { permanentRedirect } from "next/navigation";

export default async function ArchiveRedirect({ params, searchParams }: any) {
  const { eventId, slug } = await params;
  const query = new URLSearchParams(
    (await searchParams) as Record<string, string>
  );

  const destination = `/devcon-${eventId}/${slug}${
    query.toString() ? `?${query.toString()}` : ""
  }`;

  console.log("Redirecting to", destination);
  permanentRedirect(destination);
}
