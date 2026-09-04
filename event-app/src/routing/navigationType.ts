/**
 * Was the current page entry reached through browser history (back/forward,
 * swipe) rather than a tap or a fresh load? Pages read this during their mount
 * to decide between restoring where the user was and starting fresh (the
 * schedule jumps to "live now" only on a fresh entry).
 *
 * Set by `popstate`, which fires before Next re-renders the new route, and
 * cleared by the page layout's effect after any URL change has committed.
 * Effects run child-first, so a mounting page reads it before the layout
 * clears it. Module state on purpose: it must survive the page swap and
 * reset on a full reload.
 */
let historyNavigation = false;

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    historyNavigation = true;
  });
}

export function wasHistoryNavigation(): boolean {
  return historyNavigation;
}

export function clearHistoryNavigation(): void {
  historyNavigation = false;
}
