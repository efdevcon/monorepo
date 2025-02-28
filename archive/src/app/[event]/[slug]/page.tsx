import { Video } from "@/components/domain/archive";
import { getSessionBySlug } from "@/services/devcon";

type Props = {
  params: {
    event: string;
    slug: string;
  };
};

export default async function Index({ params }: Props) {
  const { event, slug } = params;

  const session = await getSessionBySlug(slug, `devcon-${event}`);

  if (!session) return null;

  return <Video video={session} />;
}
