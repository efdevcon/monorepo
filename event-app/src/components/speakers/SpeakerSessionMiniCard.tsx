"use client";

import { Clock3, MapPin, Star, Tent, User } from "lucide-react";
import cn from "classnames";
import type { Session } from "@/data/models";
import { DetailLink } from "@/routing/DetailLink";
import { useInterested } from "@/data/interested/useInterested";
import { formatTimeRange } from "@/components/schedule/utils";
import {
  getTrackTheme,
  trackBadgeLabel,
} from "@/components/schedule/trackTheme";
import { shortCommunityHubName } from "@/data/communityHubs";

/** Location meta reads "Type - Room" in the design (e.g. "Talk - Main Stage"); hub rooms lose their "Hub". */
const locationLabel = (session: Session) =>
  [session.type, session.room?.name && shortCommunityHubName(session.room.name)].filter(Boolean).join(" - ");

/**
 * Compact session card in the speaker details (Figma "Event Details
 * Container"): SessionCard's mobile presentation — 8px track rail, corner
 * FEATURED/track badges — forced at every breakpoint, since the 360px panel
 * renders at desktop widths. The star toggles the session's "Interested"
 * state (session ids, not speaker ids) without navigating. Hub sessions keep
 * SessionCard's hub grammar too (rail on the right, round pill with the tent),
 * so a reminder on Home reads like the same session in the inbox.
 */
export function SpeakerSessionMiniCard({ session }: { session: Session }) {
  const theme = getTrackTheme(session.track, session.room?.id);
  const hub = theme.isHub === true;
  const featured = session.featured === true;
  const { isInterested, toggle } = useInterested();
  const interested = isInterested(session.id);

  return (
    <DetailLink
      kind="session"
      id={session.id}
      className={cn(
        "group relative flex gap-4 overflow-clip rounded-lg border border-dc-hairline bg-white transition-colors duration-150 ease-out hover:border-dc-purple/40",
        // Hub cards: the rail sits on the right, so the text gets its own inset.
        hub && "pl-4"
      )}
    >
      {/* 8px track-colored accent rail (right-hand for hub sessions) */}
      <div
        className={cn(
          "w-2 shrink-0 self-stretch",
          theme.neutral && "border-r border-dc-hairline bg-white",
          hub && "order-last rounded-r-[4px]"
        )}
        style={theme.neutral ? undefined : { backgroundColor: theme.color }}
      />

      <div className="flex min-w-0 flex-1 items-center gap-4 py-4 pl-0 pr-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h3 className="line-clamp-2 min-w-0 pr-10 text-[14px] font-bold leading-5 text-dc-fg2">
            {session.title}
          </h3>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 pr-10">
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
                : "fill-transparent text-dc-muted group-hover/star:text-dc-purple"
            )}
          />
        </button>
      </div>

      {/* Absolute corner badges (mobile SessionCard grammar) */}
      {featured && (
        <span
          className={cn(
            "absolute top-0 rounded-bl-[2px] bg-dc-featured px-2 py-1 text-[10px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg",
            hub ? "right-2" : "right-0"
          )}
        >
          Featured
        </span>
      )}
      <span
        className={cn(
          "absolute bottom-2 px-1.5 py-[3px] text-[10px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg",
          // Hub cards: round pill + tent, 8px clear of the right-hand rail.
          hub
            ? "right-4 flex items-center gap-1 rounded-full border border-dc-hairline"
            : "right-2 rounded-[2px]",
          theme.neutral && "border border-dc-hairline bg-white"
        )}
        style={theme.neutral ? undefined : { backgroundColor: theme.color }}
      >
        {trackBadgeLabel(session.track, session.room?.id)}
        {hub && <Tent className="size-2.5 shrink-0" aria-hidden />}
      </span>
    </DetailLink>
  );
}
