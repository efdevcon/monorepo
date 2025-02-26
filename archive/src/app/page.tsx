import { Editions } from "@/components/editions";
import { getEvents } from "@/services/devcon";

export default async function Home() {
  const events = await getEvents();

  return (
    <div className="">
      <Editions events={events} />
    </div>
  );
}
