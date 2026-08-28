"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import cn from "classnames";

/**
 * Mobile bottom-sheet shell (Figma 6a/6b): near-fullscreen panel starting
 * ~81px from the top over a dark scrim. Hand-rolled (no vaul) so the app's
 * fixed header/bottom nav keep their containing block, with a slide-up
 * transition and body scroll lock. Exit slides back down faster than entry
 * (the user has already decided to leave), staying mounted until it finishes.
 * Content (schedule filters, speaker topics) is supplied as children.
 */

/** Exit duration — keep in sync with the duration-200 exit classes below. */
const EXIT_MS = 200;

export function BottomSheet({
  open,
  onOpenChange,
  ariaLabel,
  fit = false,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ariaLabel: string;
  /**
   * Content-hugging variant: the sheet rises only as far as its content
   * needs (capped at the usual 81px top inset) instead of pinning
   * near-fullscreen — for short content like the topic pills, where a
   * pinned sheet is mostly empty space.
   */
  fit?: boolean;
  children: React.ReactNode;
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
            aria-label={ariaLabel}
            className={cn(
              "absolute inset-x-0 bottom-0 transition-transform motion-reduce:transition-none",
              // Fit mode: height comes from the content (children must drop
              // h-full); the flex column lets their inner scroll areas cap
              // at the same 81px top inset the pinned variant uses.
              fit
                ? "flex max-h-[calc(100%-81px-var(--safe-top))] flex-col"
                : "top-[calc(81px+var(--safe-top))]",
              // Exit is faster and eases in — leaving shouldn't feel as
              // weighty as arriving.
              entered
                ? "translate-y-0 duration-300 ease-out"
                : "translate-y-full duration-200 ease-in"
            )}
          >
            {children}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
