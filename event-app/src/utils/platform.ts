/**
 * Browser / install-context sniffing, in one place.
 *
 * These checks had drifted into three copies (the install button, the push
 * opt-in, and now the partner-proof hand-off), and the copies had already
 * diverged: only one of them recognised iPadOS. Consolidated here so a fix
 * lands everywhere at once.
 */

/** Running as an installed PWA (or in the Capacitor shell) rather than a tab. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS reports itself as macOS, so fall back to "is it a touch Mac".
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Brave deliberately makes its User-Agent look like Safari's (a documented
 * privacy choice — it avoids fingerprinting and discrimination against
 * non-Safari browsers on iOS), so no amount of UA parsing can tell it apart.
 * Brave exposes `navigator.brave` specifically so sites can detect it without
 * UA sniffing — this is that check.
 */
export function isBrave(): boolean {
  if (typeof navigator === "undefined") return false;
  return !!(navigator as unknown as { brave?: unknown }).brave;
}

/**
 * Best-effort, and unreliable in both directions on iOS — several browsers are
 * indistinguishable from Safari by User-Agent. Never gate something the user
 * needs on this returning false.
 */
export function isSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /Safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua) && !isBrave()
  );
}
