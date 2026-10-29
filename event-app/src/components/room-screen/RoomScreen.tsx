"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import cn from "classnames";
import QRCode from "qrcode";
import { Clock3 } from "lucide-react";
import APP_CONFIG from "@/CONFIG";
import { useRoom, useSessions, useSessionsOfAllProgrammes } from "@/data/hooks";
import type { Session } from "@/data/models";
import { useAnnouncements } from "@/data/announcements/useAnnouncements";
import { useNowMs } from "@/hooks/useNow";
import { formatTime, formatTimeRange, getStatus, minutesUntil } from "@/components/schedule/utils";
import { eventFmt } from "@/data/eventTime";
import { getTrackTheme, trackFullLabel } from "@/components/schedule/trackTheme";
import { roomIconUrl } from "./roomIcon";

/**
 * One design unit: 1% of a 16:9 box fitted inside the viewport (1vw on a
 * 16:9 screen, height-limited on wider or shorter windows such as a laptop
 * with browser chrome). The Figma frames are 1600×900, so one unit is 16px
 * there and every size below is the Figma px ÷ 16 in em off a root font of
 * one unit; a 1080p TV, a 4K TV and a laptop window show the same
 * composition and nothing is ever clipped. Leaf text sets its own em size;
 * containers only space with em so sizes never compound.
 */
const KIOSK_STYLE = {
  "--u": "min(1vw, 1.7778vh)",
  fontSize: "calc(1 * var(--u))",
} as CSSProperties;

/** The brand's deep purple: header and notifications bar (brand-neutrals/800). */
const BAR_BG = "#221144";
/** The mandala art washed over the track colour (Figma: 12% opacity). */
const MANDALA_URL = "/room-screens/mandala-bg.jpg";
/** The frosted card: white at 88% over the wash, hairline outline, 6px blur. */
const GLASS: CSSProperties = {
  backgroundColor: "rgba(255,255,255,0.88)",
  backdropFilter: "blur(0.375em)",
  WebkitBackdropFilter: "blur(0.375em)",
};

const FIXED_NOTICE = "If the room is full please view on livestream or ask volunteers for any overflow rooms.";
const MAX_UPCOMING = 5;
const MAX_AVATARS = 4;

/** "26 mins" / "2 hours 26 mins" / "1 day": the countdown in the status line. */
function humanizeWait(mins: number): string {
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"}`;
  const h = Math.floor(mins / 60);
  if (h < 24) {
    const rest = mins % 60;
    const hours = `${h} hour${h > 1 ? "s" : ""}`;
    return rest ? `${hours} ${rest} min${rest === 1 ? "" : "s"}` : hours;
  }
  const d = Math.round(h / 24);
  return `${d} day${d > 1 ? "s" : ""}`;
}

/** The track's pastel tag with its gem, in the card's large size or the rail's small one. */
function TrackPill({ track, roomId, size }: { track: string | undefined; roomId?: string; size: "lg" | "sm" }) {
  const theme = getTrackTheme(track, roomId);
  const lg = size === "lg";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-[0.25em] font-bold uppercase leading-[normal] tracking-[0.03em] text-dc-fg",
        lg ? "gap-[0.5em] py-[0.25em] pl-[0.5em] pr-[0.75em] text-[1em]" : "gap-[0.25em] py-[0.25em] pl-[0.25em] pr-[0.5em] text-[0.75em]"
      )}
      style={{ backgroundColor: theme.color }}
    >
      {theme.gem && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={theme.gem} alt="" className={cn("shrink-0 object-contain", lg ? "size-[1.5em]" : "size-[1.1667em]")} />
      )}
      {trackFullLabel(track, roomId)}
    </span>
  );
}

function SpeakerAvatar({ name, avatar }: { name: string; avatar?: string }) {
  const [failed, setFailed] = useState(false);
  if (avatar && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt=""
        crossOrigin="anonymous"
        className="size-full rounded-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="flex size-full items-center justify-center rounded-full bg-dc-purple-soft text-[1.25em] font-bold text-dc-purple">
      {initials}
    </span>
  );
}

/** Overlapping avatars then the names, comma-separated. */
function Speakers({ session }: { session: Session }) {
  if (session.speakers.length === 0) return null;
  const shown = session.speakers.slice(0, MAX_AVATARS);
  return (
    <div className="flex min-w-0 items-center gap-[1em]">
      <div className="flex shrink-0 items-center">
        {shown.map((speaker, i) => (
          <span
            key={speaker.id}
            className={cn("size-[4em] shrink-0 overflow-hidden rounded-full", i < shown.length - 1 && "-mr-[1em]")}
            style={{ zIndex: shown.length - i }}
          >
            <SpeakerAvatar name={speaker.name} avatar={speaker.avatar || undefined} />
          </span>
        ))}
      </div>
      <p className="min-w-0 truncate text-[1.25em] leading-[normal] tracking-[-0.0125em] text-dc-fg">
        {session.speakers.map((sp) => sp.name).join(", ")}
      </p>
    </div>
  );
}

/** One row of the Up next rail. */
function UpcomingCard({ session }: { session: Session }) {
  return (
    <li className="flex items-center rounded-[0.75em] border border-dc-hairline px-[1.25em] py-[1em]" style={GLASS}>
      <div className="flex min-w-0 flex-1 items-start gap-[1.25em]">
        <p className="shrink-0 text-[1.5em] font-bold leading-[normal] tracking-[-0.0104em] text-dc-fg tabular-nums">
          {formatTime(session.start)}
        </p>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-[0.75em]">
          <p className="text-[1em] font-bold leading-[1.5] tracking-[-0.0156em] text-dc-fg">{session.title}</p>
          <div className="flex min-w-0 items-start gap-[0.75em]">
            <TrackPill track={session.track} roomId={session.room?.id} size="sm" />
            {session.speakers.length > 0 && (
              <p className="min-w-0 flex-1 truncate text-[1em] leading-[normal] tracking-[-0.0156em] text-dc-fg">
                {session.speakers.map((sp) => sp.name).join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

/** Full-screen surface shared by the kiosk and its loading / error states. */
function Surface({ children, className, style }: { children: React.ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div
      className={cn("fixed inset-0 z-[60] overflow-hidden font-heading text-dc-fg", className)}
      style={{ ...KIOSK_STYLE, ...style }}
    >
      {children}
    </div>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <Surface className="flex items-center justify-center text-white" style={{ backgroundColor: BAR_BG }}>
      <p className="text-[1.6em]">{children}</p>
    </Surface>
  );
}

/**
 * Full-screen room kiosk for the TVs at each room door, and the same page on
 * a laptop for the AV desk (Figma "Design - Futures / Security / Protocol"
 * and "Starts in future 1–3", 2026-10-29). The page washes in the track
 * colour of the session on screen with the mandala art over it; a deep
 * purple header carries the room, its map icon, the date and a big clock;
 * the session sits in a frosted card (status, title, time, track and type
 * tags, description, speakers, the app QR) beside the Up next rail of
 * frosted rows that fades out at the bottom; the notifications bar along the
 * bottom shows one fixed notice and the latest announcements. Sized in
 * design units (see KIOSK_STYLE). Isolated under components/room-screen.
 */
export function RoomScreen({ roomId }: { roomId: string }) {
  const nowMs = useNowMs();
  const { room, isLoading: roomLoading, isError, error } = useRoom(roomId);
  // A place reads the whole catalogue, whatever programme a session is shown in.
  const everySession = useSessionsOfAllProgrammes();
  const sessions = useMemo(() => everySession.filter((s) => s.room?.id === roomId), [everySession, roomId]);
  const { isLoading: sessionsLoading } = useSessions();
  const { announcements } = useAnnouncements({ enabled: APP_CONFIG.ANNOUNCEMENTS_ENABLED });

  const sorted = useMemo(() => [...sessions].sort((a, b) => a.start - b.start), [sessions]);
  const currentSession = useMemo(() => {
    const live = sorted.find((s) => getStatus(s, nowMs) === "live");
    return live ?? sorted.find((s) => s.start * 1000 > nowMs) ?? null;
  }, [sorted, nowMs]);
  const sessionIsLive = currentSession ? getStatus(currentSession, nowMs) === "live" : false;
  // The rail: what follows the session on screen.
  const laterSessions = useMemo(
    () => sorted.filter((s) => s.start * 1000 > nowMs && s.id !== currentSession?.id).slice(0, MAX_UPCOMING),
    [sorted, nowMs, currentSession]
  );
  // The two latest announcements beside the fixed notice.
  const latestNotices = useMemo(
    () =>
      [...announcements]
        .sort((a, b) => new Date(b.sendAt).getTime() - new Date(a.sendAt).getTime())
        .slice(0, 2)
        .map((a) => a.message || a.title),
    [announcements]
  );

  // The app QR encodes the absolute session URL; the tile's link stays
  // relative so the markup is hydration-safe.
  const [qr, setQr] = useState<{ sessionId: string; url: string } | null>(null);
  const qrSessionId = currentSession?.id ?? null;
  useEffect(() => {
    if (!qrSessionId) return;
    let cancelled = false;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    QRCode.toDataURL(`${origin}/schedule/${qrSessionId}`, { margin: 0, width: 512 })
      .then((url) => {
        if (!cancelled) setQr({ sessionId: qrSessionId, url });
      })
      .catch(() => {
        // Nothing to scan for this session.
      });
    return () => {
      cancelled = true;
    };
  }, [qrSessionId]);
  const appQr = qr && qr.sessionId === qrSessionId ? qr.url : null;

  if (!APP_CONFIG.ROOMS_ENABLED) {
    return <div className="p-4 text-dc-muted">Room screens are not enabled</div>;
  }
  if (roomLoading || sessionsLoading) return <Message>Loading…</Message>;
  if (isError || !room) return <Message>{error?.message || "Room not found"}</Message>;

  const theme = currentSession ? getTrackTheme(currentSession.track, currentSession.room?.id) : null;
  const wash = theme && !theme.neutral ? theme.color : "#f2f1f4";
  const dateLabel = eventFmt("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date(nowMs));
  const roomIcon = roomIconUrl(room.id);

  return (
    <Surface className="grid grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto]" style={{ backgroundColor: wash }}>
      {/* The mandala art, washed over the track colour behind everything */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={MANDALA_URL} alt="" className="pointer-events-none absolute inset-0 size-full object-cover opacity-[0.12]" />

      {/* HEADER: room and its map icon, date and a big clock */}
      <header
        className="relative flex items-center justify-between px-[4em] py-[1.5em] text-white"
        style={{ backgroundColor: BAR_BG }}
      >
        <div className="flex min-w-0 items-center gap-[1em]">
          <h2 className="truncate text-[2.25em] font-bold leading-none tracking-[-0.0139em]">{room.name}</h2>
          {roomIcon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={roomIcon} alt="" className="h-[2.25em] w-auto shrink-0 object-contain" />
          )}
        </div>
        <div className="flex shrink-0 items-end gap-[0.75em] text-right font-bold">
          <p className="text-[1em] leading-[1.38] tracking-[-0.03125em]">{dateLabel}</p>
          <p className="text-[2.25em] leading-none tracking-[-0.0139em] tabular-nums">{formatTime(nowMs / 1000)}</p>
        </div>
      </header>

      {/* BODY: the session on screen, and the rail of what follows */}
      <main className="relative grid min-h-0 grid-cols-[minmax(0,52.5fr)_minmax(0,35.5fr)] items-start gap-[4em] p-[4em]">
        {currentSession ? (
          <section
            className="flex max-h-full min-h-0 flex-col gap-[2em] overflow-hidden rounded-[1.25em] border border-dc-hairline p-[2em]"
            style={GLASS}
          >
            <div className="flex min-h-0 flex-col gap-[2em]">
              <div className="flex flex-col gap-[1.5em]">
                <div className="flex flex-col gap-[1em]">
                  {sessionIsLive ? (
                    <p className="flex items-center gap-[0.75em] text-[1.25em] font-bold leading-[normal] tracking-[-0.0125em] text-[#d7282b]">
                      <span className="size-[0.6em] shrink-0 rounded-full bg-[#d7282b]" />
                      Live now
                    </p>
                  ) : (
                    <p className="text-[1.25em] font-bold leading-[normal] tracking-[-0.0125em] text-dc-purple">
                      Starts in {humanizeWait(minutesUntil(currentSession, nowMs))}
                    </p>
                  )}
                  <h1 className="line-clamp-3 text-[2em] font-bold leading-[1.2] tracking-[-0.0156em] text-dc-fg">
                    {currentSession.title}
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-[1em]">
                  <p className="flex items-center gap-[0.5em] text-[1.25em] leading-[normal] tracking-[-0.0125em] text-dc-muted tabular-nums">
                    <Clock3 className="size-[1.2em] shrink-0" strokeWidth={2} />
                    {formatTimeRange(currentSession)}
                  </p>
                  <TrackPill track={currentSession.track} roomId={currentSession.room?.id} size="lg" />
                  {currentSession.type && (
                    <span className="inline-flex shrink-0 items-center rounded-[0.25em] bg-[#f2f1f4] px-[0.75em] py-[0.25em] text-[1em] font-bold uppercase leading-[normal] tracking-[0.03em] text-dc-fg">
                      {currentSession.type}
                    </span>
                  )}
                </div>
                {currentSession.description && (
                  <p className="line-clamp-3 text-[1.25em] leading-[normal] tracking-[-0.0125em] text-dc-fg">
                    {currentSession.description}
                  </p>
                )}
              </div>
              <Speakers session={currentSession} />
            </div>

            <div className="h-px w-full shrink-0 bg-dc-hairline" />

            <div className="flex shrink-0 items-center gap-[1em]">
              <a
                href={`/schedule/${currentSession.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex shrink-0 items-center rounded-[0.25em] border border-dc-hairline bg-white p-[0.25em]"
              >
                {appQr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={appQr} alt="Session QR code" className="size-[6.5em]" />
                ) : (
                  <span className="size-[6.5em]" />
                )}
              </a>
              <div className="flex min-w-0 flex-col justify-center gap-[0.25em] leading-[normal] tracking-[-0.0125em]">
                <p className="text-[1.25em] font-bold text-dc-purple">Scan to open in the Devcon App</p>
                <p className="text-[1em] text-dc-fg">Watch the livestream if the room is full or follow the live Q&amp;A.</p>
              </div>
            </div>
          </section>
        ) : (
          <section className="flex flex-col gap-[1em] rounded-[1.25em] border border-dc-hairline p-[2em]" style={GLASS}>
            <p className="text-[2em] font-bold leading-[1.2] tracking-[-0.0156em] text-dc-fg">
              No more sessions in {room.name} today.
            </p>
            <p className="text-[1.25em] leading-[normal] tracking-[-0.0125em] text-dc-muted">Thank you for attending!</p>
          </section>
        )}

        <aside
          className="flex max-h-full min-h-0 flex-col gap-[1em]"
          style={{
            maskImage: "linear-gradient(to bottom, black 85%, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, black 85%, transparent)",
          }}
        >
          <h2 className="shrink-0 text-[1.25em] font-bold leading-[normal] tracking-[-0.0125em] text-dc-fg">Up next</h2>
          {laterSessions.length > 0 ? (
            <ul className="flex min-h-0 flex-col gap-[0.5em] overflow-hidden">
              {laterSessions.map((session) => (
                <UpcomingCard key={session.id} session={session} />
              ))}
            </ul>
          ) : (
            <p className="rounded-[0.75em] border border-dc-hairline px-[1.25em] py-[1em] text-[1em] text-dc-muted" style={GLASS}>
              No more sessions in this room today.
            </p>
          )}
        </aside>
      </main>

      {/* FOOTER: the fixed notice and the latest announcements */}
      <footer
        className="relative flex items-center gap-[3em] px-[4em] py-[1em] text-[1em] leading-none text-white"
        style={{ backgroundColor: BAR_BG }}
      >
        <p className="shrink-0 font-bold tracking-[0.03em]">NOTIFICATIONS</p>
        <p className="shrink-0 truncate tracking-[-0.0156em]">{FIXED_NOTICE}</p>
        {latestNotices.map((notice, i) => (
          <p key={i} className="min-w-0 flex-1 truncate tracking-[-0.0156em]">
            {notice}
          </p>
        ))}
      </footer>
    </Surface>
  );
}
