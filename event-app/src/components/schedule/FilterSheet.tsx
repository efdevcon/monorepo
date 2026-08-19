"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import cn from "classnames";
import type { FilterFacet, Filters } from "./useScheduleState";
import { FilterPanelContent } from "./FilterPanelContent";

/**
 * Mobile filter bottom sheet (Figma 6a/6b): near-fullscreen panel starting
 * ~81px from the top over a dark scrim. Hand-rolled (no vaul) so the app's
 * fixed header/bottom nav keep their containing block, with a slide-up
 * transition and body scroll lock. Exit slides back down faster than entry
 * (the user has already decided to leave), staying mounted until it finishes.
 */

/** Exit duration — keep in sync with the duration-200 exit classes below. */
const EXIT_MS = 200;
export function FilterSheet({
  open,
  onOpenChange,
  options,
  filters,
  onToggle,
  onClear,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: Record<FilterFacet, string[]>;
  filters: Filters;
  onToggle: (facet: FilterFacet, value: string) => void;
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
        aria-label="Filters"
        className={cn(
          "absolute inset-x-0 bottom-0 top-[81px] transition-transform motion-reduce:transition-none",
          // Exit is faster and eases in — leaving shouldn't feel as weighty
          // as arriving.
          entered
            ? "translate-y-0 duration-300 ease-out"
            : "translate-y-full duration-200 ease-in"
        )}
      >
        <FilterPanelContent
          options={options}
          filters={filters}
          onToggle={onToggle}
          onClear={onClear}
          onClose={() => onOpenChange(false)}
        />
      </div>
    </div>,
        document.body
      )}
    </>
  );
}
