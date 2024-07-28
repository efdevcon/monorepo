import { Editions } from "@/components/editions";
import { Hero } from "@/components/hero";
import { getEvents } from "@/services/devcon";

export default async function Home() {
  const events = await getEvents()

  return (
    <div className="">
      <Hero />

      <Editions events={events} />
    </div>
  );
}
