"use client";

import { useState, type MutableRefObject } from "react";
import cn from "classnames";
import { ChevronRight, Clock3, Presentation, User } from "lucide-react";
import { CloseButton } from "@/components/Buttons";
import { DetailLink } from "@/routing/DetailLink";
import { formatTimeRange } from "@/components/schedule/utils";
import { iconFor, iconUrl } from "./icons";
import { roomIdForArea } from "./roomAreas";
import { useLiveSessionForArea } from "./useLiveSessionForArea";
import type { Area, PlanLevel } from "./types";

/** Rooms whose card drops its own blurb and divider while a session is live, so the session is the whole story (Scott: Main Stage). */
const SESSION_ONLY_ROOMS = new Set(["main-stage"]);

/**
 * The bottom card that opens when an area is tapped: name, the floor it is on
 * (Scott, 2026-09-21) and a short description, plus — for footprints backed by
 * a schedule room (roomAreas.ts) — the session running there right now, tagged
 * "Live now" like the schedule's time groups. Stays mounted so it can slide
 * out; the last area is kept while it fades.
 *
 * Phones: fixed above the tab bar, full width. Desktop (experiment, Scott
 * 2026-09-17): beside the selected footprint — the scene writes the
 * footprint's screen position onto `anchorRef` as `--poi-x` / `--poi-y` every
 * rendered frame (LevelStack) and the wrapper translates by them, so the card
 * follows the camera without React in the loop.
 */
export function AreaCard({ area, levels, onClose, anchorRef }: { area: Area | null; levels: PlanLevel[]; onClose: () => void; anchorRef?: MutableRefObject<HTMLDivElement | null> }) {
  // Keep the last area while the card slides out (derived state from a prop).
  const [shown, setShown] = useState<Area | null>(area);
  if (area && area !== shown) setShown(area);
  const open = area !== null;
  const icon = shown ? (shown.icon ?? iconFor(shown.id)) : null;
  const floorName = shown ? levels.find((l) => l.id === shown.level)?.name : undefined;
  const live = useLiveSessionForArea(shown?.id ?? null);
  const sessionOnly = live !== null && shown !== null && SESSION_ONLY_ROOMS.has(roomIdForArea(shown.id) ?? "");

  return (
    <div
      ref={anchorRef}
      className={cn(
        // Phones: full width above the tab bar. Desktop: top-left origin translated to the footprint's
        // screen point (off-screen until the scene has written the variables once).
        "fixed bottom-[calc(var(--nav-clearance)+16px)] left-4 right-4 z-20 lg:bottom-auto lg:left-0 lg:right-auto lg:top-0 lg:w-[440px] lg:[translate:var(--poi-x,-9999px)_var(--poi-y,0px)]",
        !open && "pointer-events-none"
      )}
    >
    <div
      role="dialog"
      aria-label={shown?.name}
      aria-hidden={!open}
      className={cn(
        "relative flex flex-col gap-3 rounded-2xl bg-white/95 p-4 shadow-[0_8px_30px_rgba(22,11,43,0.18)] backdrop-blur",
        // The icon disc rides the top edge, mostly above the card: the body only needs to clear its lower ~22px.
        icon && "pt-6",
        "transition-[translate,opacity] duration-150 ease-out motion-reduce:transition-none",
        open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      )}
    >
      {icon && (
        // Theme icon in a flat white disc riding the top edge, ~70% above it (Scott's "POI idea" mock), so the text
        // below shares one left edge and long titles can run under the disc's lower edge.
        <div className="pointer-events-none absolute left-1/2 top-0 flex size-16 -translate-x-1/2 -translate-y-[70%] items-center justify-center rounded-full bg-white/95 backdrop-blur">
          {/* eslint-disable-next-line @next/next/no-img-element -- static PNG under public/, no optimisation wanted */}
          <img src={iconUrl(icon)} alt="" className="size-12 object-contain" />
        </div>
      )}
      {/* Centred on the dialog's top-right corner, half outside it (Scott); white + shadow so it reads against the map. */}
      <CloseButton
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2 bg-white shadow-[0_2px_8px_rgba(22,11,43,0.18)]"
      />
      <div className="flex flex-col pr-3">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 text-[16px] font-bold leading-tight text-dc-fg">{shown?.name}</p>
          {live && (
            // The schedule's live tag (Schedule.tsx), outlined and a size down for the card.
            <span className="shrink-0 rounded-[2px] border border-dc-red px-1.5 py-[3px] text-[11px] font-bold uppercase leading-none tracking-[0.5px] text-dc-red">
              Live now
            </span>
          )}
        </div>
        {floorName && (
          // Which floor the place is on, in the live-session row's meta size; shown even when the blurb is not.
          // Plain text: an icon beside it read as noise (Scott).
          <span className="mt-1.5 text-[12px] leading-none text-dc-muted">{floorName}</span>
        )}
        {shown?.description && !sessionOnly && <p className="mt-1.5 text-[14px] leading-snug text-dc-muted">{shown.description}</p>}
      </div>

      {live && (
        <div className={cn("flex flex-col gap-2", !sessionOnly && "border-t border-dc-hairline pt-3")}>
          {/* Opens the session in place (schedule pane), where the livestream and Q&A live. */}
          <DetailLink kind="session" id={live.id} className="group -mx-1 flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:bg-dc-lavender">
            <span className="line-clamp-2 min-w-0 flex-1 text-[14px] font-bold leading-5 text-dc-fg2 group-hover:text-dc-purple">{live.title}</span>
            <ChevronRight className="size-4 shrink-0 text-dc-muted transition-colors group-hover:text-dc-purple" />
          </DetailLink>
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] leading-none text-dc-muted">
              <Clock3 className="size-3.5 shrink-0" />
              {formatTimeRange(live)}
            </span>
            {live.type && (
              <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] leading-none text-dc-muted">
                <Presentation className="size-3.5 shrink-0" />
                {live.type}
              </span>
            )}
            {live.speakers.length > 0 && (
              <span className="inline-flex min-w-0 items-center gap-1 text-[12px] leading-none text-dc-muted">
                <User className="size-3.5 shrink-0" />
                <span className="truncate">{live.speakers.map((s) => s.name).join(", ")}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
