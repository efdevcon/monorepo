"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import cn from "classnames";
import { ArrowDownToLine } from "lucide-react";
import {
  CloseButton,
  PrimaryButton,
  SecondaryButton,
} from "@/components/Buttons";

/** Exit duration — keep in sync with the duration-200 exit classes below. */
const EXIT_MS = 200;

/**
 * Mobile "Filter by Topic" bottom sheet (Figma): the speakers counterpart of
 * the schedule's FilterSheet — same hand-rolled shell (portal over a dark
 * scrim, slide-up entry, faster slide-down exit, body scroll lock) with a
 * wrapping pill grid of every topic in the dataset. Filters apply live, so
 * Close is the primary CTA.
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
  /** Every topic tag in the dataset, most frequent first. */
  options: string[];
  selected: string[];
  onToggle: (topic: string) => void;
  onClear: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  // Present = kept in the DOM while the exit transition plays out.
  const [present, setPresent] = useState(false);
  // Entered = post-mount frame, so the slide-up transition actually runs.
  const [entered, setEntered] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setPresent(true);
      return;
    }
    // Play the reverse transition on the still-mounted sheet, then unmount.
    // Reopening mid-exit clears the timer and the transition retargets.
    setEntered(false);
    const timer = setTimeout(() => setPresent(false), EXIT_MS);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open || !present) return;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => setEntered(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, present, onOpenChange]);

  if (!mounted || !present) return null;

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 z-50 font-heading lg:hidden">
          <div
            className={cn(
              "absolute inset-0 bg-black/[0.64] transition-opacity duration-200 motion-reduce:transition-none",
              entered ? "opacity-100" : "opacity-0 ease-in"
            )}
            onClick={() => onOpenChange(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filter by topic"
            className={cn(
              "absolute inset-x-0 bottom-0 top-[81px] transition-transform motion-reduce:transition-none",
              // Exit is faster and eases in — leaving shouldn't feel as
              // weighty as arriving.
              entered
                ? "translate-y-0 duration-300 ease-out"
                : "translate-y-full duration-200 ease-in"
            )}
          >
            <div className="flex h-full min-h-0 flex-col overflow-clip rounded-t-xl border border-dc-hairline bg-white">
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between gap-4 border-b border-dc-hairline bg-white p-4">
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

              {/* Sticky footer. Close is the primary CTA (filters apply live,
                  so "done" is the natural forward action, not the reset). */}
              <div className="flex shrink-0 gap-3 border-t border-dc-hairline bg-white p-4">
                <SecondaryButton onClick={onClear}>
                  Reset topics
                </SecondaryButton>
                <PrimaryButton
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  <ArrowDownToLine className="size-4" />
                  Close
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
