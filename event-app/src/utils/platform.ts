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
/** iPad, including iPadOS in desktop mode, which reports itself as a touch Mac. */
export function isIPad(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Major iOS version read from a User-Agent, or null when it can't be told.
 * Safari's "Version/27.0" token has tracked the iOS major since iOS 15 and
 * is preferred: since iOS 26 the "OS 18_7" token is frozen at the last
 * pre-26 release for privacy, so it only tells the truth below 26 (and is
 * all third-party iOS browsers offer, they carry no Version/ token). An iPad
 * in desktop mode reports itself as a Mac, hence the Macintosh branch.
 * Pure, so the data tests can cover it.
 */
export function parseIosMajorVersion(userAgent: string): number | null {
  const apple = /iPhone|iPad|iPod|Macintosh/.test(userAgent);
  const m =
    (apple ? /Version\/(\d+)\./.exec(userAgent) : null) ??
    /(?:iPhone|iPad|iPod).*?OS (\d+)_/.exec(userAgent);
  return m ? Number(m[1]) : null;
}

/**
 * iOS 26 or 27+ from what the system WebKit supports, the way pwa-install
 * tells the releases apart: Safari 26 shipped `text-wrap: pretty`, Safari 27
 * the `revert-rule` keyword. Every iOS browser runs the system WebKit, so
 * this holds where the User-Agent is frozen. Null below 26 or off-device.
 */
export function iosVersionFromWebKitFeatures(): number | null {
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return null;
  if (CSS.supports("background", "revert-rule")) return 27;
  if (CSS.supports("text-wrap", "pretty")) return 26;
  return null;
}

/** Major iOS version on this device, or null: the higher of the feature check and the User-Agent. */
export function iosMajorVersion(): number | null {
  if (!isIOS()) return null;
  const version = Math.max(
    iosVersionFromWebKitFeatures() ?? 0,
    parseIosMajorVersion(navigator.userAgent) ?? 0
  );
  return version || null;
}

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
