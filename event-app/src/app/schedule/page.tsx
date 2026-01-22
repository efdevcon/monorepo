"use client";

import { useSessions } from "@/data/hooks";
import APP_CONFIG from "@/CONFIG";
import { notFound } from "next/navigation";

export default function SchedulePage() {
  if (!APP_CONFIG.SCHEDULE_ENABLED) {
    notFound();
  }

  const { sessions, isLoading, isError, error } = useSessions();

  if (isLoading) {
    return <div className="p-4">Loading sessions...</div>;
  }

  if (isError) {
    return <div className="p-4 text-red-500">{error?.message}</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Schedule</h1>
      <div className="space-y-4">
        {sessions.map((session) => (
          <a
            key={session.id}
            href={`/schedule/${session.id}`}
            className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h2 className="font-semibold">{session.title}</h2>
            <p className="text-sm text-gray-600">
              {session.day} • {session.room?.name}
            </p>
            {session.speakers.length > 0 && (
              <p className="text-sm text-gray-500">
                {session.speakers.map((s) => s.name).join(", ")}
              </p>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
