"use client";

import { useEffect } from "react";
import { isIOS, isStandalone } from "@/utils/platform";

/**
 * Works around the iOS standalone-PWA keyboard bug: the first time the
 * software keyboard opens in an installed PWA, WebKit shrinks the layout
 * viewport (window.innerHeight / 100dvh / fixed-element geometry) and does
 * NOT restore it when the keyboard closes — position:fixed chrome (the
 * bottom tab bar, the header glass, the app background) then floats above a
 * dead band at the screen bottom until the app is force-quit. Scrollable
 * pages partially self-heal because WebKit recomputes on scroll; pages with
 * nothing to scroll (the map, empty filter states) stay broken — which is
 * exactly the "nav bar sits too high" report from device testing.
 *
 * The heal (per the documented workaround): after the keyboard dismisses
 * (focusout from a text field), if the viewport is still smaller than its
 * known maximum, force WebKit to rebuild the page's layout by toggling the
 * body's display for one synchronous, unpainted reflow. Scroll position is
 * preserved. No-op outside installed iOS PWAs.
 */
export function IOSViewportHealer() {
  useEffect(() => {
    if (!(isIOS() && isStandalone())) return;

    let maxHeight = window.innerHeight;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const isTextField = (t: EventTarget | null): t is HTMLElement =>
      t instanceof HTMLElement &&
      (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);

    const onResize = () => {
      maxHeight = Math.max(maxHeight, window.innerHeight);
    };

    const heal = () => {
      // Focus moved to another field — the keyboard is still up; the next
      // focusout will retry.
      if (isTextField(document.activeElement)) return;
      if (maxHeight - window.innerHeight <= 4) return;
      const { scrollX, scrollY } = window;
      document.body.style.display = "none";
      void document.body.offsetHeight; // flush the reflow while hidden
      document.body.style.display = "";
      window.scrollTo(scrollX, scrollY);
    };

    const onFocusOut = (e: FocusEvent) => {
      if (!isTextField(e.target)) return;
      // Wait out the keyboard's dismiss animation before measuring.
      clearTimeout(timer);
      timer = setTimeout(heal, 150);
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("focusout", onFocusOut);
      clearTimeout(timer);
    };
  }, []);

  return null;
}
