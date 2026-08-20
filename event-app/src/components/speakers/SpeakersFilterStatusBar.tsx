"use client";

import { Fragment } from "react";
import { X } from "lucide-react";

/** One removable applied-filter chip (Figma "TopicClear"): lavender pill,
 *  purple-600 border and bold 12px label, 12px x. */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      aria-label={`Remove ${label} filter`}
      className="flex min-h-8 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-dc-purple-600 bg-dc-lavender px-3 py-1 text-[12px] font-bold leading-none text-dc-purple-600 transition-colors duration-150 ease-out hover:bg-dc-purple-wash"
    >
      {label}
      <X className="size-3" />
    </button>
  );
}

/**
 * Applied-filters row (Figma "Speakers: [chip ×] … Clear all — N results"):
 * one removable chip per selected topic plus the format tab, a "Clear all"
 * text button, and the result count right-aligned. Topic chips join with
 * "or" — the topic filter matches any selected topic, not all of them.
 * Hidden when nothing is applied.
 */
export function SpeakersFilterStatusBar({
  topics,
  type,
  onRemoveTopic,
  onClearType,
  onClearAll,
  resultCount,
}: {
  topics: string[];
  type: string | null;
  onRemoveTopic: (topic: string) => void;
  onClearType: () => void;
  onClearAll: () => void;
  resultCount: number;
}) {
  if (topics.length === 0 && !type) return null;

  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
          Speakers:
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          {topics.map((topic, i) => (
            <Fragment key={topic}>
              {i > 0 && (
                <span className="text-[14px] font-medium leading-none text-dc-muted">
                  or
                </span>
              )}
              <FilterChip
                label={topic}
                onRemove={() => onRemoveTopic(topic)}
              />
            </Fragment>
          ))}
          {type && <FilterChip label={type} onRemove={onClearType} />}
        </span>
        <button
          onClick={onClearAll}
          className="cursor-pointer text-[14px] font-bold leading-none text-dc-purple hover:underline"
        >
          Clear all
        </button>
      </div>
      <span className="shrink-0 text-[14px] font-medium leading-5 text-dc-muted">
        {resultCount} result{resultCount === 1 ? "" : "s"}
      </span>
    </div>
  );
}
