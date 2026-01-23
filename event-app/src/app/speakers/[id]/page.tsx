import Speaker from "./speaker";

export default function SpeakerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Speaker params={params} />;
}
