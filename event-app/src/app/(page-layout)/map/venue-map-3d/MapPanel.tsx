"use client";

import { useEffect, useRef, type ReactNode } from "react";
import cn from "classnames";

/** Structural ref type (see SearchInput.tsx). */
type InputRef = { current: HTMLInputElement | null };

type MapPanelProps = {
  id: string;
  label: string;
  open: boolean;
  onClose: () => void;
  /** Focused on open (the search field); without it the panel focuses its `[data-autofocus]` element (Find's first row). */
  inputRef?: InputRef;
  children: ReactNode;
};

/**
 * Desktop shell for Find and Search: a floating panel above the bottom-left
 * pills, styled like the area card. Stays mounted (fades and slides like the
 * card), `inert` while closed. Opening focuses the search field or, without one,
 * the first list row (`data-autofocus`). Escape and a click outside close it; a click on
 * any control pill (`data-map-trigger`) is left to the pill's own handler.
 * Only one panel is open at a time, so both share the same anchor.
 */
export function MapPanel({ id, label, open, onClose, inputRef, children }: MapPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // Keyboard-ready at once: the search field, or the first list row so the arrow keys walk the list (Scott, 2026-09-21).
    (inputRef?.current ?? panelRef.current?.querySelector<HTMLElement>("[data-autofocus]"))?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault(); // the map's own Escape (reset) must not also fire
        onClose();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || panelRef.current?.contains(target) || target.closest("[data-map-trigger]")) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, onClose, inputRef]);

  return (
    <div
      id={id}
      ref={panelRef}
      role="dialog"
      aria-label={label}
      aria-hidden={!open}
      inert={!open || undefined}
      className={cn(
        "fixed left-6 z-20 flex w-[380px] max-h-[min(560px,calc(100vh-220px))] flex-col rounded-2xl bg-white/95 font-heading shadow-[0_8px_30px_rgba(22,11,43,0.18)] backdrop-blur",
        "transition-[translate,opacity] duration-150 ease-out motion-reduce:transition-none",
        open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      )}
      // Above the 44px control pills (bottom 1.5rem) with a 12px gap.
      style={{ bottom: "calc(1.5rem + 56px)" }}
    >
      {children}
    </div>
  );
}
