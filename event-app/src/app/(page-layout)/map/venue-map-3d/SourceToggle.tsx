"use client";

import { useLayoutEffect, useRef, useState } from "react";
import cn from "classnames";
import type { MapSource } from "./types";

const OPTIONS: { source: MapSource; label: string }[] = [
  { source: "iso", label: "ISO import" },
  { source: "plan", label: "Top-down redraw" },
];

/**
 * Segmented control (same recessed-track pattern as the schedule's
 * List/Timeline toggle) for switching the map between the two prototype
 * sources. Sits under the app header, centred over the map.
 */
export function SourceToggle({ value, onChange }: { value: MapSource; onChange: (s: MapSource) => void }) {
  const buttonRefs = useRef(new Map<MapSource, HTMLButtonElement | null>());
  const [indicator, setIndicator] = useState<{ x: number; w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = buttonRefs.current.get(value);
    if (!el) return;
    setIndicator({ x: el.offsetLeft, w: el.offsetWidth, h: el.offsetHeight });
  }, [value]);

  return (
    <div
      role="radiogroup"
      aria-label="Map source"
      className="fixed left-1/2 top-[calc(3.5rem+var(--safe-top)+12px)] z-20 flex h-10 -translate-x-1/2 items-center gap-1 rounded-lg bg-dc-lavender p-1 shadow-[inset_0px_1px_1px_rgba(34,17,68,0.15),inset_0px_2px_4px_rgba(34,17,68,0.06)] lg:top-[80px] lg:bg-dc-panel"
    >
      <div
        aria-hidden
        style={indicator ? { transform: `translateX(${indicator.x}px)`, width: indicator.w, height: indicator.h } : { visibility: "hidden" }}
        className="absolute left-0 top-1 rounded-[4px] bg-white shadow-[0px_1px_3px_rgba(22,11,43,0.1),0px_1px_2px_rgba(22,11,43,0.1)] transition-[transform,width] duration-150 ease-out motion-reduce:transition-none"
      />
      {OPTIONS.map(({ source, label }) => (
        <button
          key={source}
          type="button"
          role="radio"
          aria-checked={value === source}
          ref={(el) => {
            buttonRefs.current.set(source, el);
          }}
          onClick={() => onChange(source)}
          className={cn(
            "relative z-10 min-h-8 cursor-pointer whitespace-nowrap rounded-[4px] px-3 py-1 text-[14px] leading-none transition-colors",
            value === source ? "font-bold text-dc-purple" : "font-medium text-dc-muted hover:text-dc-fg2"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
