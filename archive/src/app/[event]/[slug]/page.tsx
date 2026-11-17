import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Video } from "@/components/domain/archive";
import { getRelatedSessions, getSessionBySlug } from "@/services/devcon";
import { eventIdFromRoute } from "@/utils/editions";
import { SITE_NAME, SITE_URL, SOCIAL_TWITTER } from "@/utils/site";
import { videoDescription, videoImage } from "@/utils/video";

// Same request as the page's: Next dedupes the fetch within one render.
export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { event, slug } = await params;
  const session = await getSessionBySlug(slug, eventIdFromRoute(event));
  if (!session) return {};

  const url = `${SITE_URL}/${session.eventId}/${session.id}/`;
  const description = videoDescription(session);
  const images = [videoImage(session) ?? { url: "/archive-social.png" }];

  return {
    title: session.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "video.other",
      siteName: SITE_NAME,
      title: session.title,
      description,
      url,
      images,
    },
    twitter: {
      card: "summary_large_image",
      site: SOCIAL_TWITTER,
      title: session.title,
      description,
      images,
    },
  };
}

export default async function Index({ params }: any) {
  const { event, slug } = await params;

  const session = await getSessionBySlug(slug, eventIdFromRoute(event));
  if (!session) notFound();

  // Related sessions come unfiltered; keep the recorded ones, as the listings do.
  const related = ((await getRelatedSessions(session.id)) ?? []).filter(
    (s: any) => s.sources_youtubeId
  );

  return <Video video={session} relatedVideos={related} />;
}
