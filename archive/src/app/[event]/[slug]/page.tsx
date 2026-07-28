import { notFound } from "next/navigation";
import { Video } from "@/components/domain/archive";
import { getRelatedSessions, getSessionBySlug } from "@/services/devcon";

export default async function Index({ params }: any) {
  const { event, slug } = await params;

  const session = await getSessionBySlug(
    slug,
    event.startsWith("devcon") ? event : `devcon-${event}`
  );
  if (!session) notFound();

  const related = await getRelatedSessions(session.id);

  return <Video video={session} relatedVideos={related} />;
}
