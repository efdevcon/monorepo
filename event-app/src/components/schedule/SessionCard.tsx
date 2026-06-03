"use client";

import { Clock, MapPin } from "lucide-react";
import cn from "classnames";
import type { Session } from "@/data/models";
import { Link } from "@/routing";
import {
  formatTimeRange,
  getStatus,
  minutesUntil,
  trackColor,
} from "./utils";

/** A single session row, with a track-colored accent and live/soon status. */
export function SessionCard({
  session,
  nowMs,
}: {
  session: Session;
  nowMs: number;
}) {
  const color = trackColor(session.track);
  const status = getStatus(session, nowMs);

  return (
    <Link
      href={`/schedule/${session.id}`}
      className={cn(
        "group flex overflow-hidden rounded-xl border border-[#E1E4EA] bg-white transition-colors hover:border-[#ac9fdf]",
        status === "past" && "opacity-60"
      )}
    >
      {/* Track-colored accent rail */}
      <div className="w-1.5 shrink-0" style={{ backgroundColor: color.fg }} />

      <div className="min-w-0 flex-1 p-4">
        <div className="mb-1 flex items-center gap-2">
          {session.track && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: color.bg, color: color.fg }}
            >
              {session.track}
            </span>
          )}
          {status === "live" && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
              Happening now
            </span>
          )}
          {status === "soon" && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              In {minutesUntil(session, nowMs)} min
            </span>
          )}
          {session.expertise && (
            <span className="text-xs text-[#939393]">{session.expertise}</span>
          )}
        </div>

        <h3 className="font-semibold leading-snug">{session.title}</h3>

        {session.speakers.length > 0 && (
          <p className="mt-0.5 truncate text-sm text-gray-600">
            {session.speakers.map((s) => s.name).join(", ")}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#939393]">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatTimeRange(session)}
          </span>
          {session.room?.name && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {session.room.name}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
