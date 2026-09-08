"use client";

import { usePaneActive } from "@/components/paneContext";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HEADER_ACTIONS_ID } from "@/components/AppHeader";

/**
 * Portal detail-page actions (share, add to calendar) into the app header's
 * action slot, which the list's own actions vacate while a detail is open.
 * Gated on the pane being visible: every visited tab pane stays mounted, so
 * without the gate a hidden tab's detail would inject its buttons too.
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
 * Body scroll lock shared by every layer: a counter, not "restore what was
 * there before". Two layers can overlap in time (a session's layer in the
 * hidden Schedule pane while a speaker's layer shows), and restoring a saved
 * "hidden" from the other layer left the list underneath unscrollable.
 */
let bodyLocks = 0;
function lockBody(): () => void {
  if (bodyLocks++ === 0) document.body.style.overflow = "hidden";
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--bodyLocks === 0) document.body.style.overflow = "";
  };
}

/**
 * Mobile full-screen detail surface drawn over a list that stays mounted.
 * Covers the whole viewport and pads for the sticky app header (z-30), so the
 * glass header blurs the detail content underneath it exactly like a normal
 * page. The caller marks the list `inert` and `invisible` while this is open:
 * `visibility: hidden` keeps the list's layout and scroll position but stops
 * its sticky bars and fixed rails from painting through. Locks body scroll
 * (only while its pane is the visible one) so a short detail can't scroll the
 * list underneath, moves focus into the layer on open, and closes on Escape.
 * Not `aria-modal`: the back and share controls live in the app header
 * outside this element, and modal semantics would hide them from screen
 * readers.
 */
export function DetailLayer({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const paneActive = usePaneActive();

  useEffect(() => {
    if (!paneActive) return;
    const release = lockBody();
    ref.current?.focus({ preventScroll: true });
    return release;
  }, [paneActive]);

  useEffect(() => {
    if (!onClose) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
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

/**
 * Desktop renders a detail page in flow, in place of its list (`hidden`), so
 * the document scroll is the detail's. Remember the list's scroll position
 * when the detail opens and restore it when the detail closes. Runs only
 * while the pane is visible: the detail id is frozen for hidden panes (see
 * routing/detailRoute.ts), so the transition it reacts to always happens on
 * screen, after the pane's own ScrollRestorer (earlier sibling) has run.
 */
export function useListScrollAcrossDetail(detailOpen: boolean): void {
  const paneActive = usePaneActive();
  const saved = useRef(0);
  const prev = useRef(detailOpen);
  useLayoutEffect(() => {
    if (!paneActive || detailOpen === prev.current) return;
    prev.current = detailOpen;
    if (detailOpen) {
      saved.current = window.scrollY;
      window.scrollTo({ top: 0, behavior: "auto" });
    } else {
      window.scrollTo({ top: saved.current, behavior: "auto" });
    }
  }, [detailOpen, paneActive]);
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
