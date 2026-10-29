"use client";

import { useMemo } from "react";
import { Monitor } from "lucide-react";
import { useRooms, useSessionsOfAllProgrammes } from "@/data/hooks";
import type { Room, Session } from "@/data/models";
import APP_CONFIG from "@/CONFIG";
import { Link } from "@/routing";
import { useNowMs } from "@/hooks/useNow";
import { formatTime, getStatus } from "@/components/schedule/utils";
import { roomIconUrl } from "@/components/room-screen/roomIcon";
import { roomScreenRoomIds } from "@/data/venueRooms";

/**
 * Picker order (Scott, 2026-10-29): the Main Stage, its three Lotus parts,
 * Jasmine, Lightning, the workshops, the two CLS rooms, the Music Stage last.
 * Differs from the timeline's lane order, which lists the CLS rooms before
 * the workshops. Rooms not listed follow, by name.
 */
const PICKER_ORDER: readonly string[] = [
  "main-stage-lotus",
  "lotus-stage-1",
  "lotus-stage-2",
  "lotus-stage-3",
  "jasmine-stage-4",
  "lightning-stage",
  "workshop-1",
  "workshop-2",
  "community-led-stage",
  "cls-builders-room",
  "music-stage",
];

function pickerRank(id: string): number {
  const i = PICKER_ORDER.indexOf(id);
  return i === -1 ? Infinity : i;
}

/** What a room's screen is showing right now, for the picker cards. */
function roomStatus(sessions: Session[], nowMs: number): { kind: "live" | "next" | "done"; session?: Session } {
  const sorted = [...sessions].sort((a, b) => a.start - b.start);
  const live = sorted.find((s) => getStatus(s, nowMs) === "live");
  if (live) return { kind: "live", session: live };
  const next = sorted.find((s) => s.start * 1000 > nowMs);
  return next ? { kind: "next", session: next } : { kind: "done" };
}

function RoomCard({ room, sessions, nowMs }: { room: Room; sessions: Session[]; nowMs: number }) {
  const status = roomStatus(sessions, nowMs);
  const icon = roomIconUrl(room.id);
  return (
    <Link
      href={`/room-screens/${room.id}`}
      className="group flex flex-col rounded-xl border border-dc-hairline bg-white p-4 transition-colors hover:border-dc-purple/40"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[16px] font-bold leading-6 text-dc-fg2">{room.name}</h2>
          {room.description && <p className="truncate text-[13px] leading-5 text-dc-muted">{room.description}</p>}
        </div>
        {icon && (
          // The place's icon, same art as the venue map, opposite the name; hidden if it fails to load offline.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={icon}
            alt=""
            className="size-8 shrink-0 object-contain"
            onError={(e) => {
              e.currentTarget.hidden = true;
            }}
          />
        )}
      </div>

      <div className="mb-3 flex min-w-0 flex-col text-[13px] leading-5 text-dc-fg2">
        {status.kind === "live" && (
          <p className="flex min-w-0 items-center gap-2">
            <span className="size-2 shrink-0 rounded-full bg-[#e11d48]" />
            <span className="shrink-0 font-semibold text-[#e11d48]">Live</span>
            <span className="truncate">{status.session!.title}</span>
          </p>
        )}
        {status.kind === "next" && (
          <>
            <p className="font-semibold text-dc-fg2">Next at {formatTime(status.session!.start)}</p>
            <p className="truncate text-dc-muted">{status.session!.title}</p>
          </>
        )}
        {status.kind === "done" && <p className="text-dc-muted">No more sessions today</p>}
      </div>

      <span className="inline-flex items-center gap-1.5 text-[13px] font-bold leading-5 text-dc-purple group-hover:underline">
        <Monitor className="size-4" />
        Open screen
      </span>
    </Link>
  );
}

export default function RoomScreens() {
  const { rooms, isLoading, isError, error } = useRooms();
  // Places read the whole catalogue, whatever programme a session is shown in.
  const sessions = useSessionsOfAllProgrammes();
  const nowMs = useNowMs(60_000);
  const byRoom = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) {
      const id = s.room?.id;
      if (!id) continue;
      (map.get(id) ?? map.set(id, []).get(id)!).push(s);
    }
    return map;
  }, [sessions]);
  const ordered = useMemo(
    () =>
      [...rooms].sort((a, b) => {
        const ra = pickerRank(a.id);
        const rb = pickerRank(b.id);
        return ra !== rb ? ra - rb : a.name.localeCompare(b.name);
      }),
    [rooms]
  );

  if (!APP_CONFIG.ROOMS_ENABLED) {
    return <div className="p-4 text-dc-muted">Room screens are not enabled</div>;
  }
  if (isLoading) return <div className="p-4 text-dc-muted">Loading rooms…</div>;
  if (isError) return <div className="p-4 text-red-500">{error?.message}</div>;

  return (
    // `expand` leaves the layout's 680px reading column; the page then takes
    // the app's usual 1312px desktop width, like the schedule and tickets.
    <div className="expand">
      <div className="flex flex-col gap-6 px-4 py-6 font-heading lg:mx-auto lg:w-full lg:max-w-[1312px] lg:px-8 lg:py-8 xl:px-0">
      <div className="flex flex-col gap-2">
        {/* Mobile title comes from AppHeader (routeChrome); page h1 is desktop-only. */}
        <h1 className="hidden text-[24px] font-extrabold leading-[28.8px] tracking-[-0.5px] text-dc-fg2 lg:block">
          Room Screens
        </h1>
        <p className="text-[14px] leading-5 text-dc-muted">
          Pick a room, open it on the TV&apos;s browser and go fullscreen. The screen follows the room&apos;s
          schedule on its own, with a QR code to open the current session in the app.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ordered.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            sessions={roomScreenRoomIds(room.id).flatMap((id) => byRoom.get(id) ?? [])}
            nowMs={nowMs}
          />
        ))}
      </div>
      </div>
    </div>
  );
}
