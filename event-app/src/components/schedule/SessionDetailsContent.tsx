"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { trackEvent } from "@/data/analytics/track";
import APP_CONFIG from "@/CONFIG";
import cn from "classnames";
import { Calendar, CalendarPlus, Clock3, MapPin, Star, Tent } from "lucide-react";
import type { Session, Speaker } from "@/data/models";
import { Link } from "@/routing";
import { useEvent } from "@/data/hooks";
import { useNowMs } from "@/hooks/useNow";
import { useInterested } from "@/data/interested/useInterested";
import { SessionMedia, sessionHasMedia } from "./SessionMedia";
import { SessionSpeakerCard } from "./SessionSpeakerCard";
import { formatDayLabel, formatTimeRange } from "./utils";
import { getTrackTheme, trackFullLabel, type TrackTheme } from "./trackTheme";
import { mapHrefForRoom } from "@/app/(page-layout)/map/venue-map-3d/roomAreas";
import { communityHubTopics, isCommunityHubSession } from "@/data/communityHubs";
import { MarkdownText } from "@/components/MarkdownText";

/** Client-side .ics download — presentation-only "Add to Calendar". */
/**
 * Banner slot when there is no recording or stream: the session's social
 * card, the image a shared link shows (devcon.org renders it per session,
 * 1200x630; the worker caches it like any image, so it stays once seen).
 * When there is none (hub sessions are not in the card renderer's
 * programme, an unknown id, offline before first view), the track artwork on
 * the track colour as before. While the card loads the box shows the track
 * colour alone; the artwork only appears if the card is still missing after
 * FALLBACK_AFTER_MS (a card never rendered before takes devcon.org a few
 * seconds), so the usual cached card doesn't flash artwork first. The box
 * keeps the card's aspect in both states so the swap never moves the content
 * below. Keyed by session: the side panel swaps sessions in place.
 */
const FALLBACK_AFTER_MS = 2000;

function SessionBanner({ session, theme }: { session: Session; theme: TrackTheme }) {
  const [card, setCard] = useState<"loading" | "shown" | "none">(
    isCommunityHubSession(session) ? "none" : "loading"
  );
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), FALLBACK_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);
  const showArtwork = card === "none" || (card === "loading" && waited);
  const cardUrl = `${APP_CONFIG.SOCIAL_CARD_ORIGIN}/api/social/schedule/${encodeURIComponent(session.id)}/`;
  return (
    <div
      className="relative aspect-[1200/630] w-full overflow-hidden rounded-xl"
      style={{ backgroundColor: theme.neutral ? "#f5f1fe" : theme.color }}
    >
      {showArtwork && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2">
          {theme.banner ? (
            // Hub's stacked lockup (mark over name): bigger than the mark, sized
            // off the banner so it scales from the side panel to the expanded page.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={theme.banner} alt={theme.name} className="h-3/5 max-w-[70%] object-contain" />
          ) : (
            theme.gem && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={theme.gem}
                alt={theme.isHub ? theme.name : ""}
                className="size-[120px] object-contain"
              />
            )
          )}
          {/* Hub sessions: the hub's logo is the banner, no caption under it. */}
          {!theme.isHub && (
            <span className="px-4 text-center text-[14px] font-medium leading-5 text-dc-fg2">
              {session.track || theme.name}
            </span>
          )}
        </div>
      )}
      {card !== "none" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cardUrl}
          alt={session.title}
          decoding="async"
          fetchPriority="high"
          onLoad={() => setCard("shown")}
          onError={() => setCard("none")}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            card === "shown" ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </div>
  );
}

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

/** Action pills: 36px / 13px on the mobile page (one size up — the 32px
 *  pills read small on device), the desktop panel's 32px / 12px from lg. */
const pillBase =
  "flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-[13px] leading-none text-dc-fg2 lg:min-h-8 lg:gap-1 lg:px-2 lg:text-[12px]";
const pillClass = cn(pillBase, "border-dc-hairline bg-white");

/**
 * The session blurb, folded to its first six lines (`line-clamp-6` below;
 * the fold depth lives in that class alone) with an ellipsis and a
 * centred bold "Show more" link under it (Scott, 2026-10-14: long abstracts
 * pushed the meta, tags and speakers off the panel). One way only: once
 * opened it stays open, there is no "Show less"; the fold returns when the
 * details close (the caller unmounts or re-keys this). The link shows only
 * while the text really overflows the fold — measured, not guessed from the
 * character count, since the width differs between the side panel, the
 * phone layer and the expanded page — and the measure re-runs on resize, so
 * a blurb that fits after a rotation loses its link and one that stops
 * fitting gains it.
 */
function Description({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (expanded) return;
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      // Inside a hidden tab pane everything measures 0×0: keep the last
      // answer rather than deciding "fits" on nothing.
      if (el.clientHeight === 0) return;
      setOverflows(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, text]);

  return (
    <div className="flex flex-col gap-2">
      {/* [overflow-wrap:anywhere]: descriptions carry long unbroken URLs,
          which otherwise widen the fixed detail layer past the viewport
          (iOS Safari then widens the whole layout viewport). Pretalx
          abstracts are markdown (lists, links, bold), hence MarkdownText;
          the fold clamps across its paragraphs and lists. */}
      <div
        ref={ref}
        className={cn(
          "text-[14px] leading-5 text-dc-fg2 [overflow-wrap:anywhere] [&>*+*]:mt-2",
          !expanded && "line-clamp-6"
        )}
      >
        <MarkdownText text={text} />
      </div>
      {!expanded && overflows && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="self-center cursor-pointer text-[14px] font-bold leading-5 text-dc-purple hover:underline"
        >
          Show more
        </button>
      )}
    </div>
  );
}

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
  const theme = getTrackTheme(session.track, session.room?.id);
  const { isInterested, toggle } = useInterested();
  const interested = isInterested(session.id);

  // The track banner yields to media: recordings always take the top slot,
  // and live/soon sessions may render the room livestream there instead.
  // Asks SessionMedia's own predicate — a live session whose room has no
  // stream configured must fall back to the banner, not an empty slot.
  // Hub sessions are not recorded or streamed; keep the track banner.
  const hasMedia = !isCommunityHubSession(session) && sessionHasMedia(session, nowMs, event?.startDate);

  const location = [session.type, session.room?.name]
    .filter(Boolean)
    .join(" - ");
  const featured = session.featured === true;

  const media = hasMedia ? (
    <SessionMedia session={session} />
  ) : (
    <SessionBanner key={session.id} session={session} theme={theme} />
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

      {/* Title block: title → 8px → (description → 24px → meta → 24px → tags)
          → 16px → pills. The 24px (Scott, 2026-10-14; was 16) gives the
          folded blurb's Show more link air before the meta row, and the
          meta the same before the tags. */}
      <div className="flex flex-col gap-2">
        <h1 className="text-[16px] font-bold leading-6 text-dc-fg2">
          {session.title}
        </h1>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-6">
            {session.description && (
              // Keyed by session so the side panel, which swaps sessions in
              // place, starts every session folded; closing unmounts it.
              <Description key={session.id} text={session.description} />
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
              {/* The location itself is the map link (purple), no separate
                  "Show on map" text: rooms the map knows open on their floor
                  with the footprint highlighted; the rest just open the map. A
                  session without a room keeps the plain "Type" label. */}
              {location && session.room ? (
                <Link
                  href={mapHrefForRoom(session.room.id)}
                  className="inline-flex items-center gap-1 text-[14px] leading-none text-dc-purple underline-offset-2 hover:underline"
                >
                  <MapPin className="size-3.5 shrink-0" />
                  {location}
                </Link>
              ) : location ? (
                <span className="inline-flex items-center gap-1 text-[14px] leading-none text-dc-fg2">
                  <MapPin className="size-3.5 shrink-0" />
                  {location}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Details show the full track name; list/timeline cards keep the
                  short trackBadgeLabel. Hub sessions keep the cards' grammar
                  here too: a rounded pill with the tent glyph, topics as
                  rounded chips (the square track badge is the Pretalx
                  programme's). */}
              <span
                className={cn(
                  "inline-flex items-center px-1.5 py-[3px] text-[12px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg2",
                  theme.isHub ? "gap-1 rounded-full border border-dc-hairline" : "rounded-[2px]",
                  theme.neutral && "border border-dc-hairline bg-white"
                )}
                style={
                  theme.neutral ? undefined : { backgroundColor: theme.color }
                }
              >
                {trackFullLabel(session.track, session.room?.id)}
                {theme.isHub && <Tent className="size-3 shrink-0" aria-hidden />}
              </span>
              {/* Topics as neutral chips after the track badge, sharing its
                  corner radius: square with the Pretalx programme's badge,
                  pills with a hub's (the sheet's Topic column; a hub session
                  has no track of its own). Scott, 2026-10-14: the pills had
                  come in with the hubs and clashed beside the square badge. */}
              {communityHubTopics(session).map((topic) => (
                <span
                  key={topic}
                  className={cn(
                    "border border-dc-hairline bg-white px-1.5 py-[3px] text-[12px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg2",
                    theme.isHub ? "rounded-full" : "rounded-[2px]"
                  )}
                >
                  {topic}
                </span>
              ))}
              {featured && (
                <span className="rounded-[2px] bg-dc-featured px-1.5 py-[3px] text-[12px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg2">
                  Featured
                </span>
              )}
            </div>
          </div>

          {/* Action pills share the row's width equally (flex-1) and wrap
              onto a new line if they can't (the old mobile scroll-and-fade
              row hid the last pill past the screen edge). The map link is
              the location line above. */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void toggle(session.id)}
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
              onClick={() => {
                trackEvent("session", "calendar", session.id);
                downloadSessionIcs(session);
              }}
              className={pillClass}
            >
              <CalendarPlus className="size-4 text-dc-purple" />
              Add to Calendar
            </button>
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
 * - `panel` (desktop side panel): "Speakers" caption first, then Q&A.
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
