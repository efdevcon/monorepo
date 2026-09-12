"use client";

import { Segmented } from "./Segmented";
import type { MapSource } from "./types";

/** `short` on phones (both switches share one row), `label` from lg up. */
const OPTIONS: { source: MapSource; label: string; short: string; caption: string }[] = [
  { source: "iso", label: "ISO import", short: "ISO", caption: "Output from isometric import" },
  { source: "plan", label: "Top-down redraw", short: "Top-down", caption: "Output from top-down redraw" },
];

/**
 * Switches the map between the two prototype sources. Under the app header:
 * left on phones (the view switch takes the right), centred from lg up.
 */
export function SourceToggle({ value, onChange }: { value: MapSource; onChange: (s: MapSource) => void }) {
  const caption = OPTIONS.find((o) => o.source === value)?.caption;

  return (
    <>
      <Segmented
        ariaLabel="Map source"
        value={value}
        onChange={onChange}
        className="fixed left-4 top-[calc(3.5rem+var(--safe-top)+12px)] lg:left-1/2 lg:top-[80px] lg:-translate-x-1/2"
        options={OPTIONS.map(({ source, label, short }) => ({
          value: source,
          label,
          children: (
            <>
              <span className="lg:hidden">{short}</span>
              <span className="hidden lg:inline">{label}</span>
            </>
          ),
        }))}
      />
      {/* Phones show the short labels, so spell the active source out underneath. */}
      <p className="pointer-events-none fixed left-4 top-[calc(3.5rem+var(--safe-top)+56px)] z-20 text-[11px] leading-none text-dc-muted lg:hidden">{caption}</p>
    </>
  );
}
