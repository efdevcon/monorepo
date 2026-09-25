"use client";

import { Clock3, MapPin, Star, Tent, User } from "lucide-react";
import cn from "classnames";
import type { Session } from "@/data/models";
import { DetailLink } from "@/routing/DetailLink";
import { useInterested } from "@/data/interested/useInterested";
import { formatTimeRange } from "./utils";
import { getTrackTheme, trackBadgeLabel } from "./trackTheme";

/** Location meta reads "Type - Room" in the design (e.g. "Talk - Main Stage"). */
const locationLabel = (session: Session) =>
  [session.type, session.room?.name].filter(Boolean).join(" - ");

/**
 * A session card (Figma "Event Details Container").
 * Mobile: 8px track-colored rail, 14px title, absolute FEATURED (top-right) and
 * track (bottom-right) badges. Desktop: 60px gem-art rail, 16px title, badges
 * inline. The star toggles the local "Interested" state without navigating.
 *
 * Community Hub sessions (Figma 5168:238) set themselves apart from the
 * Devcon programme: the rail (and the hub's logo in it) moves to the right
 * edge, the track badge becomes a round pill with a hairline border and a
 * tent glyph, and the corner badges shift to clear the right-hand rail.
 *
 * "Featured" is Pretalx's organizer-curated is_featured flag. It replaced the
 * old title/room-based KEYNOTE heuristic (one tag, one signal).
 */
export function SessionCard({
  session,
  selected = false,
  compact = false,
  dense = false,
  onOpen,
}: {
  session: Session;
  /** Desktop side-panel selection highlight. */
  selected?: boolean;
  /** Desktop 2-up grid cell: drops the inline FEATURED badge (Figma 4325). */
  compact?: boolean;
  /**
   * Desktop list inside a detail page (Figma "Expanded Speaker Details"
   * 5114:4036): 14px/20 title with a 12px title→meta gap, instead of the
   * schedule list's 16px/24 + 8px.
   */
  dense?: boolean;
  /** Replaces the default open (desktop selects the side panel instead). */
  onOpen?: (id: string) => void;
}) {
  const theme = getTrackTheme(session.track, session.room?.id);
  const badge = trackBadgeLabel(session.track, session.room?.id);
  const featured = session.featured === true;
  const hub = theme.isHub === true;
  const { isInterested, toggle } = useInterested();
  const interested = isInterested(session.id);

  return (
    <DetailLink
      kind="session"
      id={session.id}
      onOpen={onOpen}
      className={cn(
        "group relative flex gap-4 overflow-clip rounded-lg border bg-white transition-colors duration-150 ease-out",
        // Hub cards: rails sit on the right, so the text gets its own 16px
        // left inset instead of the rail + gap.
        hub && "pl-4",
        selected
          ? "border-dc-purple bg-dc-lavender"
          : "border-dc-hairline hover:border-dc-purple/40"
      )}
    >
      {/* Mobile: 8px track-colored accent rail (right-hand for hub sessions) */}
      <div
        className={cn(
          "w-2 shrink-0 self-stretch lg:hidden",
          theme.neutral && "border-r border-dc-hairline bg-white",
          hub && "order-last rounded-r-[4px]"
        )}
        style={theme.neutral ? undefined : { backgroundColor: theme.color }}
      />

      {/* Desktop: 60px rail with 44px gem artwork */}
      <div
        className={cn(
          "hidden w-[60px] shrink-0 items-center justify-center self-stretch p-1 lg:flex",
          theme.neutral && "border-r border-dc-hairline bg-white",
          hub && "order-last rounded-r-[4px]"
        )}
        style={theme.neutral ? undefined : { backgroundColor: theme.color }}
      >
        {theme.gem && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={theme.gem}
            alt=""
            className="size-11 object-contain"
          />
        )}
      </div>

      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-4 py-4 pl-0",
          // Hub cards: the card's gap-4 already spaces the star from the rail.
          hub ? "pr-0" : "pr-4"
        )}
      >
        <div className={cn("flex min-w-0 flex-1 flex-col", dense ? "gap-3" : "gap-2")}>
          <div className="flex min-w-0 items-center gap-2">
            <h3
              className={cn(
                "line-clamp-2 min-w-0 text-[14px] font-bold leading-5 text-dc-fg lg:text-dc-fg2",
                !dense && "lg:text-[16px] lg:leading-6"
              )}
            >
              {session.title}
            </h3>
            {featured && !compact && (
              <span className="hidden shrink-0 rounded-[4px] bg-dc-featured px-1.5 py-0.5 text-[12px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg2 lg:inline-flex">
                Featured
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 pr-10 lg:pr-0">
            {/* Desktop: inline track badge leads the meta row */}
            <span
              className={cn(
                "hidden shrink-0 items-center px-1.5 py-[3px] text-[12px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg2 lg:inline-flex",
                hub ? "gap-1 rounded-full border border-dc-hairline" : "rounded-[4px]",
                theme.neutral && "border border-dc-hairline bg-white"
              )}
              style={
                theme.neutral ? undefined : { backgroundColor: theme.color }
              }
            >
              {badge}
              {hub && <Tent className="size-3 shrink-0" aria-hidden />}
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] leading-4 text-dc-muted">
              <Clock3 className="size-3.5 shrink-0" />
              {formatTimeRange(session)}
            </span>
            {session.speakers.length > 0 && (
              <span className="inline-flex min-w-0 items-center gap-1 text-[12px] leading-4 text-dc-muted">
                <User className="size-3.5 shrink-0" />
                <span className="truncate">
                  {session.speakers.map((s) => s.name).join(", ")}
                </span>
              </span>
            )}
            {locationLabel(session) && (
              <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] leading-4 text-dc-muted">
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
            void toggle(session.id);
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

      {/* Mobile: absolute corner badge */}
      {featured && (
        <span
          className={cn(
            "absolute top-0 rounded-bl-[2px] bg-dc-featured px-2 py-1 text-[10px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg",
            // Hub cards: clear the right-hand rail (8px mobile, 60px desktop).
            hub ? "right-2 lg:right-[60px]" : "right-0",
            // Compact 2-up desktop cells drop the inline chip (Figma 4325),
            // so the corner badge steps in there — Featured must always be
            // visible.
            compact ? "" : "lg:hidden"
          )}
        >
          Featured
        </span>
      )}
      <span
        className={cn(
          "absolute bottom-2 px-1.5 py-[3px] text-[10px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg lg:hidden",
          // Hub cards: round pill + tent, 8px clear of the right-hand rail.
          hub
            ? "right-4 flex items-center gap-1 rounded-full border border-dc-hairline"
            : "right-2 rounded-[2px]",
          theme.neutral && "border border-dc-hairline bg-white"
        )}
        style={theme.neutral ? undefined : { backgroundColor: theme.color }}
      >
        {badge}
        {hub && <Tent className="size-2.5 shrink-0" aria-hidden />}
      </span>
    </DetailLink>
  );
}
