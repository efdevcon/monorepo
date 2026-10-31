import { isAndroid, isIOS, isStandalone } from "./platform";

/**
 * Open another site in the device's own browser from the installed app.
 *
 * A Home Screen app shows other sites in an in-app browser: a Safari sheet
 * on iOS, a Chrome tab inside the app on Android. For a page people keep
 * open while they go back to the app (the live transcript), the real
 * browser is better: the iOS sheet goes away with the app. The levers are
 * the same two the app move used (LegacyInstallGate.tsx, InstallAppButton.tsx):
 * - iOS: `x-safari-https://` hands the URL to Safari itself. Undocumented,
 *   works on iOS 15, 17, 18 and 26; iOS 16 reportedly ignores it, and then
 *   nothing happens, so the caller keeps the plain link as its fallback.
 * - Android: the system share sheet, where picking Chrome opens a real tab.
 *   Chrome routes its own schemes and intent URLs into the in-app tab, so
 *   the sheet is the one hand-off that escapes it.
 * In a browser tab there is nothing to do: the link opens a tab as usual.
 *
 * Must run inside the tap, with nothing asynchronous before it: both
 * hand-offs need the user gesture. Returns true when it took the click over
 * (the caller prevents the link's own navigation), false to let the link be.
 */
export function openOutside(url: string, title: string): boolean {
  if (!isStandalone()) return false;
  if (isIOS()) {
    window.location.href = toSafariHref(url);
    return true;
  }
  if (isAndroid() && typeof navigator.share === "function") {
    void navigator.share({ title, url }).catch(() => undefined);
    return true;
  }
  return false;
}

/** `https://` turned into Safari's own scheme; anything else untouched. */
export function toSafariHref(url: string): string {
  return url.replace(/^https:\/\//, "x-safari-https://");
}
