import { redirect } from "next/navigation";

export default function Index({ params }: any) {
  const { event } = params;
  redirect(`/watch?event=${event}`);
}
