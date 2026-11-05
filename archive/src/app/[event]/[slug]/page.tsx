import { notFound } from "next/navigation";
import { Video } from "@/components/domain/archive";
import { getRelatedSessions, getSessionBySlug } from "@/services/devcon";
import { eventIdFromRoute } from "@/utils/editions";

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
