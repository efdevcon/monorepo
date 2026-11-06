import { redirect } from "next/navigation";
import { eventIdFromRoute } from "@/utils/editions";

export default async function Index({
  params,
}: {
  params: Promise<{ event: string }>;
}) {
  const { event } = await params;
  redirect(`/watch?event=${eventIdFromRoute(event)}`);
}
