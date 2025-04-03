import { Video } from "@/components/domain/archive";
import { getRelatedSessions, getSessionBySlug } from "@/services/devcon";

type Props = {
  params: {
    event: string;
    slug: string;
  };
};

export default async function Index({ params }: Props) {
  const { event, slug } = params;

  const session = await getSessionBySlug(
    slug,
    event.startsWith("devcon") ? event : `devcon-${event}`
  );
  const related = await getRelatedSessions(session?.id);

  if (!session) return null;

  return <Video video={session} relatedVideos={related} />;
}
