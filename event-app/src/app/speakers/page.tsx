"use client";

import Link from "next/link";
import { useSpeakers } from "@/data/hooks";
import APP_CONFIG from "@/CONFIG";
import { notFound } from "next/navigation";

export default function SpeakersPage() {
  if (!APP_CONFIG.SPEAKERS_ENABLED) {
    notFound();
  }

  const { speakers, isLoading, isError, error } = useSpeakers();

  if (isLoading) {
    return <div className="p-4">Loading speakers...</div>;
  }

  if (isError) {
    return <div className="p-4 text-red-500">{error?.message}</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Speakers</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {speakers.map((speaker) => (
          <Link
            key={speaker.id}
            href={`/speakers/${speaker.id}`}
            className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h2 className="font-semibold">{speaker.name}</h2>
            {speaker.role && (
              <p className="text-sm text-gray-600">{speaker.role}</p>
            )}
            {speaker.company && (
              <p className="text-sm text-gray-500">{speaker.company}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
