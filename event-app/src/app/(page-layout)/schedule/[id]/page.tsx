import Session from "./session";

export default function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Session params={params} />;
}
