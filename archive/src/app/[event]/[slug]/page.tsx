import { Video } from "@/components/domain/archive";
import { getRelatedSessions, getSessionBySlug } from "@/services/devcon";

export default async function Index({ params }: any) {
  const { event, slug } = params;

  const session = await getSessionBySlug(
    slug,
    event.startsWith("devcon") ? event : `devcon-${event}`
  );
  const related = await getRelatedSessions(session?.id);

  if (!session) return null;

  return <Video video={session} relatedVideos={related} />;
}
