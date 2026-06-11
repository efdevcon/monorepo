"use client";

import { useMemo } from "react";
import cn from "classnames";
import type { Session } from "@/data/models";
import { Link } from "@/routing";
import {
  buildTimeline,
  formatTime,
  getStatus,
  offsetPx,
  sessionBox,
  SLOT_WIDTH,
  trackColor,
} from "./utils";

const ROOM_COL = 112; // px width of the sticky room-name column
const LANE_H = 44; // px height of each room lane

/** A compact session block placed in a room lane, linking to its detail page. */
function TimelineSession({
  session,
  startMs,
  nowMs,
}: {
  session: Session;
  startMs: number;
  nowMs: number;
}) {
  const color = trackColor(session.track);
  const { left, width } = sessionBox(session, startMs);
  const past = getStatus(session, nowMs) === "past";

  return (
    <Link
      href={`/schedule/${session.id}`}
      title={`${session.title} — ${session.room?.name ?? ""}`}
      style={{
        left,
        width,
        backgroundColor: color.bg,
        borderColor: color.fg,
      }}
      className={cn(
        "absolute top-1 bottom-1 z-[1] flex flex-col justify-center overflow-hidden rounded-md border-l-2 px-2 transition-shadow hover:z-[2] hover:shadow-md",
        past && "opacity-60"
      )}
    >
      <span
        className="truncate text-[11px] font-semibold leading-tight"
        style={{ color: color.fg }}
      >
        {session.title}
      </span>
      {width > SLOT_WIDTH && session.speakers.length > 0 && (
        <span className="truncate text-[10px] leading-tight text-gray-500">
          {session.speakers.map((s) => s.name).join(", ")}
        </span>
      )}
    </Link>
  );
}

/**
 * Horizontal, room-by-time timeline for a single day (ported from devcon-app).
 * Rooms are rows, time runs along the x-axis at 10-minute resolution. The room
 * column is sticky-left and the time header sticky-top; a red line marks "now"
 * when the current time falls within the day. Sessions link to their detail page.
 */
export function ScheduleTimeline({
  sessions,
  nowMs,
}: {
  sessions: Session[];
  nowMs: number;
}) {
  const { rooms, slots, startMs, byRoom } = useMemo(
    () => buildTimeline(sessions),
    [sessions]
  );

  if (sessions.length === 0) return null;

  const gridWidth = slots.length * SLOT_WIDTH;
  const lastSlotEnd = slots[slots.length - 1];
  const nowVisible = nowMs >= startMs && nowMs <= lastSlotEnd;
  const nowLeft = offsetPx(nowMs, startMs);

  return (
    <div className="overflow-x-auto rounded-xl border border-[#E1E4EA]">
      <div style={{ width: ROOM_COL + gridWidth }} className="relative">
        {/* Time header */}
        <div className="sticky top-0 z-20 flex bg-white/95 backdrop-blur">
          <div
            style={{ width: ROOM_COL }}
            className="sticky left-0 z-10 shrink-0 border-b border-r border-[#E1E4EA] bg-white/95"
          />
          {slots.map((slot, i) => (
            <div
              key={slot}
              style={{ width: SLOT_WIDTH }}
              className="shrink-0 border-b border-[#E1E4EA] py-1.5 text-center text-[11px] text-[#939393]"
            >
              {/* Label every other slot (20-min) to avoid crowding */}
              {i % 2 === 0 ? formatTime(slot / 1000) : ""}
            </div>
          ))}
        </div>

        {/* "Now" line spanning all lanes */}
        {nowVisible && (
          <div
            aria-hidden
            style={{ left: ROOM_COL + nowLeft }}
            className="pointer-events-none absolute bottom-0 top-[29px] z-[15] w-px bg-red-400"
          >
            <span className="absolute -left-[3px] -top-px h-[7px] w-[7px] rounded-full bg-red-400" />
          </div>
        )}

        {/* Room lanes */}
        {rooms.map((room) => (
          <div key={room} className="flex" style={{ height: LANE_H }}>
            <div
              style={{ width: ROOM_COL }}
              className="sticky left-0 z-10 flex shrink-0 items-center border-b border-r border-[#E1E4EA] bg-white px-2 text-xs font-medium text-gray-700"
            >
              <span className="truncate">{room}</span>
            </div>
            <div
              className="relative shrink-0 border-b border-[#E1E4EA]"
              style={{
                width: gridWidth,
                backgroundImage:
                  "repeating-linear-gradient(to right, #F1F3F7 0 1px, transparent 1px " +
                  SLOT_WIDTH +
                  "px)",
              }}
            >
              {byRoom[room].map((session) => (
                <TimelineSession
                  key={session.id}
                  session={session}
                  startMs={startMs}
                  nowMs={nowMs}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
