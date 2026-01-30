"use client";

import { useRoom, useSessions } from "@/data/hooks";
import APP_CONFIG from "@/CONFIG";
import { use, useMemo } from "react";
import { Link, BackButton } from "@/routing";

interface RoomScreenClientProps {
  params?: Promise<{ id: string }>;
  id?: string;
}

export default function RoomScreen({ params, id: directId }: RoomScreenClientProps) {
  const id = directId ?? use(params!).id;

  const {
    room,
    isLoading: roomLoading,
    isError: roomError,
    error: roomErrorObj,
  } = useRoom(id);
  const { sessions, isLoading: sessionsLoading } = useSessions({ roomId: id });

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => a.start - b.start);
  }, [sessions]);

  if (!APP_CONFIG.ROOMS_ENABLED) {
    return <div className="p-4 text-gray-500">Room screens are not enabled</div>;
  }

  if (roomLoading || sessionsLoading) {
    return <div className="p-4">Loading room screen...</div>;
  }

  if (roomError || !room) {
    return (
      <div className="p-4 text-red-500">
        {roomErrorObj?.message || "Room not found"}
      </div>
    );
  }

  return (
    <div className="p-4">
      <BackButton
        fallbackHref="/room-screens"
        className="text-blue-500 hover:underline mb-4 block cursor-pointer"
      >
        ← Back to Room Screens
      </BackButton>

      <h1 className="text-3xl font-bold mb-2">{room.name}</h1>
      {room.description && (
        <p className="text-gray-600 mb-4">{room.description}</p>
      )}

      <h2 className="text-xl font-semibold mb-4">Sessions in this room</h2>

      {sortedSessions.length === 0 ? (
        <p className="text-gray-500">No sessions scheduled for this room</p>
      ) : (
        <div className="space-y-4">
          {sortedSessions.map((session) => (
            <Link
              key={session.id}
              href={`/schedule/${session.id}`}
              className="block p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <h3 className="font-semibold text-lg">{session.title}</h3>
              <p className="text-gray-600">
                {session.day} • {session.duration} min
              </p>
              {session.speakers.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {session.speakers.map((s) => s.name).join(", ")}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
