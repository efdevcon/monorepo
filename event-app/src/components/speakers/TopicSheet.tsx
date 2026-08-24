"use client";

import cn from "classnames";
import { ArrowDownToLine } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet";
import {
  CloseButton,
  PrimaryButton,
  SecondaryButton,
} from "@/components/Buttons";

/**
 * Mobile "Filter by Topic" bottom sheet (Figma): the speakers counterpart of
 * the schedule's FilterSheet — the shared BottomSheet shell around a wrapping
 * pill grid of the topic vocabulary. Filters apply live, so Close is the
 * primary CTA.
 */
export function TopicSheet({
  open,
  onOpenChange,
  options,
  selected,
  onToggle,
  onClear,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Topic vocabulary, most frequent first — same top slice as desktop. */
  options: string[];
  selected: string[];
  onToggle: (topic: string) => void;
  onClear: () => void;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      ariaLabel="Filter by topic"
      // The top-15 pill grid is short — hug it instead of pinning fullscreen.
      fit
    >
      <div className="flex min-h-0 flex-col overflow-clip rounded-t-xl border border-dc-hairline bg-white">
        {/* Header */}
        <div className="flex shrink-0 flex-col gap-1 border-b border-dc-hairline bg-white p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
              Filter by Topic
            </span>
            <div className="flex items-center gap-4">
              <button
                onClick={onClear}
                className="cursor-pointer text-[14px] font-bold leading-none text-dc-purple hover:underline"
              >
                Clear all
              </button>
              <CloseButton
                onClick={() => onOpenChange(false)}
                aria-label="Close topic filter"
              />
            </div>
          </div>
          {/* The topic filter is an OR — spell it out, people read multi-
              select as "must match all" (PR #112 feedback). */}
          <p className="text-[14px] font-medium leading-5 text-dc-muted">
            Shows speakers matching any selected topic.
          </p>
        </div>

        {/* Scrollable wrapping pill grid */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="flex flex-wrap gap-2">
            {options.map((topic) => {
              const active = selected.includes(topic);
              return (
                <button
                  key={topic}
                  onClick={() => onToggle(topic)}
                  aria-pressed={active}
                  className={cn(
                    "flex min-h-9 cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-[14px] leading-none transition-colors duration-150 ease-out",
                    active
                      ? "bg-dc-purple font-bold text-white"
                      : "border border-dc-hairline bg-white text-dc-fg2 hover:bg-dc-purple-wash"
                  )}
                >
                  {topic}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sticky footer. Close is the primary CTA (filters apply live, so
            "done" is the natural forward action, not the reset). */}
        <div className="flex shrink-0 gap-3 border-t border-dc-hairline bg-white p-4">
          <SecondaryButton onClick={onClear}>Reset topics</SecondaryButton>
          <PrimaryButton onClick={() => onOpenChange(false)} className="flex-1">
            <ArrowDownToLine className="size-4" />
            Close
          </PrimaryButton>
        </div>
      </div>
    </BottomSheet>
  );
}
