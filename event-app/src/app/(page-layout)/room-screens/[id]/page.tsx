import RoomScreen from "./room-screen";

export default function RoomScreenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <RoomScreen params={params} />;
}
