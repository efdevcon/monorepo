"use client";

import { usePaneActive } from "@/components/paneContext";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HEADER_ACTIONS_ID } from "@/components/AppHeader";

/**
 * Portal detail-view actions (share, add to calendar) into the app header's
 * action slot, which the page's own actions vacate while a detail is open.
 */
export function HeaderActionsPortal({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<Element | null>(null);
  const paneActive = usePaneActive();
  useEffect(() => {
    setTarget(document.getElementById(HEADER_ACTIONS_ID));
  }, []);
  if (!target || !paneActive) return null;
  return createPortal(children, target);
}

/**
 * Mobile full-screen detail surface drawn over a list that stays mounted.
 * Covers the whole viewport and pads for the sticky app header (z-30), so the
 * glass header blurs the detail content underneath it exactly like a normal
 * page. The caller marks the list `inert` and `invisible` while this is open:
 * `visibility: hidden` keeps the list's layout and scroll position but stops
 * its sticky bars and fixed rails from painting through. Locks body scroll so
 * a short detail can't scroll the list underneath, and moves focus into the
 * layer on open.
 */
export function DetailLayer({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      // z-[25]: above every page-level sticky bar and fixed rail (z-20/21),
      // below the app header (z-30).
      className="fixed inset-0 z-[25] overflow-x-hidden overflow-y-auto overscroll-contain bg-dc-panel outline-none lg:hidden"
    >
      <div className="min-h-full pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(3.5rem+var(--safe-top))]">
        {children}
      </div>
    </div>
  );
}

/** Body for an id the snapshot doesn't know (stale link, wrong dataset). */
export function DetailNotFound({
  label,
  onBack,
}: {
  label: string;
  onBack: () => void;
}) {
  return (
    <div className="p-4 py-12 text-center font-heading">
      <p className="text-dc-red">{label}</p>
      <button
        type="button"
        onClick={onBack}
        className="mt-4 cursor-pointer font-bold text-dc-purple hover:underline"
      >
        Back
      </button>
    </div>
  );
}
