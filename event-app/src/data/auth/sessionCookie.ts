import type { Session } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { isIOS, isStandalone } from "@/utils/platform";

/**
 * Client side of /api/auth/session: keep the HTTP-only auth cookies in step
 * with the browser session so server rendering knows who is signed in (the
 * install sign-in bridge in PersonalizedManifestLink). Best effort and
 * quiet: the app works without the cookie, it just installs signed out.
 * Skips a token it already mirrored: auth-js re-emits SIGNED_IN whenever a
 * tab regains focus.
 */
let lastSyncedToken: string | null = null;

export async function syncSessionCookie(session: Session | null | undefined): Promise<boolean> {
  if (!session?.access_token || !session.refresh_token) return false;
  if (session.access_token === lastSyncedToken) return true;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  try {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
      keepalive: true,
    });
    if (res.ok) lastSyncedToken = session.access_token;
    return res.ok;
  } catch {
    return false;
  }
}

export async function clearSessionCookie(): Promise<void> {
  lastSyncedToken = null;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  try {
    await fetch("/api/auth/session", { method: "DELETE", keepalive: true });
  } catch {
    // Offline or server down: the cookie expires on its own.
  }
}

/**
 * After a sign-in in an iOS browser tab, the page on screen still carries the
 * signed-out manifest link: Safari reads that tag from the HTML it was handed,
 * so "Add to Home Screen" needs a server-rendered page that saw the cookie.
 * Only there: an installed app or the native shell has nothing to install,
 * and other platforms share storage with the browser.
 */
export function installManifestNeedsReload(): boolean {
  return isIOS() && !isStandalone() && !Capacitor.isNativePlatform();
}
