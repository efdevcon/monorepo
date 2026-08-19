"use client";

import cn from "classnames";

/**
 * Topic filter pill row (Figma "Navigation Buttons"): lavender strip with an
 * "All" pill followed by the dataset's top topic tags, horizontally scrollable
 * behind a right-edge fade. Multi-select: pills toggle independently, "All"
 * clears the facet.
 */
export function TopicPills({
  options,
  selected,
  onToggle,
  onClear,
}: {
  options: string[];
  selected: string[];
  onToggle: (topic: string) => void;
  onClear: () => void;
}) {
  if (options.length === 0) return null;

  const pill = (active: boolean) =>
    cn(
      "flex min-h-9 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-[14px] leading-none transition-colors duration-150 ease-out",
      active
        ? "bg-dc-purple font-bold text-white"
        : "border border-dc-hairline bg-white text-dc-fg2 hover:bg-dc-purple-wash"
    );

  return (
    <div className="relative border-b border-dc-hairline bg-dc-lavender">
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 pr-14 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
      {/* Right-edge fade over the scrolling pills (Figma) */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[52px] bg-gradient-to-l from-dc-lavender to-transparent" />
    </div>
  );
}
