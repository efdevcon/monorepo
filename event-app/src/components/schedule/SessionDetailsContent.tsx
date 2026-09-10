"use client";

import cn from "classnames";
import { Calendar, CalendarPlus, Clock3, MapPin, Star } from "lucide-react";
import type { Session, Speaker } from "@/data/models";
import { Link } from "@/routing";
import { useEvent } from "@/data/hooks";
import { useNowMs } from "@/hooks/useNow";
import { useInterested } from "@/data/interested/useInterested";
import { SessionMedia, sessionHasMedia } from "./SessionMedia";
import { SessionSpeakerCard } from "./SessionSpeakerCard";
import { formatDayLabel, formatTimeRange } from "./utils";
import { getTrackTheme, trackFullLabel } from "./trackTheme";

/** Client-side .ics download — presentation-only "Add to Calendar". */
export function downloadSessionIcs(session: Session) {
  const dt = (unix: number) =>
    new Date(unix * 1000)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const escape = (s: string) =>
    s.replace(/([,;\\])/g, "\\$1").replace(/\r?\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Devcon//Event App//EN",
    "BEGIN:VEVENT",
    `UID:${session.id}@devcon.org`,
    // DTSTAMP is required by RFC 5545; some calendar apps reject files without it.
    `DTSTAMP:${dt(Math.floor(Date.now() / 1000))}`,
    `DTSTART:${dt(session.start)}`,
    `DTEND:${dt(session.end)}`,
    `SUMMARY:${escape(session.title)}`,
    session.room?.name ? `LOCATION:${escape(session.room.name)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${session.id}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

const pillBase =
  "flex min-h-8 shrink-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-[12px] leading-none text-dc-fg2";
const pillClass = cn(pillBase, "border-dc-hairline bg-white");

/**
 * Session summary (Figma "Session details" section 1): media or track banner,
 * then title / description / meta / tags / action pills. Owns its 16px
 * padding and 24px stacking; the caller adds borders. `heading` renders the
 * "Session details" caption the expanded desktop view shows above the media.
 */
export function SessionSummary({
  session,
  heading,
}: {
  session: Session;
  heading?: string;
}) {
  const nowMs = useNowMs(60_000);
  const { event } = useEvent();
  const theme = getTrackTheme(session.track);
  const { isInterested, toggle } = useInterested();
  const interested = isInterested(session.id);

  // The track banner yields to media: recordings always take the top slot,
  // and live/soon sessions may render the room livestream there instead.
  // Asks SessionMedia's own predicate — a live session whose room has no
  // stream configured must fall back to the banner, not an empty slot.
  const hasMedia = sessionHasMedia(session, nowMs, event?.startDate);

  const location = [session.type, session.room?.name]
    .filter(Boolean)
    .join(" - ");
  const featured = session.featured === true;

  const media = hasMedia ? (
    <SessionMedia session={session} />
  ) : (
    <div
      className="flex aspect-[160/90] w-full flex-col items-center justify-center gap-2 rounded-xl"
      style={{
        backgroundColor: theme.neutral ? "#f5f1fe" : theme.color,
      }}
    >
      {theme.gem && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={theme.gem}
          alt=""
          className="size-[120px] object-contain"
        />
      )}
      <span className="px-4 text-center text-[14px] font-medium leading-5 text-dc-fg2">
        {session.track || theme.name}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 p-4">
      {heading ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-[16px] font-bold leading-6 text-dc-fg">
            {heading}
          </h2>
          {media}
        </div>
      ) : (
        media
      )}

      {/* Title block: title → 8px → (description → 16px → meta → 16px → tags → 16px → pills) */}
      <div className="flex flex-col gap-2">
        <h1 className="text-[16px] font-bold leading-6 text-dc-fg2">
          {session.title}
        </h1>
        <div className="flex flex-col gap-4">
          {session.description && (
            // [overflow-wrap:anywhere]: descriptions carry long unbroken
            // URLs, which otherwise widen the fixed detail layer past the
            // viewport (iOS Safari then widens the whole layout viewport).
            <p className="text-[14px] leading-5 text-dc-fg2 [overflow-wrap:anywhere]">
              {session.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[14px] leading-none text-dc-fg2">
              <Calendar className="size-3.5 shrink-0" />
              {formatDayLabel(session)}
            </span>
            <span className="inline-flex items-center gap-1 text-[14px] leading-none text-dc-fg2">
              <Clock3 className="size-3.5 shrink-0" />
              {formatTimeRange(session)}
            </span>
            {location && (
              <span className="inline-flex items-center gap-1 text-[14px] leading-none text-dc-fg2">
                <MapPin className="size-3.5 shrink-0" />
                {location}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Details show the full track name; list/timeline cards keep the
                short trackBadgeLabel. */}
            <span
              className={cn(
                "rounded-[2px] px-1.5 py-[3px] text-[12px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg2",
                theme.neutral && "border border-dc-hairline bg-white"
              )}
              style={
                theme.neutral ? undefined : { backgroundColor: theme.color }
              }
            >
              {trackFullLabel(session.track)}
            </span>
            {featured && (
              <span className="rounded-[2px] bg-dc-featured px-1.5 py-[3px] text-[12px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg2">
                Featured
              </span>
            )}
          </div>

          {/* Action pills, horizontally scrollable with a right fade */}
          <div className="relative -mr-4">
            <div className="flex gap-3 overflow-x-auto pr-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => void toggle(session.id, session.title)}
                className={cn(
                  pillBase,
                  interested
                    ? "border-dc-purple bg-dc-lavender"
                    : "border-dc-hairline bg-white"
                )}
              >
                <Star
                  className={cn(
                    "size-4 text-dc-purple",
                    interested ? "fill-dc-purple" : "fill-transparent"
                  )}
                />
                {interested ? "Interested" : "Add to Interests"}
              </button>
              <button
                onClick={() => downloadSessionIcs(session)}
                className={pillClass}
              >
                <CalendarPlus className="size-4 text-dc-purple" />
                Add to Calendar
              </button>
              <Link href="/map" className={pillClass}>
                <MapPin className="size-4 text-dc-purple" />
                Show on Map
              </Link>
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[52px] bg-gradient-to-l from-dc-panel to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Speakers list. `sm` is the side panel's 14px "Speakers" caption; `md` is
 * the 16px "Speakers (N)" heading the mobile page and expanded view use.
 */
export function SessionSpeakers({
  speakers,
  size = "sm",
}: {
  speakers: Speaker[];
  size?: "sm" | "md";
}) {
  if (speakers.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {size === "md" ? (
        <h2 className="text-[16px] font-bold leading-6 text-dc-fg">
          Speakers <span className="font-normal">({speakers.length})</span>
        </h2>
      ) : (
        <h2 className="text-[14px] font-bold leading-5 text-dc-fg2">
          Speakers
        </h2>
      )}
      {speakers.map((speaker) => (
        <SessionSpeakerCard key={speaker.id} speaker={speaker} />
      ))}
    </div>
  );
}

/**
 * Single-column session details: summary section, then speakers + Q&A. The
 * Q&A block is passed as children so its logic stays owned by the page.
 * - `panel` (desktop side panel): "Speakers" caption first, then Q&A teaser.
 * - `page` (mobile fullscreen): Q&A first, then "Speakers (N)".
 */
export function SessionDetailsContent({
  session,
  children,
  variant = "panel",
}: {
  session: Session;
  children?: React.ReactNode;
  variant?: "panel" | "page";
}) {
  return (
    <div className="flex flex-col bg-dc-panel">
      <div className="border-b border-dc-hairline">
        <SessionSummary session={session} />
      </div>
      <div className="flex flex-col gap-6 p-4">
        {variant === "page" ? (
          <>
            {children}
            <SessionSpeakers speakers={session.speakers} size="md" />
          </>
        ) : (
          <>
            <SessionSpeakers speakers={session.speakers} size="sm" />
            {children}
          </>
        )}
      </div>
    </div>
  );
}
