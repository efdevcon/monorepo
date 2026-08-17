"use client";

import { Clock3, MapPin, Star, User } from "lucide-react";
import cn from "classnames";
import type { Session } from "@/data/models";
import { Link } from "@/routing";
import { useInterested } from "@/data/interested/useInterested";
import { formatTimeRange } from "./utils";
import { getTrackTheme, trackBadgeLabel } from "./trackTheme";

const isKeynote = (session: Session) =>
  session.type?.toLowerCase() === "keynote";

/** Location meta reads "Type - Room" in the design (e.g. "Talk - Main Stage"). */
const locationLabel = (session: Session) =>
  [session.type, session.room?.name].filter(Boolean).join(" - ");

/**
 * A session card (Figma "Event Details Container").
 * Mobile: 8px track-colored rail, 14px title, absolute KEYNOTE (top-right) and
 * track (bottom-right) badges. Desktop: 60px gem-art rail, 16px title, badges
 * inline. The star toggles the local "Interested" state without navigating.
 */
export function SessionCard({
  session,
  selected = false,
  compact = false,
  onOpen,
}: {
  session: Session;
  /** Desktop side-panel selection highlight. */
  selected?: boolean;
  /** Desktop 2-up grid cell: drops the inline KEYNOTE badge (Figma 4325). */
  compact?: boolean;
  /**
   * Desktop: open the session details side panel instead of navigating.
   * Mobile keeps the normal link navigation to /schedule/[id].
   */
  onOpen?: (id: string) => void;
}) {
  const theme = getTrackTheme(session.track);
  const badge = trackBadgeLabel(session.track);
  const keynote = isKeynote(session);
  const { isInterested, toggle } = useInterested();
  const interested = isInterested(session.id);

  return (
    <Link
      href={`/schedule/${session.id}`}
      onClick={(e) => {
        if (onOpen && window.matchMedia("(min-width: 1024px)").matches) {
          e.preventDefault();
          onOpen(session.id);
        }
      }}
      className={cn(
        "group relative flex gap-4 overflow-clip rounded-lg border bg-white transition-colors duration-150 ease-out",
        selected
          ? "border-dc-purple bg-dc-lavender"
          : "border-dc-hairline hover:border-dc-purple/40"
      )}
    >
      {/* Mobile: 8px track-colored accent rail */}
      <div
        className={cn(
          "w-2 shrink-0 self-stretch lg:hidden",
          theme.neutral && "border-r border-dc-hairline bg-white"
        )}
        style={theme.neutral ? undefined : { backgroundColor: theme.color }}
      />

      {/* Desktop: 60px rail with 44px gem artwork */}
      <div
        className={cn(
          "hidden w-[60px] shrink-0 items-center justify-center self-stretch p-1 lg:flex",
          theme.neutral && "border-r border-dc-hairline bg-white"
        )}
        style={theme.neutral ? undefined : { backgroundColor: theme.color }}
      >
        {theme.gem && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={theme.gem}
            alt=""
            className="size-11 object-contain"
            loading="lazy"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-4 py-4 pl-0 pr-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="line-clamp-2 min-w-0 text-[14px] font-bold leading-5 text-dc-fg lg:text-[16px] lg:leading-6 lg:text-dc-fg2">
              {session.title}
            </h3>
            {keynote && !compact && (
              <span className="hidden shrink-0 rounded-[4px] bg-dc-keynote px-1.5 py-0.5 text-[12px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg2 lg:inline-flex">
                Keynote
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 pr-10 lg:pr-0">
            {/* Desktop: inline track badge leads the meta row */}
            <span
              className={cn(
                "hidden shrink-0 items-center rounded-[4px] px-1.5 py-[3px] text-[12px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg2 lg:inline-flex",
                theme.neutral && "border border-dc-hairline bg-white"
              )}
              style={
                theme.neutral ? undefined : { backgroundColor: theme.color }
              }
            >
              {badge}
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] leading-none text-dc-muted">
              <Clock3 className="size-3.5 shrink-0" />
              {formatTimeRange(session)}
            </span>
            {session.speakers.length > 0 && (
              <span className="inline-flex min-w-0 items-center gap-1 text-[12px] leading-none text-dc-muted">
                <User className="size-3.5 shrink-0" />
                <span className="truncate">
                  {session.speakers.map((s) => s.name).join(", ")}
                </span>
              </span>
            )}
            {locationLabel(session) && (
              <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] leading-none text-dc-muted">
                <MapPin className="size-3.5 shrink-0" />
                {locationLabel(session)}
              </span>
            )}
          </div>
        </div>

        <button
          aria-label={
            interested ? "Remove from interested" : "Add to interested"
          }
          aria-pressed={interested}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void toggle(session.id, session.title);
          }}
          className="group/star -m-2 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-dc-purple-soft"
        >
          <Star
            className={cn(
              "size-5 transition-colors",
              interested
                ? "fill-dc-purple text-dc-purple"
                : "fill-transparent text-dc-fg group-hover/star:text-dc-purple lg:text-dc-muted lg:group-hover/star:text-dc-purple"
            )}
          />
        </button>
      </div>

      {/* Mobile: absolute corner badges */}
      {keynote && (
        <span className="absolute right-0 top-0 rounded-bl-[2px] bg-dc-keynote px-2 py-1 text-[10px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg lg:hidden">
          Keynote
        </span>
      )}
      <span
        className={cn(
          "absolute bottom-2 right-2 rounded-[2px] px-1.5 py-[3px] text-[10px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg lg:hidden",
          theme.neutral && "border border-dc-hairline bg-white"
        )}
        style={theme.neutral ? undefined : { backgroundColor: theme.color }}
      >
        {badge}
      </span>
    </Link>
  );
}
