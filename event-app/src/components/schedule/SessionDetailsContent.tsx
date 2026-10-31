"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/data/analytics/track";
import { mapHrefForRoom } from "@/app/(page-layout)/map/venue-map/data/roomAreas";
import APP_CONFIG from "@/CONFIG";
import cn from "classnames";
import { Calendar, CalendarPlus, Clock3, MapPin, Star, Tent, Users } from "lucide-react";
import type { Session, Speaker } from "@/data/models";
import { Link } from "@/routing";
import { useEvent } from "@/data/hooks";
import { useNowMs } from "@/hooks/useNow";
import { useInterested } from "@/data/interested/useInterested";
import { SessionMedia, sessionHasMedia } from "./SessionMedia";
import { SessionSpeakerCard } from "./SessionSpeakerCard";
import { formatDayLabel, formatTimeRange } from "./utils";
import { getTrackTheme, trackFullLabel, type TrackTheme } from "./trackTheme";
import { communityHubTopics, isCommunityHubSession } from "@/data/communityHubs";
import { MarkdownText } from "@/components/MarkdownText";
import { ShareMenu } from "@/components/ShareMenu";
import { FoldedText } from "@/components/FoldedText";
import { sessionCardUrl } from "@/data/sessionCard";

/** Client-side .ics download — presentation-only "Add to Calendar". */
/**
 * Banner slot when there is no recording or stream: the session's social
 * card, the image a shared link shows (devcon.org renders it per session,
 * 1200x630; the worker caches it like any image, and the URL carries a hash
 * of what the card shows, so it stays until the session changes and is
 * fetched again after that: src/data/sessionCard.ts).
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
  const cardUrl = sessionCardUrl(APP_CONFIG.SOCIAL_CARD_ORIGIN, session);
  return (
    <div
      className="relative aspect-[1200/630] w-full overflow-hidden rounded-xl"
      style={{ backgroundColor: theme.neutral ? "#f5f1fe" : theme.color }}
    >
      {showArtwork && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2">
          {theme.banner ? (
            // Hub's stacked lockup (mark over name): bigger than the mark, sized
            // off the banner so it scales from the side panel to the expanded page
            // (3/4 of its height, up a quarter from 3/5; Scott, 2026-10-27).
            // eslint-disable-next-line @next/next/no-img-element
            <img src={theme.banner} alt={theme.name} className="h-3/4 max-w-[87.5%] object-contain" />
          ) : (
            theme.gem && (
              // A hub's mark sits smaller than a track gem, with the name under it (Scott, 2026-10-27).
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={theme.gem}
                alt={theme.isHub ? theme.name : ""}
                className={cn("object-contain", theme.isHub ? "size-[88px]" : "size-[120px]")}
              />
            )
          )}
          {/* Hub sessions: the hub's lockup is the banner, no caption under it. A hub
              without a lockup (the Music Stage) shows its mark with its name under it,
              in the foreground colour (Scott, 2026-10-27). */}
          {theme.isHub
            ? !theme.banner && (
                <span className="px-4 text-center text-[16px] font-medium leading-6 text-dc-fg">{theme.name}</span>
              )
            : (
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
 * The session blurb, folded to three lines on phones and six from lg (the
 * shared FoldedText: "Show more" inline on phones, centred from lg, one
 * way only). Pretalx abstracts are markdown (lists, links, bold), hence
 * MarkdownText; the fold clamps across its paragraphs and lists.
 */
function Description({ text }: { text: string }) {
  return (
    <FoldedText
      text={text}
      clamp="line-clamp-3 lg:line-clamp-6"
      lineHeight={20}
      className="text-[14px] leading-5 text-dc-fg2"
      contentClassName="[&>*+*]:mt-2"
    >
      <MarkdownText text={text} />
    </FoldedText>
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
  const mapHref = mapHrefForRoom(session.room?.id);

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
  // Pretalx asks speakers for a short abstract and an optional long
  // description; the page showed the description, which reads as the long
  // form (speakers' feedback, 2026-10-28). The abstract leads, the
  // description stands in while a bundle predates the field or a hub session
  // (sheet rows carry one text) has nothing else.
  const blurb = session.abstract || session.description;

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
            {blurb && (
              // Keyed by session so the side panel, which swaps sessions in
              // place, starts every session folded; closing unmounts it.
              <Description key={session.id} text={blurb} />
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
                  href={mapHref}
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
                  short trackBadgeLabel. Community sessions (hubs and
                  community-led groups) keep the cards' grammar here too: a
                  rounded pill with the tent or people glyph, topics as
                  rounded chips (the square track badge is the Pretalx
                  programme's). */}
              <span
                className={cn(
                  "inline-flex items-center px-1.5 py-[3px] text-[12px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg2",
                  theme.isCommunity ? "gap-1 rounded-full border border-dc-hairline" : "rounded-[2px]",
                  theme.neutral && "border border-dc-hairline bg-white"
                )}
                style={
                  theme.neutral ? undefined : { backgroundColor: theme.color }
                }
              >
                {trackFullLabel(session.track, session.room?.id)}
                {theme.isHub && <Tent className="size-3 shrink-0" aria-hidden />}
                {theme.isCLS && <Users className="size-3 shrink-0" aria-hidden />}
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
                    theme.isCommunity ? "rounded-full" : "rounded-[2px]"
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
              the location line above. Share sits between Interested and the
              calendar on every layout, the page's one share entry point
              (Scott, 2026-10-27). Short labels and the 8px phone gap keep all
              three on one row from 356px wide. */}
          <div className="flex flex-wrap gap-2 lg:gap-3">
            <button
              onClick={() => void toggle(session.id)}
              aria-pressed={interested}
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
              Interested
            </button>
            <ShareMenu kind="session" id={session.id} title={session.title} className={pillClass} />
            <button
              onClick={() => {
                trackEvent("session", "calendar", session.id);
                downloadSessionIcs(session);
              }}
              aria-label="Add to Calendar"
              className={pillClass}
            >
              <CalendarPlus className="size-4 text-dc-purple" />
              Calendar
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
