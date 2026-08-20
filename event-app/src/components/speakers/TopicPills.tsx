"use client";

import { useState } from "react";
import cn from "classnames";

/**
 * Topic filter pill strip (Figma "Top Bar" / "Category Buttons"): a "Filter:"
 * label, an "All" pill and the dataset's top topic tags, inline next to the
 * desktop search input — horizontally scrollable behind edge fades. The right
 * fade is always on (there's always overflow to hint at); the left one only
 * appears once the strip is scrolled, so pills don't cut off abruptly under
 * the label. Multi-select: pills toggle independently, "All" clears the facet.
 */
export function TopicPills({
  options,
  selected,
  onToggle,
  onClear,
  stuck = false,
}: {
  options: string[];
  selected: string[];
  onToggle: (topic: string) => void;
  onClear: () => void;
  /** Toolbar pinned as glass: match the fades to the translucent fill. */
  stuck?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);

  if (options.length === 0) return null;

  const pill = (active: boolean) =>
    cn(
      "flex min-h-9 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-[14px] leading-none transition-colors duration-150 ease-out",
      active
        ? "bg-dc-purple font-bold text-white"
        : "border border-dc-hairline bg-white text-dc-fg2 hover:bg-dc-purple-wash"
    );

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="shrink-0 text-[14px] font-bold leading-5 text-dc-fg2">
        Filter:
      </span>
      {/* Fade anchor: the fades pin to the scroll viewport's edges, not to
          the scrolling content. */}
      <div className="relative min-w-0 flex-1">
        <div
          onScroll={(e) => setScrolled(e.currentTarget.scrollLeft > 0)}
          className="flex items-center gap-2 overflow-x-auto pr-14 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <button
            onClick={onClear}
            aria-pressed={selected.length === 0}
            className={pill(selected.length === 0)}
          >
            All
          </button>
          {options.map((topic) => (
            <button
              key={topic}
              onClick={() => onToggle(topic)}
              aria-pressed={selected.includes(topic)}
              className={pill(selected.includes(topic))}
            >
              {topic}
            </button>
          ))}
        </div>
        {/* Left-edge fade, revealed once the strip is scrolled */}
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-[52px] bg-gradient-to-r to-transparent transition-opacity duration-150 ease-out",
            stuck ? "from-white/75" : "from-white",
            !scrolled && "opacity-0"
          )}
        />
        {/* Right-edge fade over the scrolling pills (Figma) */}
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-[52px] bg-gradient-to-l to-transparent",
            stuck ? "from-white/75" : "from-white"
          )}
        />
      </div>
    </div>
  );
}
