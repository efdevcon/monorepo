"use client";

import { use } from "react";
import { RoomScreen } from "@/components/room-screen";

interface RoomScreenClientProps {
  params?: Promise<{ id: string }>;
  id?: string;
}

export default function RoomScreenRoute({
  params,
  id: directId,
}: RoomScreenClientProps) {
  const id = directId ?? use(params!).id;
  return <RoomScreen roomId={id} />;
}
