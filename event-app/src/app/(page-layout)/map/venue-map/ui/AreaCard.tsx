"use client";

import { useState, type MutableRefObject } from "react";
import cn from "classnames";
import { ChevronRight, Clock3, Presentation, User } from "lucide-react";
import { CloseButton } from "@/components/Buttons";
import { DetailLink } from "@/routing/DetailLink";
import { formatTimeRange } from "@/components/schedule/utils";
import { compositeOf, type Area } from "../data/resolve";
import { useLiveSessionForArea } from "./useLiveSessionForArea";

/** Rooms whose card drops its own blurb while a session is live, so the session is the whole story (the Main Stage). */
const SESSION_ONLY_ROOMS = new Set(["main-stage-lotus"]);

/**
 * The card that opens when an area is tapped: theme icon (stages: in the
 * disc on the top edge; everything else inline left of the text), name, the
 * floor it is on, a short description, and for footprints backed by a
 * schedule room the session running there now, tagged "Live now". Stays
 * mounted so it can slide out; the last area is kept while it fades.
 *
 * Phones: fixed above the tab bar, full width. Desktop: beside the selected
 * footprint (the scene writes `--poi-x` / `--poi-y` onto `anchorRef` every
 * rendered frame); a group pick parks it bottom-centre instead.
 */
export function AreaCard({
  area,
  group,
  groupName,
  groupAreas,
  onClose,
  anchorRef,
}: {
  area: Area | null;
  group: boolean;
  /** The group is a composite (the Main Stage): the card is titled after it, with its members as the line beneath. */
  groupName: string | null;
  groupAreas: readonly string[] | null;
  onClose: () => void;
  anchorRef: MutableRefObject<HTMLDivElement | null>;
}) {
  const [shown, setShown] = useState<Area | null>(area);
  if (area && area !== shown) setShown(area);
  const open = area !== null;
  // Closing clears the selection and the group together; only follow `group` while open so the wrapper doesn't jump mid-fade.
  const [shownGroup, setShownGroup] = useState(group);
  if (open && group !== shownGroup) setShownGroup(group);
  // Composite (the Main Stage), held like `shown` so the title doesn't flip while the card fades out.
  // compositeOf returns the same object for the same members, so identity is enough.
  const composite = open && groupName && groupAreas ? compositeOf(groupAreas) : null;
  const [shownComposite, setShownComposite] = useState(composite);
  if (open && composite !== shownComposite) setShownComposite(composite);
  const stage = shown?.category.id === "stages";
  const discIcon = stage ? shown?.iconUrl : null;
  const inlineIcon = stage ? null : shown?.iconUrl;
  const live = useLiveSessionForArea(shown);
  const sessionOnly = live !== null && shown !== null && shown.roomIds.some((r) => SESSION_ONLY_ROOMS.has(r));

  return (
    <div
      ref={anchorRef}
      className={cn(
        "fixed bottom-[calc(var(--nav-clearance)+16px)] left-4 right-4 z-20 lg:w-[440px]",
        shownGroup ? "lg:bottom-6 lg:left-1/2 lg:right-auto lg:-translate-x-1/2" : "lg:bottom-auto lg:left-0 lg:right-auto lg:top-0 lg:[translate:var(--poi-x,-9999px)_var(--poi-y,0px)]",
        !open && "pointer-events-none"
      )}
    >
      <div
        role="dialog"
        aria-label={shownComposite ? shownComposite.name : shown?.name}
        aria-hidden={!open}
        className={cn(
          "relative flex flex-col gap-3 rounded-2xl bg-white/95 p-4 shadow-[0_8px_30px_rgba(22,11,43,0.18)] backdrop-blur",
          discIcon && "pt-6",
          "transition-[translate,opacity] duration-150 ease-out motion-reduce:transition-none",
          open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        )}
      >
        {discIcon && (
          <div className="pointer-events-none absolute left-1/2 top-0 flex size-16 -translate-x-1/2 -translate-y-[70%] items-center justify-center rounded-full bg-white/95 backdrop-blur">
            {/* eslint-disable-next-line @next/next/no-img-element -- static PNG under public/ */}
            <img src={discIcon} alt="" className="size-12 object-contain" />
          </div>
        )}
        <CloseButton onClick={onClose} tabIndex={open ? 0 : -1} className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2 bg-white shadow-[0_2px_8px_rgba(22,11,43,0.18)]" />
        <div className="flex items-start gap-3 pr-3">
          {inlineIcon && (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-[6px]" style={shown?.iconBackdrop ? { backgroundColor: shown.iconBackdrop, padding: 6 } : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element -- static file under public/ */}
              <img src={inlineIcon} alt="" className="size-full object-contain" />
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 text-[16px] font-bold leading-tight text-dc-fg">{shownComposite ? shownComposite.name : shown?.name}</p>
              {live && <span className="shrink-0 rounded-[2px] border border-dc-red px-1.5 py-[3px] text-[11px] font-bold uppercase leading-none tracking-[0.5px] text-dc-red">Live now</span>}
            </div>
            {shown && <span className="mt-1.5 text-[12px] leading-none text-dc-muted">{shownComposite ? `${shownComposite.areas.map((a) => a.name).join(", ")} · ${shown.levelName}` : shown.boothName ? `${shown.boothName} · ${shown.levelName}` : shown.levelName}</span>}
            {(shownComposite ? shownComposite.description : shown?.description) && !sessionOnly && <p className="mt-1.5 text-[14px] leading-snug text-dc-muted">{shownComposite ? shownComposite.description : shown?.description}</p>}
          </div>
        </div>
        {live && (
          <div className={cn("flex flex-col gap-2", !sessionOnly && "border-t border-dc-hairline pt-3")}>
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
