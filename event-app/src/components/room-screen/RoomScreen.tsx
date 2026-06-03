"use client";

import { useEffect, useMemo, useState } from "react";
import cn from "classnames";
import QRCode from "qrcode";
import { Clock, Users } from "lucide-react";
import APP_CONFIG from "@/CONFIG";
import { useRoom, useSessions } from "@/data/hooks";
import type { Session } from "@/data/models";
import { getStatus, minutesUntil, trackColor } from "@/components/schedule/utils";

const GRADIENT = "linear-gradient(to right, #7a3aff, #633cff, #bc52f1)";
const GLASS = "bg-white/80 backdrop-blur-[10px]";

const dateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "short",
  day: "numeric",
});
const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

/** "45 min" / "2 hours" / "1 day" — coarse human duration. */
function humanize(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""}`;
  const d = Math.round(h / 24);
  return `${d} day${d > 1 ? "s" : ""}`;
}

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** Track / type / expertise pill (mirrors devcon's SessionBar). */
function SessionBar({ session }: { session: Session }) {
  const color = trackColor(session.track);
  return (
    <div
      className="flex items-center gap-[0.5em] self-start rounded-full border border-solid border-[#dfd8fc] p-[0.4em] pr-[1em]"
      style={{ backgroundColor: color.bg }}
    >
      {session.type && (
        <p className="rounded-full bg-[#dfd8fc] px-[0.75em] py-[0.25em] text-[0.75vw] font-bold uppercase">
          {session.type}
        </p>
      )}
      {session.expertise && (
        <p className="rounded-full bg-white px-[0.75em] py-[0.25em] text-[0.75vw] font-bold uppercase">
          {session.expertise}
        </p>
      )}
      <p
        className="ml-[0.5em] text-[0.75vw] font-semibold uppercase"
        style={{ color: color.fg }}
      >
        {session.track}
      </p>
    </div>
  );
}

function SpeakerAvatar({ name, avatar }: { name: string; avatar?: string }) {
  if (avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img src={avatar} alt={name} className="h-full w-full rounded-full object-cover" />
    );
  }
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-full w-full items-center justify-center rounded-full bg-[#dfd8fc] font-bold text-[#7D52F4]">
      {initials}
    </div>
  );
}

/** Compact upcoming-session card. */
function UpcomingCard({ session }: { session: Session }) {
  const color = trackColor(session.track);
  return (
    <div className="mb-[0.5em] flex gap-[0.75em] rounded-xl border border-solid border-[#dfd8fc] p-[0.75em]">
      <div className="shrink-0 text-[1.25vw] font-bold tabular-nums">
        {timeFmt.format(new Date(session.start * 1000))}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-3 text-[1vw] font-semibold leading-snug">
          {session.title}
        </p>
        {session.track && (
          <span
            className="mt-[0.3em] inline-block rounded-full px-[0.6em] py-[0.15em] text-[0.75vw] font-medium"
            style={{ backgroundColor: color.bg, color: color.fg }}
          >
            {session.track}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Full-screen room kiosk modeled on the devcon-app room screen: a 26/74
 * widescreen split that scales with the viewport (vw units), the live (or
 * next-up) session shown large, speakers, description, a QR + livestream box,
 * an upcoming list, and a notifications ticker. Pure Tailwind + inline styles
 * (no SCSS). Isolated under components/room-screen.
 */
export function RoomScreen({ roomId }: { roomId: string }) {
  const nowMs = useNow();
  const { room, isLoading: roomLoading, isError, error } = useRoom(roomId);
  const { sessions, isLoading: sessionsLoading } = useSessions({ roomId });

  const sorted = useMemo(
    () => [...sessions].sort((a, b) => a.start - b.start),
    [sessions]
  );
  const upcomingSessions = useMemo(
    () => sorted.filter((s) => s.start * 1000 > nowMs).slice(0, 3),
    [sorted, nowMs]
  );
  const currentSession = useMemo(() => {
    const live = sorted.find((s) => getStatus(s, nowMs) === "live");
    return live ?? upcomingSessions[0] ?? null;
  }, [sorted, nowMs, upcomingSessions]);
  const sessionIsLive = currentSession
    ? getStatus(currentSession, nowMs) === "live"
    : false;

  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    if (!currentSession) return setQr(null);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    QRCode.toDataURL(`${origin}/schedule/${currentSession.id}`, {
      margin: 1,
      width: 256,
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [currentSession]);

  if (!APP_CONFIG.ROOMS_ENABLED) {
    return <div className="p-4 text-gray-500">Room screens are not enabled</div>;
  }

  if (roomLoading || sessionsLoading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0e0a1f] text-white">
        Loading…
      </div>
    );
  }

  if (isError || !room) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0e0a1f] text-white">
        {error?.message || "Room not found"}
      </div>
    );
  }

  // Fallback "thank you" screen.
  if (!currentSession) {
    return (
      <div className="fixed inset-0 z-[60] flex h-screen w-screen items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/login/backdrop.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(71,4,218,0.6), rgba(14,10,31,0.4))" }} />
        <div className="relative flex flex-col items-center justify-center p-[1em] text-center text-white">
          <div className="text-[3vw] font-bold">{APP_CONFIG.APP_NAME}</div>
          <div className="text-[2vw]">No more sessions in {room.name} today.</div>
          <p className="text-[1.25vw]">Thank you for attending! 🙏</p>
        </div>
      </div>
    );
  }

  const color = trackColor(currentSession.track);

  return (
    <div className="fixed inset-0 z-[60] flex h-screen w-screen overflow-hidden text-[1.5vw] leading-[1.5em]">
      {/* LEFT — branding, clock, room image, capacity, next-session gradient */}
      <div className="flex w-[26%] flex-col border-r border-[#dddddd]">
        <div className="relative flex h-[81.5%] grow flex-col overflow-hidden bg-[#f2efff]">
          <div className="m-[0.3em] flex items-center justify-between p-[1em]">
            <p className="text-[1.5vw] font-bold text-[#6B54AB]">
              {APP_CONFIG.APP_NAME}
            </p>
          </div>

          <div className="m-[0.3em] flex justify-between p-[1em]">
            <p className="ml-[0.2em] text-[1.5vw] text-black">
              {dateFmt.format(new Date(nowMs))}
            </p>
            <p className="mr-[0.5em] flex items-center gap-[0.75em] text-[1.25vw] font-bold text-black">
              <Clock className="h-[1.5em] w-[1.5em]" style={{ color: "#7D52F4" }} />
              {timeFmt.format(new Date(nowMs))}
            </p>
          </div>

          {/* Room image with gradient-overlaid title */}
          <div className="relative grow">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/login/backdrop.jpg" alt={room.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 p-[1.5vw] text-white">
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: "linear-gradient(to bottom, rgba(122,58,255,0.5), transparent)" }}
              />
              <p className="relative text-[2vw] font-bold">
                {room.name}
                {room.description ? ` - ${room.description}` : ""}
              </p>
            </div>
          </div>

          {room.capacity != null && (
            <div className="flex w-full items-center justify-between bg-[#f8f4ff] px-[1.5vw] py-[1vw]">
              <p className="text-[1.25vw]">
                Room Capacity:{" "}
                <span className="font-semibold">{room.capacity}</span>
              </p>
              <Users className="h-[2.2em] w-[2.2em]" style={{ color: "#765BE6" }} />
            </div>
          )}
        </div>

        <div
          className="flex flex-col justify-between p-[1.5vw] text-white"
          style={{ background: GRADIENT }}
        >
          {upcomingSessions.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-[1.25vw] font-bold">Next Session</p>
              <p className="text-[2vw]">
                {humanize(minutesUntil(upcomingSessions[0], nowMs))}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — current session, speakers, description, QR, upcoming, ticker */}
      <div className="relative box-border flex w-[74%] flex-col px-[2vw] pb-[2vw] pt-0">
        <div className="relative flex grow justify-between border-b border-[#dddddd] py-[0.5vw] pb-0">
          <div className="flex w-[60%] flex-col gap-4">
            <div className="flex items-center gap-[0.5em]">
              <SessionBar session={currentSession} />
              {sessionIsLive ? (
                <p className="ml-[1vw] mt-[1vw] text-[1.25vw] font-bold text-red-600">
                  Happening Now
                </p>
              ) : (
                <p className="ml-[1vw] mt-[1vw] text-[1.25vw] font-bold">
                  Starts in {humanize(minutesUntil(currentSession, nowMs))}
                </p>
              )}
            </div>

            <p className="line-clamp-3 text-[2.5vw] !leading-[1.3em]">
              {currentSession.title}
            </p>

            <div className="flex grow flex-col justify-end">
              <div className="flex items-center">
                {currentSession.speakers.map((speaker, i) => (
                  <div
                    className={cn(
                      "flex shrink-0 items-center p-[0.2em] py-[0.8em]",
                      GLASS,
                      i === currentSession.speakers.length - 1 && "rounded-tr-2xl"
                    )}
                    key={speaker.id}
                  >
                    <div className="mr-[0.5vw] flex items-center">
                      <div className="relative h-[4vw] w-[4vw]">
                        <SpeakerAvatar name={speaker.name} avatar={speaker.avatar} />
                      </div>
                    </div>
                    <p className="font-bold">{speaker.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Track-colored watermark (replaces devcon's track logo image) */}
          <div
            className="absolute bottom-0 right-0 z-[-2] h-full w-[60%]"
            style={{ background: `radial-gradient(circle at 70% 60%, ${color.bg}, transparent 70%)` }}
          />
        </div>

        {currentSession.description && (
          <div className="border-b border-[#dddddd] pb-[1vw]">
            <p className="py-[1vw] font-bold text-black">Description</p>
            <p className="line-clamp-3 text-[1vw]">{currentSession.description}</p>
          </div>
        )}

        <div className="flex grow">
          <div className="flex shrink-0 grow-0 basis-1/2 flex-row">
            <div className="flex flex-col">
              <p className="py-[1vw] font-bold text-black">Resources / Livestreams</p>
              <p className="text-[1vw]">
                View the session in the app for more information.
              </p>
              <p className="mt-[1vw] text-[1vw]">
                If the room is full, please watch the session on livestream.
              </p>
            </div>

            <div className="mx-[1em] mt-[5em] flex flex-col items-center justify-center">
              <div className="flex aspect-square shrink-0 items-center justify-center rounded-2xl border border-solid border-[#dfd8fc] p-[1em]">
                {qr && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qr}
                    alt="Session QR code"
                    style={{ height: "auto", maxWidth: "10em", width: "100%" }}
                  />
                )}
              </div>
              <p className="mt-[0.7em] shrink-0 rounded-2xl bg-[#7D52F4] px-[1em] py-[0.5em] text-center text-[0.75vw] font-semibold !leading-[1.2em] text-white">
                Open in app
              </p>
            </div>
          </div>

          <div
            className="relative ml-[1em] shrink-0 grow-0 basis-1/2"
            style={{ maskImage: "linear-gradient(to bottom, white 80%, transparent 93%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, white 80%, transparent 93%, transparent)" }}
          >
            <p className="py-[1vw] font-bold text-black">Upcoming Sessions</p>
            {upcomingSessions.map((session) => (
              <UpcomingCard key={session.id} session={session} />
            ))}
            {upcomingSessions.length === 0 && (
              <p className="text-[1vw]">There are no upcoming sessions.</p>
            )}
          </div>
        </div>

        {/* Notifications ticker */}
        <div className="absolute bottom-0 left-0 flex h-[3em] w-full items-center gap-[1vw] bg-[#F8F4FF] px-[0.75vw] py-[0.5vw]">
          <p className="shrink-0 rounded-full bg-[#dfd8fc] px-[0.75em] py-[0.25em] text-[0.75vw] font-bold uppercase">
            Notifications
          </p>
          <div className="flex-1 overflow-hidden">
            <div className="inline-flex animate-[marquee_40s_linear_infinite] whitespace-nowrap">
              <span className="mr-[4em]">
                If the room is full please view on livestream or ask volunteers
                for any overflow rooms.
              </span>
              <span className="mr-[4em]">
                If the room is full please view on livestream or ask volunteers
                for any overflow rooms.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
