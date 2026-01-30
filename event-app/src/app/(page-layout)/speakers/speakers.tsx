"use client";

import { useSpeakers } from "@/data/hooks";
import APP_CONFIG from "@/CONFIG";
import { Link, BackButton } from "@/routing";

export default function Speakers() {
  const { speakers, isLoading, isError, error } = useSpeakers();

  if (!APP_CONFIG.SPEAKERS_ENABLED) {
    return <div className="p-4 text-gray-500">Speakers are not enabled</div>;
  }

  if (isLoading) {
    return <div className="p-4">Loading speakers...</div>;
  }

  if (isError) {
    return <div className="p-4 text-red-500">{error?.message}</div>;
  }

  return (
    <div className="p-4">
      <BackButton className="text-blue-500 hover:underline mb-4 block cursor-pointer" />

      <h1 className="text-2xl font-bold mb-4">Speakers</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {speakers.map((speaker) => (
          <Link
            key={speaker.id}
            href={`/speakers/${speaker.id}`}
            className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
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
