/**
 * The hand-off between the pre-paint launch cover (an inline script in
 * app/layout.tsx, which runs before any module) and IntroSplash, which
 * removes it. Both sides read these so a rename can never split them: a
 * cover id the splash doesn't know stays on screen until the script's own
 * safety timeout.
 */

/** localStorage flag: the intro has played on this device. */
export const INTRO_SEEN_KEY = "event_app_intro_seen";
/** Id of the <style> element that paints the cover. */
export const INTRO_COVER_ID = "intro-cover";
/** The splash backdrop, preloaded by the script and decoded by the splash. */
export const INTRO_BACKDROP = "/login/backdrop.jpg";
