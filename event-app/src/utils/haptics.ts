/**
 * Haptic tick for tap feedback on the tab bar.
 *
 * Two platforms, two mechanisms:
 * - Android Chrome: the Vibration API (`tapHaptic`).
 * - iOS: Safari has no Vibration API. Toggling an `<input type="checkbox"
 *   switch>` plays the system tick, and until iOS 26.4 a script could fire it
 *   through `label.click()` (what devconnect-app's `tactus` did). iOS 26.5
 *   closed that path: the tick now only plays for the user's own tap on the
 *   switch. So on iOS the tab bar renders a transparent switch over each tab
 *   (`IosHapticOverlay`); the finger toggles it, and the click is re-dispatched
 *   to the tab link. This follows the recipe of the `@haptics/core` library,
 *   which reports it working on 26.5+. It is an undocumented side effect and
 *   could stop working in a future iOS; failure mode is silence, not breakage.
 */
const TICK_MS = 15;

export function hasVibration(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

/** iPhone/iPad (including iPadOS reporting as a Mac) without the Vibration API. */
export function isIOSWithoutVibration(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  if (hasVibration()) return false;
  const ua = navigator.userAgent;
  const iPhoneLike = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
  const iPadAsMac = navigator.maxTouchPoints > 1 && /MacIntel/.test(navigator.platform);
  return iPhoneLike || iPadAsMac;
}

/** Android path. No-op on iOS (see IosHapticOverlay) and desktop. */
export function tapHaptic(): void {
  if (!hasVibration()) return;
  try {
    navigator.vibrate(TICK_MS);
  } catch {
    // Some browsers throw when vibration is disallowed; feedback is optional.
  }
}
