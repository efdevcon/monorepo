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

  return (
    <div className="">
      <h1>Watch Event Page</h1>
      <p>Event: {event}</p>
      <p>Slug: {slug}</p>
      <p>Session: {JSON.stringify(session)}</p>
    </div>
  );
}
