"use client";

import type { Speaker } from "@/data/models";
import { Link } from "@/routing";

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** A speaker list row: avatar + name + role/company (+ session count). */
export function SpeakerCard({ speaker }: { speaker: Speaker }) {
  const subtitle = [speaker.role, speaker.company].filter(Boolean).join(" · ");
  const sessionCount = speaker.sessions?.length ?? 0;

  return (
    <Link
      href={`/speakers/${speaker.id}`}
      className="flex items-center gap-4 rounded-xl border border-[#E1E4EA] bg-white p-3 transition-colors hover:border-[#ac9fdf]"
    >
      {speaker.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={speaker.avatar}
          alt={speaker.name}
          className="h-12 w-12 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f3eeff] font-bold text-[#7D52F4]">
          {initials(speaker.name)}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate font-semibold">{speaker.name}</p>
        {subtitle && (
          <p className="truncate text-sm text-gray-600">{subtitle}</p>
        )}
        {sessionCount > 0 && (
          <p className="text-xs text-[#717784]">
            {sessionCount} session{sessionCount > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </Link>
  );
}
