"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import cn from "classnames";
import QRCode from "qrcode";
import { Clock, Users } from "lucide-react";
import APP_CONFIG from "@/CONFIG";
import { useEvent, useRoom, useSessions } from "@/data/hooks";
import type { Session } from "@/data/models";
import { useNowMs } from "@/hooks/useNow";
import { formatTime, getStatus, minutesUntil, streamUrlForDay } from "@/components/schedule/utils";
import { eventDayKey, eventFmt } from "@/data/eventTime";
import { getTrackTheme, trackFullLabel } from "@/components/schedule/trackTheme";
import { MEERKAT_URL, meerkatStageUrl } from "@/app/api/meerkat/handover";
import { roomIconUrl } from "./roomIcon";

/**
 * One design unit: 1% of a 16:9 box fitted inside the viewport (1vw on a
 * 16:9 screen, height-limited on wider or shorter windows such as a laptop
 * with browser chrome). Every size in the kiosk is em off a root font of one
 * unit, so a 1080p TV, a 4K TV and a 1440x900 laptop show the same
 * composition and nothing is ever clipped. Leaf text sets its own em size;
 * containers only space with em so sizes never compound.
 */
const KIOSK_STYLE = {
  "--u": "min(1vw, 1.7778vh)",
  fontSize: "calc(1 * var(--u))",
} as CSSProperties;

/** Pastel track surface + the fixed dark foreground the track system uses. */
const trackColor = (track: string | undefined) => {
  const theme = getTrackTheme(track);
  return { bg: theme.neutral ? "#f5f1fe" : theme.color, fg: "#1a0d33" };
};

/** "45 min" / "2 hours" / "1 day": coarse human duration. */
function humanize(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""}`;
  const d = Math.round(h / 24);
  return `${d} day${d > 1 ? "s" : ""}`;
}

/** Type / expertise / track pills for the session on screen. */
function SessionTags({ session }: { session: Session }) {
  const color = trackColor(session.track);
  const pill = "rounded-full px-[0.9em] py-[0.35em] text-[0.8em] font-bold uppercase leading-none tracking-[0.04em]";
  return (
    <div className="flex flex-wrap items-center gap-[0.5em]">
      {session.type && <span className={cn(pill, "bg-[#dfd8fc] text-dc-fg2")}>{session.type}</span>}
      {session.expertise && (
        <span className={cn(pill, "border border-dc-hairline bg-white text-dc-fg2")}>{session.expertise}</span>
      )}
      {session.track && (
        <span className={pill} style={{ backgroundColor: color.bg, color: color.fg }}>
          {trackFullLabel(session.track)}
        </span>
      )}
    </div>
  );
}

function SpeakerAvatar({ name, avatar }: { name: string; avatar?: string }) {
  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatar} alt="" className="size-full rounded-full object-cover" />
    );
  }
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex size-full items-center justify-center rounded-full bg-[#dfd8fc] text-[0.9em] font-bold text-dc-purple">
      {initials}
    </div>
  );
}

const MAX_SPEAKERS = 4;

/** Speakers as wrapping chips, capped so a panel never pushes the description off screen. */
function Speakers({ session }: { session: Session }) {
  const shown = session.speakers.slice(0, MAX_SPEAKERS);
  const rest = session.speakers.length - shown.length;
  if (shown.length === 0) return null;
  return (
    <ul className="flex flex-wrap items-center gap-x-[1.6em] gap-y-[0.7em]">
      {shown.map((speaker) => (
        <li key={speaker.id} className="flex items-center gap-[0.7em]">
          <span className="size-[3.2em] shrink-0 overflow-hidden rounded-full ring-[0.15em] ring-white">
            <SpeakerAvatar name={speaker.name} avatar={speaker.avatar || undefined} />
          </span>
          <span className="text-[1.4em] font-semibold leading-tight text-dc-fg2">{speaker.name}</span>
        </li>
      ))}
      {rest > 0 && (
        <li className="rounded-full bg-[#dfd8fc] px-[1em] py-[0.5em] text-[1.05em] font-semibold text-dc-fg2">
          +{rest} more
        </li>
      )}
    </ul>
  );
}

/** Upcoming-session row in the side rail; the first one carries the countdown. */
function UpcomingCard({ session, nowMs, first }: { session: Session; nowMs: number; first: boolean }) {
  const color = trackColor(session.track);
  const otherDay = eventDayKey(session.start * 1000) !== eventDayKey(nowMs);
  return (
    <li
      className={cn(
        "flex gap-[1em] rounded-2xl border p-[1.1em]",
        first ? "border-dc-purple/30 bg-white" : "border-dc-hairline bg-white/60"
      )}
    >
      <div className="flex shrink-0 flex-col items-start gap-[0.35em]">
        <span className="text-[1.5em] font-bold leading-none tabular-nums text-dc-fg2">{formatTime(session.start)}</span>
        {otherDay && (
          <span className="text-[0.8em] font-semibold uppercase leading-none tracking-[0.04em] text-dc-muted">
            {eventFmt("en-US", { weekday: "short" }).format(new Date(session.start * 1000))}
          </span>
        )}
        {first && (
          <span className="rounded-full bg-dc-purple px-[0.6em] py-[0.25em] text-[0.75em] font-bold leading-none text-white">
            in {humanize(minutesUntil(session, nowMs))}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-[0.45em]">
        <p className="line-clamp-2 text-[1.15em] font-semibold leading-snug text-dc-fg2">{session.title}</p>
        <p className="flex flex-wrap items-center gap-[0.4em] text-[0.8em] leading-none text-dc-muted">
          {session.track && (
            <span className="rounded-full px-[0.7em] py-[0.3em] font-medium" style={{ backgroundColor: color.bg, color: color.fg }}>
              {trackFullLabel(session.track)}
            </span>
          )}
          {session.speakers.length > 0 && (
            <span className="truncate">
              {session.speakers.slice(0, 2).map((sp) => sp.name).join(", ")}
              {session.speakers.length > 2 ? ` +${session.speakers.length - 2}` : ""}
            </span>
          )}
        </p>
      </div>
    </li>
  );
}

/**
 * QR tile in the Scan box: the code above a coloured label. The whole tile
 * links to the same URL so the screen is usable on a laptop too (a TV never
 * clicks); the app link is relative to stay hydration-safe, the QR itself
 * always encodes the absolute URL.
 */
function QrTile({
  qr,
  href,
  alt,
  label,
  color,
}: {
  qr: string;
  href: string;
  alt: string;
  label: string;
  color: string;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex w-[10em] flex-col items-center gap-[0.6em]">
      <span className="flex aspect-square w-full items-center justify-center rounded-2xl border border-dc-hairline bg-white p-[0.6em]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt={alt} className="size-full" />
      </span>
      <span
        className="w-full rounded-full px-[0.8em] py-[0.5em] text-center text-[0.85em] font-semibold leading-tight text-white"
        style={{ backgroundColor: color }}
      >
        {label}
      </span>
    </a>
  );
}

/** Full-screen surface shared by the kiosk and its loading / error / end-of-day states. */
function Surface({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("fixed inset-0 z-[60] overflow-hidden font-heading leading-[1.35] text-dc-fg2", className)}
      style={KIOSK_STYLE}
    >
      {children}
    </div>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <Surface className="flex items-center justify-center bg-[#0e0a1f] text-white">
      <p className="text-[1.6em]">{children}</p>
    </Surface>
  );
}

/**
 * Full-screen room kiosk for the TVs at each room door, and the same page on
 * a laptop for the AV desk. A branded header (room, seats, date, big clock),
 * then the session on screen in a panel topped with its track colour (status
 * and time range, title, speakers, description, live progress, QR codes for
 * the app, the livestream and Meerkat's presenter view) beside a rail of what
 * follows, and the notifications ticker along the bottom. Sized entirely in design units (see KIOSK_STYLE), so it fits
 * any 16:9 TV and any laptop window. Isolated under components/room-screen.
 */
export function RoomScreen({ roomId }: { roomId: string }) {
  const nowMs = useNowMs();
  const { room, isLoading: roomLoading, isError, error } = useRoom(roomId);
  const { sessions, isLoading: sessionsLoading } = useSessions({ roomId });
  const { event } = useEvent();

  const sorted = useMemo(() => [...sessions].sort((a, b) => a.start - b.start), [sessions]);
  const upcomingSessions = useMemo(
    () => sorted.filter((s) => s.start * 1000 > nowMs).slice(0, 5),
    [sorted, nowMs]
  );
  const currentSession = useMemo(() => {
    const live = sorted.find((s) => getStatus(s, nowMs) === "live");
    return live ?? upcomingSessions[0] ?? null;
  }, [sorted, nowMs, upcomingSessions]);
  const sessionIsLive = currentSession ? getStatus(currentSession, nowMs) === "live" : false;
  // The list beside the Scan box: what follows the session on screen.
  const laterSessions = useMemo(
    () => upcomingSessions.filter((s) => s.id !== currentSession?.id),
    [upcomingSessions, currentSession]
  );
  const nextSession = laterSessions[0] ?? null;

  const [qr, setQr] = useState<{ sessionId: string; url: string } | null>(null);
  const qrSessionId = currentSession?.id ?? null;
  useEffect(() => {
    if (!qrSessionId) return;
    let cancelled = false;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    QRCode.toDataURL(`${origin}/schedule/${qrSessionId}`, { margin: 1, width: 512 })
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

  // "See questions" QR to Meerkat's presenter view for this room's stage
  // (Meerkat stages are our room names): it follows whatever is live or next
  // there, so one code serves the whole day. Shown only when Meerkat lists sessions
  // for the stage: a room screen is online by definition, and a QR into a 404
  // is worse than none. Keyed by stage so a stale code never lingers.
  const stage = room?.name ?? null;
  const [qaQr, setQaQr] = useState<{ stage: string; url: string } | null>(null);
  useEffect(() => {
    if (!stage) return;
    let cancelled = false;
    fetch(`${MEERKAT_URL}/api/v1/events?stage=${encodeURIComponent(stage)}`, {
      headers: { Accept: "application/json" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { data?: unknown[] } | null) =>
        body?.data?.length ? QRCode.toDataURL(meerkatStageUrl(stage), { margin: 1, width: 512 }) : null
      )
      .then((url) => {
        if (!cancelled && url) setQaQr({ stage, url });
      })
      .catch(() => {
        // Meerkat unreachable: no QR for this stage.
      });
    return () => {
      cancelled = true;
    };
  }, [stage]);
  const qaQrUrl = qaQr && qaQr.stage === stage ? qaQr.url : null;

  const streamUrl = streamUrlForDay(room ?? undefined, nowMs, event?.startDate);
  const [streamQr, setStreamQr] = useState<{ streamUrl: string; url: string } | null>(null);
  useEffect(() => {
    if (!streamUrl) return;
    let cancelled = false;
    QRCode.toDataURL(streamUrl, { margin: 1, width: 512 })
      .then((url) => {
        if (!cancelled) setStreamQr({ streamUrl, url });
      })
      .catch(() => {
        // No stream QR.
      });
    return () => {
      cancelled = true;
    };
  }, [streamUrl]);
  const streamQrUrl = streamQr && streamQr.streamUrl === streamUrl ? streamQr.url : null;

  if (!APP_CONFIG.ROOMS_ENABLED) {
    return <div className="p-4 text-dc-muted">Room screens are not enabled</div>;
  }
  if (roomLoading || sessionsLoading) return <Message>Loading…</Message>;
  if (isError || !room) return <Message>{error?.message || "Room not found"}</Message>;

  // End of day.
  if (!currentSession) {
    return (
      <Surface className="flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/login/backdrop.jpg" alt="" className="absolute inset-0 size-full object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(71,4,218,0.6), rgba(14,10,31,0.4))" }}
        />
        <div className="relative flex flex-col items-center gap-[0.6em] p-[2em] text-center text-white">
          <p className="text-[3em] font-bold leading-none">{APP_CONFIG.APP_NAME}</p>
          <p className="text-[2em]">No more sessions in {room.name} today.</p>
          <p className="text-[1.25em]">Thank you for attending!</p>
        </div>
      </Surface>
    );
  }

  const dateLabel = eventFmt("en-US", { weekday: "long", month: "short", day: "numeric" }).format(new Date(nowMs));
  const roomIcon = roomIconUrl(room.id);
  const color = trackColor(currentSession.track);
  const progress = sessionIsLive
    ? Math.min(1, Math.max(0, (nowMs / 1000 - currentSession.start) / (currentSession.end - currentSession.start)))
    : 0;

  return (
    <Surface className="grid grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] bg-[#f9f8fa]">
      {/* HEADER: room identity on the Devcon art, date and a big clock */}
      <header className="relative flex h-[8em] items-center justify-between overflow-hidden px-[2em] text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/login/backdrop.jpg" alt="" className="absolute inset-0 size-full object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgba(22,11,43,0.85) 0%, rgba(71,4,218,0.55) 60%, rgba(22,11,43,0.7) 100%)" }}
        />
        <div className="relative flex min-w-0 items-center gap-[1.2em]">
          {roomIcon && (
            // The stage's theme crest (Masks, Fans, ...), same art as on the venue map.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={roomIcon} alt="" className="h-[5.6em] w-auto shrink-0 drop-shadow-[0_0.15em_0.5em_rgba(0,0,0,0.35)]" />
          )}
          <div className="flex min-w-0 flex-col">
            <h2 className="truncate text-[3em] font-bold leading-[1.25] tracking-[-0.01em]">{room.name}</h2>
            {room.description && <p className="truncate text-[1.4em] leading-[1.3] opacity-85">{room.description}</p>}
          </div>
        </div>
        <div className="relative flex shrink-0 items-center gap-[2em]">
          {room.capacity != null && (
            <p className="flex items-center gap-[0.5em] text-[1.2em] leading-none opacity-90">
              <Users className="size-[1.3em]" />
              {room.capacity} seats
            </p>
          )}
          <div className="flex flex-col items-end gap-[0.35em]">
            <p className="text-[1.2em] leading-none opacity-90">{dateLabel}</p>
            <p className="flex items-center gap-[0.4em] text-[2.6em] font-bold leading-none tabular-nums">
              <Clock className="size-[0.8em] opacity-80" />
              {formatTime(nowMs / 1000)}
            </p>
          </div>
        </div>
      </header>

      {/* BODY: the session on screen, and the rail of what follows */}
      <main className="grid min-h-0 grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-[2em] p-[2em]">
        <section
          className="relative flex min-h-0 flex-col gap-[1em] overflow-hidden rounded-3xl border border-dc-hairline bg-white p-[2em]"
          style={{ borderTopColor: color.bg, borderTopWidth: "0.5em" }}
        >
          <div className="flex shrink-0 flex-wrap items-center gap-x-[1.2em] gap-y-[0.5em]">
            {sessionIsLive ? (
              <p className="flex items-center gap-[0.5em] text-[1.3em] font-bold leading-none text-[#e11d48]">
                <span className="size-[0.6em] rounded-full bg-[#e11d48] motion-safe:animate-pulse" />
                Happening now
              </p>
            ) : (
              <p className="text-[1.3em] font-bold leading-none text-dc-purple">
                Starts in {humanize(minutesUntil(currentSession, nowMs))}
              </p>
            )}
            <p className="text-[1.3em] leading-none tabular-nums text-dc-muted">
              {formatTime(currentSession.start)} – {formatTime(currentSession.end)}
            </p>
            <SessionTags session={currentSession} />
          </div>

          <h1 className="line-clamp-2 shrink-0 text-[3em] font-bold leading-[1.08] tracking-[-0.015em] text-dc-fg2">
            {currentSession.title}
          </h1>
          <div className="shrink-0">
            <Speakers session={currentSession} />
          </div>
          {currentSession.description && (
            <p className="line-clamp-3 shrink-0 text-[1.15em] leading-[1.4] text-dc-fg2/80">{currentSession.description}</p>
          )}

          {sessionIsLive && (
            <div className="h-[0.5em] w-full shrink-0 overflow-hidden rounded-full bg-[#eee9fb]" aria-hidden>
              <div className="h-full rounded-full bg-dc-purple transition-[width] duration-1000" style={{ width: `${progress * 100}%` }} />
            </div>
          )}

          {/* Scan row anchored to the bottom of the panel */}
          <div className="mt-auto flex shrink-0 items-end justify-between gap-[2em] pt-[0.5em]">
            <div className="flex flex-wrap items-start gap-[1.6em]">
              {appQr && (
                <QrTile qr={appQr} href={`/schedule/${currentSession.id}`} alt="Session QR code" label="Open in app" color="#7D52F4" />
              )}
              {streamQrUrl && streamUrl && (
                <QrTile qr={streamQrUrl} href={streamUrl} alt="Livestream QR code" label="Watch livestream" color="#e11d48" />
              )}
              {qaQrUrl && stage && (
                <QrTile qr={qaQrUrl} href={meerkatStageUrl(stage)} alt="Live Q&A QR code" label="See questions" color="#059669" />
              )}
            </div>
            <p className="max-w-[18em] text-right text-[1em] leading-snug text-dc-muted">
              Scan to open the session in the app, watch the livestream if the room is full, or follow the questions.
            </p>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-[1em]">
          <h2 className="text-[1.4em] font-bold leading-none text-dc-fg2">Up next in this room</h2>
          {laterSessions.length > 0 ? (
            <ul
              className="flex min-h-0 flex-col gap-[0.8em] overflow-hidden"
              style={{
                maskImage: "linear-gradient(to bottom, black 88%, transparent)",
                WebkitMaskImage: "linear-gradient(to bottom, black 88%, transparent)",
              }}
            >
              {laterSessions.map((session, i) => (
                <UpcomingCard key={session.id} session={session} nowMs={nowMs} first={i === 0} />
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dc-hairline bg-white/60 p-[1.1em] text-[1.1em] text-dc-muted">
              No more sessions in this room today.
            </p>
          )}
        </aside>
      </main>

      {/* FOOTER: notifications ticker */}
      <footer className="flex h-[3.2em] items-center gap-[1em] border-t border-dc-hairline bg-[#F8F4FF] px-[2em]">
        <p className="shrink-0 rounded-full bg-[#dfd8fc] px-[0.9em] py-[0.35em] text-[0.8em] font-bold uppercase leading-none tracking-[0.04em]">
          Notifications
        </p>
        <div className="flex-1 overflow-hidden">
          <div className="inline-flex whitespace-nowrap text-[1.1em] motion-safe:animate-[marquee_40s_linear_infinite]">
            <span className="mr-[4em]">
              If the room is full please view on livestream or ask volunteers for any overflow rooms.
            </span>
            <span className="mr-[4em]">
              If the room is full please view on livestream or ask volunteers for any overflow rooms.
            </span>
          </div>
        </div>
      </footer>
    </Surface>
  );
}
