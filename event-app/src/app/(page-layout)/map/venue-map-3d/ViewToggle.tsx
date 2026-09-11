"use client";

import { useLayoutEffect, useRef, useState } from "react";
import cn from "classnames";
import { Box, Map as MapIcon } from "lucide-react";
import type { MapView } from "./types";

const OPTIONS: { view: MapView; label: string; Icon: typeof Box }[] = [
  { view: "3d", label: "3D", Icon: Box },
  { view: "top", label: "Top-down", Icon: MapIcon },
];

/**
 * 3D / top-down camera switch, top right. Same segmented pattern as
 * SourceToggle, sharing its row (source left, view right).
 */
export function ViewToggle({ value, onChange }: { value: MapView; onChange: (v: MapView) => void }) {
  const buttonRefs = useRef(new Map<MapView, HTMLButtonElement | null>());
  const [indicator, setIndicator] = useState<{ x: number; w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = buttonRefs.current.get(value);
    if (!el) return;
    setIndicator({ x: el.offsetLeft, w: el.offsetWidth, h: el.offsetHeight });
  }, [value]);

  return (
    <div
      role="radiogroup"
      aria-label="Map view"
      className="fixed right-4 top-[calc(3.5rem+var(--safe-top)+12px)] z-20 flex h-10 items-center gap-1 rounded-lg bg-dc-lavender p-1 shadow-[inset_0px_1px_1px_rgba(34,17,68,0.15),inset_0px_2px_4px_rgba(34,17,68,0.06)] lg:right-6 lg:top-[80px] lg:bg-dc-panel"
    >
      <div
        aria-hidden
        style={indicator ? { transform: `translateX(${indicator.x}px)`, width: indicator.w, height: indicator.h } : { visibility: "hidden" }}
        className="absolute left-0 top-1 rounded-[4px] bg-white shadow-[0px_1px_3px_rgba(22,11,43,0.1),0px_1px_2px_rgba(22,11,43,0.1)] transition-[transform,width] duration-150 ease-out motion-reduce:transition-none"
      />
      {OPTIONS.map(({ view, label, Icon }) => (
        <button
          key={view}
          type="button"
          role="radio"
          aria-checked={value === view}
          aria-label={label}
          ref={(el) => {
            buttonRefs.current.set(view, el);
          }}
          onClick={() => onChange(view)}
          className={cn(
            "relative z-10 flex min-h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[4px] px-2.5 py-1 text-[14px] leading-none transition-colors",
            value === view ? "font-bold text-dc-purple" : "font-medium text-dc-muted hover:text-dc-fg2"
          )}
        >
          <Icon className="size-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
