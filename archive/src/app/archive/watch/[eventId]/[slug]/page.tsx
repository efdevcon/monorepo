import { permanentRedirect } from "next/navigation";

type Props = {
  params: {
    eventId: string;
    slug: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
};

export default function ArchiveRedirect({ params, searchParams }: Props) {
  const { eventId, slug } = params;
  const query = new URLSearchParams(searchParams as Record<string, string>);

  const destination = `/devcon-${eventId}/${slug}${
    query.toString() ? `?${query.toString()}` : ""
  }`;

  console.log("Redirecting to", destination);
  permanentRedirect(destination);
}
