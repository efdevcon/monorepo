/**
 * Haptic tick for tap feedback on the tab bar.
 *
 * Android Chrome only: the Vibration API (`tapHaptic`). iOS has no Vibration
 * API; toggling an `<input type="checkbox" switch>` plays the system tick,
 * and until iOS 26.4 a script could fire it through `label.click()` (what
 * devconnect-app's `tactus` did). iOS 26.5 closed that path, so the tab bar
 * rendered a transparent switch over each tab for the user's own tap to
 * toggle (`IosHapticOverlay`, 2026-09-04). Removed 2026-10-13: the switch
 * took focus on every tap and on iOS 26 the fixed bar dropped ~50px for a
 * few frames each time. No iOS tick until WebKit offers a sanctioned path.
 */
const TICK_MS = 15;

export function hasVibration(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

/** Android path. No-op on iOS and desktop. */
export function tapHaptic(): void {
  if (!hasVibration()) return;
  try {
    navigator.vibrate(TICK_MS);
  } catch {
    // Some browsers throw when vibration is disallowed; feedback is optional.
  }
}
