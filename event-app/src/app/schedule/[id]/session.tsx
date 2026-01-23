"use client";

import { useSession } from "@/data/hooks";
import APP_CONFIG from "@/CONFIG";
import { use } from "react";
import { Link, BackButton } from "@/routing";

interface SessionClientProps {
  params?: Promise<{ id: string }>;
  id?: string;
}

export default function Session({ params, id: directId }: SessionClientProps) {
  const id = directId ?? use(params!).id;

  const { session, isLoading, isError, error } = useSession(id);

  if (!APP_CONFIG.SCHEDULE_ENABLED) {
    return <div className="p-4 text-gray-500">Schedule is not enabled</div>;
  }

  if (isLoading) {
    return <div className="p-4">Loading session...</div>;
  }

  if (isError || !session) {
    return (
      <div className="p-4 text-red-500">
        {error?.message || "Session not found"}
      </div>
    );
  }

  return (
    <div className="p-4">
      <BackButton
        fallbackHref="/schedule"
        className="text-blue-500 hover:underline mb-4 block cursor-pointer"
      >
        ← Back to Schedule
      </BackButton>

      <h1 className="text-2xl font-bold mb-2">{session.title}</h1>

      <div className="space-y-2 text-gray-600 mb-4">
        <p>
          {session.day} • {session.date}
        </p>
        {session.room && <p>Room: {session.room.name}</p>}
        {session.track && <p>Track: {session.track}</p>}
        {session.type && <p>Type: {session.type}</p>}
      </div>

      {session.description && (
        <div className="mb-4">
          <h2 className="font-semibold mb-1">Description</h2>
          <p className="text-gray-700">{session.description}</p>
        </div>
      )}

      {session.speakers.length > 0 && (
        <div>
          <h2 className="font-semibold mb-2">Speakers</h2>
          <div className="space-y-2">
            {session.speakers.map((speaker) => (
              <Link
                key={speaker.id}
                href={`/speakers/${speaker.id}`}
                className="block p-2 border rounded hover:bg-gray-50 cursor-pointer"
              >
                {speaker.name}
                {speaker.company && (
                  <span className="text-gray-500"> • {speaker.company}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
