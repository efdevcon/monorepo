"use client";

import { useEffect, useState, type RefObject } from "react";
import { usePaneActive } from "@/components/paneContext";
import { headerOffsetNow, isDesktopNow } from "./useIsDesktop";

/**
 * Whether a `position: sticky` bar pinned under the app header is currently
 * stuck there (so it can swap to the header's glass recipe, square its
 * corners, reveal pinned-only controls). One rAF-throttled scroll/resize
 * listener; sticky clamps rect.top at the offset, so <= offset+1 means
 * stuck. Hidden tab panes must not measure on every scroll of another tab,
 * hence the pane-active gate. Used by DayTabs and the schedule toolbar.
 * `desktopOffset`: extra px the bar pins below the header on desktop (the
 * day tabs under the schedule's sticky toolbar).
 */
export function useStuckUnderHeader(
  ref: RefObject<HTMLElement | null>,
  desktopOffset = 0
): boolean {
  const [stuck, setStuck] = useState(false);
  const paneActive = usePaneActive();

  useEffect(() => {
    if (!paneActive) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const offset = headerOffsetNow() + (isDesktopNow() ? desktopOffset : 0);
      setStuck(el.getBoundingClientRect().top <= offset + 1);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [paneActive, ref, desktopOffset]);

  return stuck;
}
