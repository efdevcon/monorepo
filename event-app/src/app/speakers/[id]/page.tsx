"use client";

import { useSpeaker, useSessionsBySpeaker } from "@/data/hooks";
import APP_CONFIG from "@/CONFIG";
import { notFound } from "next/navigation";
import { use } from "react";

export default function SpeakerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  if (!APP_CONFIG.SPEAKERS_ENABLED) {
    notFound();
  }

  const { speaker, isLoading, isError, error } = useSpeaker(id);
  const { sessions } = useSessionsBySpeaker(id);

  if (isLoading) {
    return <div className="p-4">Loading speaker...</div>;
  }

  if (isError || !speaker) {
    return <div className="p-4 text-red-500">{error?.message || "Speaker not found"}</div>;
  }

  return (
    <div className="p-4">
      <a href="/speakers" className="text-blue-500 hover:underline mb-4 block">
        ← Back to Speakers
      </a>

      <h1 className="text-2xl font-bold mb-2">{speaker.name}</h1>

      <div className="space-y-1 text-gray-600 mb-4">
        {speaker.role && <p>{speaker.role}</p>}
        {speaker.company && <p>{speaker.company}</p>}
      </div>

      {speaker.description && (
        <div className="mb-4">
          <h2 className="font-semibold mb-1">About</h2>
          <p className="text-gray-700">{speaker.description}</p>
        </div>
      )}

      <div className="flex gap-4 mb-4">
        {speaker.twitter && (
          <a
            href={`https://twitter.com/${speaker.twitter}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            Twitter
          </a>
        )}
        {speaker.github && (
          <a
            href={`https://github.com/${speaker.github}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            GitHub
          </a>
        )}
        {speaker.website && (
          <a
            href={speaker.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            Website
          </a>
        )}
      </div>

      {sessions.length > 0 && (
        <div>
          <h2 className="font-semibold mb-2">Sessions</h2>
          <div className="space-y-2">
            {sessions.map((session) => (
              <a
                key={session.id}
                href={`/schedule/${session.id}`}
                className="block p-2 border rounded hover:bg-gray-50"
              >
                <p className="font-medium">{session.title}</p>
                <p className="text-sm text-gray-500">
                  {session.day} • {session.room?.name}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
