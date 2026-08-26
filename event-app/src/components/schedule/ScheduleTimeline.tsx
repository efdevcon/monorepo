"use client";

import { useEffect, useMemo, useRef } from "react";
import cn from "classnames";
import { Clock3, Star, User } from "lucide-react";
import type { Session } from "@/data/models";
import { Link } from "@/routing";
import { useInterested } from "@/data/interested/useInterested";
import { isDesktopNow } from "@/hooks/useIsDesktop";
import {
  buildTimeline,
  formatTime,
  formatTimeRange,
  isKeynoteSession,
  offsetPx,
  sessionBox,
  SLOT_WIDTH,
} from "./utils";
import { getTrackTheme, trackBadgeLabel } from "./trackTheme";

const ROOM_COL = 120; // px width of the sticky room-name column (Figma)
const LANE_H = 74; // px height of each room lane (Figma)
const HEADER_H = 40; // px height of the time-axis header row (Figma)
const BLOCK_INSET = 4; // px inset of session blocks inside their lane

/** A session block in a room lane (Figma): pastel tile with title + meta. */
function TimelineSession({
  session,
  startMs,
  selected = false,
  onOpen,
}: {
  session: Session;
  startMs: number;
  /** Desktop side-panel selection highlight. */
  selected?: boolean;
  /** Desktop: open the details side panel instead of navigating (as cards do). */
  onOpen?: (id: string) => void;
}) {
  const theme = getTrackTheme(session.track);
  const { left, width } = sessionBox(session, startMs);
  const { isInterested, toggle } = useInterested();
  const interested = isInterested(session.id);
  const keynote = isKeynoteSession(session);
  const wide = width >= SLOT_WIDTH * 1.5;

  return (
    <Link
      href={`/schedule/${session.id}`}
      // No viewport prefetch (see SpeakerCard) — client page on cached data.
      prefetch={false}
      title={`${session.title} — ${session.room?.name ?? ""}`}
      onClick={(e) => {
        if (onOpen && isDesktopNow()) {
          e.preventDefault();
          onOpen(session.id);
        }
      }}
      style={{
        left: left + BLOCK_INSET,
        width: width - BLOCK_INSET * 2,
        backgroundColor: theme.neutral ? "#ffffff" : theme.color,
      }}
      className={cn(
        "absolute top-1 z-[1] flex h-[66px] items-center gap-3 overflow-hidden rounded-[4px] p-3 hover:z-[2] hover:ring-1 hover:ring-inset hover:ring-dc-purple",
        theme.neutral && "border border-dc-hairline",
        selected && "ring-1 ring-inset ring-dc-purple"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
        <span className="w-full truncate text-[14px] font-bold leading-5 text-dc-fg2">
          {session.title}
        </span>
        <span className="flex w-full min-w-0 items-center gap-2 leading-none">
          <span className="flex shrink-0 items-center gap-1">
            {theme.gem && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={theme.gem}
                alt=""
                className="size-3.5 object-contain"
                loading="lazy"
              />
            )}
            <span className="text-[12px] font-semibold uppercase tracking-[0.5px] text-dc-fg2">
              {trackBadgeLabel(session.track)}
            </span>
          </span>
          {wide && (
            <>
              <span className="flex shrink-0 items-center gap-1 text-[12px] text-dc-muted">
                <Clock3 className="size-3.5" />
                {formatTimeRange(session)}
              </span>
              {session.speakers.length > 0 && (
                <span className="flex min-w-0 flex-1 items-center gap-1 text-[12px] text-dc-muted">
                  <User className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {session.speakers.map((s) => s.name).join(", ")}
                  </span>
                </span>
              )}
              {keynote && (
                <span className="shrink-0 rounded-[4px] bg-dc-keynote px-1.5 py-0.5 text-[12px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg2">
                  Keynote
                </span>
              )}
            </>
          )}
        </span>
      </div>
      <button
        aria-label={interested ? "Remove from interested" : "Add to interested"}
        aria-pressed={interested}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void toggle(session.id, session.title);
        }}
        className="group/star -m-2.5 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-dc-purple-soft"
      >
        <Star
          className={cn(
            "size-4 transition-colors",
            interested
              ? "fill-dc-purple text-dc-purple"
              : "fill-transparent text-dc-fg group-hover/star:text-dc-purple"
          )}
        />
      </button>
    </Link>
  );
}

/**
 * Room-by-time timeline (Figma "1 - Timeline view"): 10 min = 180px columns,
 * 74px lanes, sticky 120px room column, `#f9f8fa` chrome cells, pastel track
 * blocks and a red now line + dot + time pill. Scrolls horizontally inside
 * its rounded hairline card.
 */
export function ScheduleTimeline({
  sessions,
  nowMs,
  dayLabel,
  jumpToNowSignal = 0,
  selectedSessionId = null,
  onOpen,
}: {
  sessions: Session[];
  nowMs: number;
  /** Short label for the sticky corner cell (e.g. "Nov 3"). */
  dayLabel?: string;
  /** Increment to horizontally scroll the grid to the now line. */
  jumpToNowSignal?: number;
  /** Desktop side-panel selection highlight. */
  selectedSessionId?: string | null;
  /** Desktop: open the details side panel instead of navigating. */
  onOpen?: (id: string) => void;
}) {
  const { rooms, slots, startMs, byRoom } = useMemo(
    () => buildTimeline(sessions),
    [sessions]
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // The signal counter lives in Schedule and survives this component's
  // unmount (view toggle, filtered-to-empty), so a remount would replay the
  // last jump. Baseline whatever value we mounted with; only act on growth.
  const handledSignalRef = useRef(jumpToNowSignal ?? 0);

  const gridWidth = slots.length * SLOT_WIDTH;
  const lastSlotEnd = slots.length ? slots[slots.length - 1] : 0;
  const nowVisible =
    slots.length > 0 && nowMs >= startMs && nowMs <= lastSlotEnd;
  const nowLeft = offsetPx(nowMs, startMs);
  const corner = dayLabel?.split(", ")[1] ?? dayLabel ?? "";

  // "Jump to now": center the now line in the visible grid area.
  useEffect(() => {
    if ((jumpToNowSignal ?? 0) <= handledSignalRef.current) return;
    handledSignalRef.current = jumpToNowSignal ?? 0;
    const el = scrollRef.current;
    if (!el || !nowVisible) return;
    el.scrollTo({
      left: Math.max(0, ROOM_COL + nowLeft - el.clientWidth / 2),
      behavior: "smooth",
    });
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToNowSignal]);

  if (sessions.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      className="scroll-mt-[calc(112px+var(--safe-top))] overflow-x-auto rounded-xl border border-dc-hairline bg-white [scrollbar-width:thin] lg:scroll-mt-[calc(80px+var(--safe-top))]"
    >
      <div style={{ width: ROOM_COL + gridWidth }} className="relative">
        {/* Time-axis header */}
        <div className="flex" style={{ height: HEADER_H }}>
          <div
            style={{ width: ROOM_COL }}
            className="sticky left-0 z-10 flex shrink-0 items-center justify-center border-b border-r border-dc-hairline bg-dc-panel text-[14px] font-bold leading-none text-dc-fg2"
          >
            {corner}
          </div>
          {slots.map((slot) => (
            <div
              key={slot}
              style={{ width: SLOT_WIDTH }}
              className="flex shrink-0 items-center border-b border-dc-hairline bg-dc-panel pl-1.5 text-[14px] font-medium leading-none text-dc-fg2"
            >
              {formatTime(slot / 1000)}
            </div>
          ))}
        </div>

        {/* Now indicator: line + dot + time pill, all red */}
        {nowVisible && (
          <div
            aria-hidden
            style={{ left: ROOM_COL + nowLeft }}
            className="pointer-events-none absolute bottom-0 top-0 z-[15] w-0"
          >
            <span
              className="absolute bottom-0 w-[2px] -translate-x-1/2 bg-dc-red"
              style={{ top: HEADER_H }}
            />
            <span
              className="absolute size-2 -translate-x-1/2 rounded-full bg-dc-red"
              style={{ top: HEADER_H - 4 }}
            />
            <span className="absolute top-[7px] -translate-x-1/2 rounded-full bg-dc-red px-1.5 py-[3px] text-[10px] font-semibold leading-none text-white">
              {formatTime(nowMs / 1000)}
            </span>
          </div>
        )}

        {/* Room lanes */}
        {rooms.map((room) => (
          <div key={room} className="flex" style={{ height: LANE_H }}>
            <div
              style={{ width: ROOM_COL }}
              className="sticky left-0 z-10 flex shrink-0 items-center justify-center border-b border-r border-dc-hairline bg-dc-panel px-2 text-center text-[12px] font-semibold leading-[1.2] text-dc-fg2"
            >
              <span className="line-clamp-2">{room}</span>
            </div>
            <div
              className="relative shrink-0 border-b border-dc-hairline bg-white"
              style={{
                width: gridWidth,
                backgroundImage:
                  "repeating-linear-gradient(to right, rgba(34,17,68,0.1) 0 1px, transparent 1px " +
                  SLOT_WIDTH +
                  "px)",
              }}
            >
              {byRoom[room].map((session) => (
                <TimelineSession
                  key={session.id}
                  session={session}
                  startMs={startMs}
                  selected={session.id === selectedSessionId}
                  onOpen={onOpen}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
