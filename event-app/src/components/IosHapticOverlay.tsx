"use client";

import { useSyncExternalStore, type CSSProperties, type MouseEvent } from "react";
import { isIOSWithoutVibration } from "@/utils/haptics";

/**
 * iOS haptic tick for a tappable element. Render it as the LAST child of a
 * `position: relative` element (the tab link). It is a transparent
 * `<input type="checkbox" switch>` covering the element, so the user's own
 * tap toggles the switch and Safari plays the system tick (the only path that
 * still works on iOS 26.5+, see utils/haptics.ts). The tap's click is stopped
 * on the switch and re-dispatched as a synthetic click on the host, so the
 * link's own handlers (Next navigation, re-tap reset) run as before.
 *
 * Renders nothing outside iOS, and under prefers-reduced-motion. The input is
 * aria-hidden and unfocusable: assistive tech activates the link directly.
 */

const OVERLAY_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  margin: 0,
  padding: 0,
  border: 0,
  WebkitAppearance: "switch" as CSSProperties["WebkitAppearance"],
  appearance: "auto",
  opacity: 0,
  cursor: "inherit",
};

const noop = () => () => {};
const detect = () =>
  isIOSWithoutVibration() &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function IosHapticOverlay() {
  // Client-only detection without an effect: false on the server and during
  // hydration, then the real answer.
  const enabled = useSyncExternalStore(noop, detect, () => false);
  if (!enabled) return null;

  const onClick = (event: MouseEvent<HTMLInputElement>) => {
    // The switch has consumed the real tap (that is what plays the tick).
    // Don't let it reach the link as-is; hand the link a fresh click instead.
    event.stopPropagation();
    event.currentTarget.parentElement?.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, cancelable: true })
    );
  };

  return (
    <input
      type="checkbox"
      // `switch` is Safari's switch-style checkbox (WebKit 17.4+); React
      // passes unknown lowercase attributes through to the DOM.
      {...({ switch: "" } as Record<string, string>)}
      aria-hidden="true"
      tabIndex={-1}
      onClick={onClick}
      style={OVERLAY_STYLE}
    />
  );
}
