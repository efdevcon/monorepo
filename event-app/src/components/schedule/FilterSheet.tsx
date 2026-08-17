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
 * transition and body scroll lock.
 */
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
  // Entered = post-mount frame, so the slide-up transition actually runs.
  const [entered, setEntered] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
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
  }, [open, onOpenChange]);

  if (!mounted || !open) return null;

  return (
    <>
      {createPortal(
    <div className="fixed inset-0 z-50 font-heading lg:hidden">
      <div
        className={cn(
          "absolute inset-0 bg-black/[0.64] transition-opacity duration-200 motion-reduce:transition-none",
          entered ? "opacity-100" : "opacity-0"
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className={cn(
          "absolute inset-x-0 bottom-0 top-[81px] transition-transform duration-300 ease-out motion-reduce:transition-none",
          entered ? "translate-y-0" : "translate-y-full"
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
