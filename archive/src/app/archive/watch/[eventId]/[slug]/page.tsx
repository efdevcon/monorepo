import { permanentRedirect } from "next/navigation";

export default function ArchiveRedirect({ params, searchParams }: any) {
  const { eventId, slug } = params;
  const query = new URLSearchParams(searchParams as Record<string, string>);

  const destination = `/devcon-${eventId}/${slug}${
    query.toString() ? `?${query.toString()}` : ""
  }`;

  console.log("Redirecting to", destination);
  permanentRedirect(destination);
}
