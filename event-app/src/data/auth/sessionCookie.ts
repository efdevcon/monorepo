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

// Mirrors in flight, for whenSessionCookieSettled. The auth listener and
// verifyOtp both call syncSessionCookie on a sign-in, so this is a count.
let inFlight = 0;
let settledWaiters: (() => void)[] = [];

function settle(): void {
  inFlight -= 1;
  if (inFlight > 0) return;
  const waiters = settledWaiters;
  settledWaiters = [];
  waiters.forEach((resolve) => resolve());
}

/**
 * Resolves once no cookie mirror is in flight (at once when none is). For
 * code that leaves My Devcon right after a sign-in towards a server-gated
 * action (the session page's "Ask a question" reads the cookie): the user
 * state flips at SIGNED_IN, a round trip before the cookie exists, and a
 * tap in that gap is told to sign in again. Bounded, so a hung request never
 * strands anyone on the sign-in page; a failed mirror degrades as before.
 */
export function whenSessionCookieSettled(timeoutMs = 4000): Promise<void> {
  if (inFlight === 0) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      settledWaiters = settledWaiters.filter((w) => w !== done);
      resolve();
    };
    const timer = setTimeout(done, timeoutMs);
    settledWaiters.push(done);
  });
}

export async function syncSessionCookie(session: Session | null | undefined): Promise<boolean> {
  if (!session?.access_token || !session.refresh_token) return false;
  if (session.access_token === lastSyncedToken) return true;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  inFlight += 1;
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
  } finally {
    settle();
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
