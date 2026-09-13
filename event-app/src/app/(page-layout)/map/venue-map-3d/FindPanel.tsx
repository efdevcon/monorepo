"use client";

import { useEffect, useRef, type ReactNode } from "react";
import cn from "classnames";

const FIND_PANEL_ID = "map-find-panel";

/** Structural ref type (see SearchInput.tsx). */
type InputRef = { current: HTMLInputElement | null };

/**
 * Desktop shell for Find: a floating panel above the Find pill, bottom-left,
 * styled like the area card. Stays mounted (fades and slides like the card),
 * `inert` while closed. Escape and a click outside close it; opening focuses
 * the search field.
 */
export function FindPanel({ open, onClose, inputRef, children }: { open: boolean; onClose: () => void; inputRef: InputRef; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault(); // the map's own Escape (reset) must not also fire
        onClose();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || panelRef.current?.contains(target) || target.closest("[data-find-trigger]")) return;
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
      id={FIND_PANEL_ID}
      ref={panelRef}
      role="dialog"
      aria-label="Find a place"
      aria-hidden={!open}
      inert={!open || undefined}
      className={cn(
        "fixed left-6 z-20 flex w-[380px] max-h-[min(560px,calc(100vh-220px))] flex-col rounded-2xl bg-white/95 font-heading shadow-[0_8px_30px_rgba(22,11,43,0.18)] backdrop-blur",
        "transition-[translate,opacity] duration-150 ease-out motion-reduce:transition-none",
        open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      )}
      // Above the 36px Find pill (bottom 1.5rem) with a 12px gap.
      style={{ bottom: "calc(1.5rem + 48px)" }}
    >
      {children}
    </div>
  );
}
