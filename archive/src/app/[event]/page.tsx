import { redirect } from "next/navigation";

type Props = {
  params: {
    event: string;
  };
};

export default function Index({ params }: Props) {
  const { event } = params;
  redirect(`/watch?event=${event}`);
}
