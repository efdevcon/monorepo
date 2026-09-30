import { authHeader } from "@/data/push/usePushSubscription";

/**
 * Lifetime of a bridge link that is shown or held on a device (the desktop
 * QR, the install modal's Safari hop), and how often it is re-minted while
 * on screen. Short on purpose: the token is reusable until it expires.
 */
export const BRIDGE_LINK_TTL_MS = 10 * 60_000;
export const BRIDGE_LINK_REFRESH_MS = 8 * 60_000;

/**
 * A sign-in link for another browser or device, the install bridge:
 * `POST /api/manifest-bridge` mints a token for the signed-in account and
 * `/api/auth/bridge?bridge=` consumes it, landing signed in. Null when
 * signed out, offline, past `timeoutMs`, or the route is not provisioned;
 * callers fall back to a plain link to the app.
 */
export async function mintBridgeLink(
  ttlMs = BRIDGE_LINK_TTL_MS,
  timeoutMs?: number
): Promise<string | null> {
  try {
    const res = await fetch("/api/manifest-bridge", {
      method: "POST",
      headers: { ...(await authHeader()), "Content-Type": "application/json" },
      body: JSON.stringify({ ttlMs }),
      signal:
        timeoutMs && typeof AbortSignal.timeout === "function"
          ? AbortSignal.timeout(timeoutMs)
          : undefined,
    });
    if (!res.ok) return null;
    const { bridgeToken } = (await res.json()) as { bridgeToken?: string };
    if (!bridgeToken) return null;
    return `${window.location.origin}/api/auth/bridge?bridge=${encodeURIComponent(bridgeToken)}`;
  } catch {
    return null;
  }
}
