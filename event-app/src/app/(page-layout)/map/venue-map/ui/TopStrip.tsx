"use client";

import type { ReactNode } from "react";
import cn from "classnames";
import { Hand, Mouse, MousePointerClick, Move, Pointer, Rotate3d, Smartphone, ZoomIn, type LucideIcon } from "lucide-react";
import { useMediaQuery } from "@/hooks/useIsDesktop";
import { useOnline } from "@/hooks/useOnline";
import { LEVEL_KEYS, LEVELS } from "../data/levels";
import type { LegendEntry } from "../find/catalogue";
import { SINGLE_FLOOR } from "../state/mapStore";

/**
 * The strip along the top of the map the legends share: full width under
 * the status bar on phones (no header bar on /map; the chip row wraps),
 * centred under the header from lg up. Fades out (`hidden`) while the area
 * card or a panel is open; `dismissed` fades it on phones only. `below`
 * renders beneath the chip container (the landscape tip).
 *
 * From lg up the strip is `w-max`: anchored at left 50% it would otherwise
 * shrink to fit the half viewport to its right, and Safari, which lets a
 * button flex item shrink below its content, then squeezed Level 3's eight
 * chips into each other (Chrome holds a button at its content width, so
 * only Safari showed it; Scott, 2026-10-30). Capped at the viewport, where
 * the chips wrap (Level 0's ten chips are wider than a 1024px window).
 */
export function TopStrip({ hidden, dismissed = false, label, below, children }: { hidden: boolean; dismissed?: boolean; label?: string; below?: ReactNode; children: ReactNode }) {
  const online = useOnline();
  return (
    <div
      aria-hidden={hidden}
      aria-label={label}
      className={cn(
        "pointer-events-none fixed inset-x-4 top-[calc(var(--safe-top)+12px)] z-10 flex flex-col items-center gap-2 phone-landscape:left-[max(16px,var(--safe-left))] phone-landscape:right-[max(16px,var(--safe-right))] lg:left-1/2 lg:right-auto lg:top-[80px] lg:w-max lg:max-w-[calc(100vw-32px)] lg:-translate-x-1/2",
        !online && "max-lg:right-[120px]",
        "transition-opacity duration-150 ease-out motion-reduce:transition-none",
        hidden ? "opacity-0" : "opacity-100",
        dismissed && "max-lg:opacity-0"
      )}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-lg border border-dc-hairline bg-white/85 px-3 py-2 backdrop-blur">{children}</div>
      {below}
    </div>
  );
}

/**
 * "Tip: Try landscape mode" under the controls on a phone held upright: the
 * map drops the tab bar sideways and the floor gets the whole short viewport.
 * The phone glyph turns on its side and back every few seconds (still under
 * reduced motion). Gone in landscape and from lg up.
 */
function LandscapeTip() {
  return (
    <p className="inline-flex items-center gap-1.5 rounded-lg border border-dc-hairline bg-white/85 px-3 py-1.5 text-[12px] leading-none text-dc-muted backdrop-blur phone-landscape:hidden lg:hidden">
      <Smartphone className="size-3.5 shrink-0 text-dc-purple motion-safe:animate-map-tip-rotate" aria-hidden />
      <span>
        <span className="font-semibold text-dc-fg2">Tip:</span> Try landscape mode
      </span>
    </p>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-[4px] border border-dc-hairline bg-dc-panel px-1.5 py-0.5 font-sans text-[11px] font-semibold leading-none text-dc-muted">{children}</kbd>;
}

const chip = "inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[12px] leading-none text-dc-muted";

/**
 * What the pointer does, shown while the floors are stacked (and on a
 * one-floor venue until the first gesture). Desktop adds the keyboard chips.
 */
export function ControlsLegend({ hidden, dismissed }: { hidden: boolean; dismissed: boolean }) {
  const touch = useMediaQuery("(pointer: coarse)");
  const items: { Icon: LucideIcon; label: string }[] = touch
    ? [
        ...(SINGLE_FLOOR ? [{ Icon: Pointer, label: "Tap a place" }] : [{ Icon: Pointer, label: "Tap a floor" }]),
        { Icon: Hand, label: "Swipe pans" },
        { Icon: Rotate3d, label: "Two fingers rotate" },
        { Icon: ZoomIn, label: "Pinch zooms" },
        { Icon: Pointer, label: "Double tap zoom-in" },
      ]
    : [
        ...(SINGLE_FLOOR ? [{ Icon: Pointer, label: "Click a place" }] : [{ Icon: Pointer, label: "Click a floor" }]),
        { Icon: Rotate3d, label: "Drag rotates" },
        { Icon: Move, label: "Right-drag pans" },
        { Icon: Mouse, label: "Scroll zooms" },
        { Icon: MousePointerClick, label: "Double click zoom-in" },
      ];
  return (
    <TopStrip hidden={hidden} dismissed={dismissed} below={touch ? <LandscapeTip /> : null}>
      {items.map(({ Icon, label }) => (
        <span key={label} className={chip}>
          <Icon className="size-3.5 shrink-0 text-dc-purple" aria-hidden />
          {label}
        </span>
      ))}
      {!touch && (
        <span className="hidden lg:contents">
          <span aria-hidden className="h-4 w-px bg-dc-hairline" />
          {!SINGLE_FLOOR && (
            <span className={chip}>
              {LEVELS.map((l) => (
                <Kbd key={l.id}>{LEVEL_KEYS[l.id]}</Kbd>
              ))}
              Floors
            </span>
          )}
          <span className={chip}>
            <Kbd>F</Kbd>
            Find
          </span>
          <span className={chip}>
            <Kbd>/</Kbd>
            Search
          </span>
          <span className={chip}>
            <Kbd>Esc</Kbd>
            {SINGLE_FLOOR ? "Reset view" : "All floors"}
          </span>
        </span>
      )}
    </TopStrip>
  );
}

/**
 * Legend for the open floor: one chip per entry (a fill swatch or a theme
 * icon + label); tapping a chip shows its footprints like a Find pick.
 */
export function FloorLegend({ levelName, entries, hidden, onPick }: { levelName: string; entries: LegendEntry[]; hidden: boolean; onPick: (entry: LegendEntry) => void }) {
  return (
    <TopStrip hidden={hidden} label={`${levelName} legend`}>
      {entries.map((entry) => (
        <button key={entry.key} type="button" onClick={() => onPick(entry)} className={cn(chip, "pointer-events-auto cursor-pointer transition-colors duration-150 ease-out hover:text-dc-purple")}>
          {entry.swatch ? (
            <span aria-hidden className="size-3.5 shrink-0 rounded-[4px] border border-black/10" style={{ backgroundColor: entry.swatch }} />
          ) : entry.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- static PNG under public/
            <img src={entry.iconUrl} alt="" className="size-5 shrink-0 object-contain" />
          ) : null}
          {entry.label}
        </button>
      ))}
    </TopStrip>
  );
}
