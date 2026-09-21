"use client";

import { MapPin } from "lucide-react";
import { TopStrip } from "./ControlsLegend";
import { iconUrl } from "./icons";
import type { LegendEntry } from "./legend";
import type { PlanLevel } from "./types";

/**
 * Legend for the open floor, in the top strip the controls legend uses while
 * the floors are stacked (the two swap; Scott, 2026-09-21): one chip per
 * legend entry (legend.ts), either a theme icon or a rounded swatch in the
 * footprints' fill, plus a short label. Tapping a chip shows its footprints
 * the way a Find pick does (a swatch chip highlights every room of that
 * colour). Fades out with the area card or a panel, like the controls legend.
 */
export function FloorLegend({ level, entries, hidden, onPick }: { level: PlanLevel; entries: LegendEntry[]; hidden: boolean; onPick: (entry: LegendEntry) => void }) {
  return (
    <TopStrip hidden={hidden} label={`${level.name} legend`}>
      {entries.map((entry) => (
        <button
          key={entry.key}
          type="button"
          onClick={() => onPick(entry)}
          className="pointer-events-auto inline-flex cursor-pointer items-center gap-1 whitespace-nowrap text-[12px] leading-none text-dc-muted transition-colors duration-150 ease-out hover:text-dc-purple"
        >
          {entry.swatch ? (
            <span aria-hidden className="size-3.5 shrink-0 rounded-[4px] border border-black/10" style={{ backgroundColor: entry.swatch }} />
          ) : entry.icon ? (
            // eslint-disable-next-line @next/next/no-img-element -- static PNG under public/, no optimisation wanted
            <img src={iconUrl(entry.icon)} alt="" className="size-5 shrink-0 object-contain" />
          ) : (
            <MapPin className="size-3.5 shrink-0 text-dc-purple" aria-hidden />
          )}
          {entry.label}
        </button>
      ))}
    </TopStrip>
  );
}
