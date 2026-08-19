"use client";

import cn from "classnames";

/** Display label: pluralized session type ("Talk" → "Talks"), per Figma. */
export const typeLabel = (type: string) =>
  /s$/i.test(type) || type === "Music" ? type : `${type}s`;

/**
 * Session-format tabs (Figma "Format Buttons"): underline tabs on the panel
 * surface — "All" plus the dataset's distinct session types — with a
 * right-hand slot for the Interested pill. Single-select; "All" = null.
 */
export function TypeTabs({
  options,
  selected,
  onSelect,
  stuck = false,
  children,
}: {
  options: string[];
  selected: string | null;
  onSelect: (type: string | null) => void;
  /** Pinned under the app header: swap the panel fill for its glass recipe. */
  stuck?: boolean;
  /** Right-hand controls (Interested pill). */
  children?: React.ReactNode;
}) {
  // Same geometry as the schedule's DayTabs: full-height mobile tabs whose
  // underline meets the strip's bottom edge.
  const tab = (active: boolean) =>
    cn(
      "flex shrink-0 cursor-pointer items-center whitespace-nowrap border-b-2 px-2 py-4 text-[14px] leading-none transition-colors lg:min-h-9 lg:px-3 lg:py-1",
      active
        ? "border-dc-purple font-bold text-dc-purple"
        : "border-transparent font-normal text-dc-fg2 hover:text-dc-purple"
    );

  return (
    <div
      className={cn(
        "relative flex items-stretch justify-between gap-3 lg:items-center lg:px-4 lg:py-2",
        // Mobile: lavender full-time (unified with the schedule day tabs,
        // kept while pinned). Desktop: panel surface, swapping to the app
        // header's glass once pinned so cards scroll past behind it.
        "bg-dc-lavender",
        stuck
          ? "lg:bg-white/75 lg:backdrop-blur-[4px]"
          : "lg:bg-dc-panel"
      )}
    >
      {/* Mobile: full-bleed scroll behind a right-edge fade (like TopicPills) */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-dc-lavender to-transparent lg:hidden" />
      <div className="flex min-w-0 items-stretch gap-3 overflow-x-auto pl-4 pr-12 lg:items-center lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => onSelect(null)}
          aria-pressed={selected === null}
          className={tab(selected === null)}
        >
          All
        </button>
        {options.map((type) => (
          <button
            key={type}
            onClick={() => onSelect(selected === type ? null : type)}
            aria-pressed={selected === type}
            className={tab(selected === type)}
          >
            {typeLabel(type)}
          </button>
        ))}
      </div>
      {children && (
        <div className="flex shrink-0 items-center gap-3">{children}</div>
      )}
    </div>
  );
}
