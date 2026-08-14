"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/data/auth/supabase";
import { useUser } from "@/data/auth/useUser";

/**
 * Push opt-in state machine for the announcements notification toggle.
 *
 * States:
 * - "unsupported":      no SW/Push API in this browsing context (incl. dev,
 *                       where the service worker is disabled)
 * - "requires-install": iOS Safari tab — push only works from a Home Screen
 *                       install (iOS 16.4+)
 * - "denied":           permission permanently denied in browser settings
 * - "off" / "on":       ready; toggled by subscribe()/unsubscribe()
 *
 * Subscribing is only ever triggered by an explicit user tap (never
 * auto-prompt), and the subscription is stored server-side keyed by endpoint.
 */
export type PushState =
  | "loading"
  | "unsupported"
  | "requires-install"
  | "denied"
  | "off"
  | "on";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS reports as macOS but is touch-capable.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

async function authHeader(): Promise<Record<string, string>> {
  if (!supabase) throw new Error("Supabase not initialized");
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return { Authorization: `Bearer ${token}` };
}

export function usePushSubscription() {
  const { user } = useUser();
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        // On iOS the Push API only exists once installed to the Home Screen —
        // surface the actionable state instead of a dead "unsupported".
        setState(isIOS() && !isStandalone() ? "requires-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        if (!cancelled) setState(sub ? "on" : "off");
      } catch {
        if (!cancelled) setState("unsupported");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = useCallback(async () => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      setError("Push is not configured");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
      const res = await fetch("/api/push/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify(subscription.toJSON()),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to subscribe");
      setState("on");
    } catch (err) {
      // Roll back a browser-side subscription the server never stored.
      try {
        const registration = await navigator.serviceWorker.ready;
        await (await registration.pushManager.getSubscription())?.unsubscribe();
      } catch {}
      setError((err as Error).message);
      setState("off");
    } finally {
      setBusy(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/push/subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json", ...(await authHeader()) },
          body: JSON.stringify({ endpoint }),
        });
      }
      setState("off");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    /** Only signed-in users can subscribe (the API requires it). */
    signedIn: !!user,
    state,
    busy,
    error,
    subscribe,
    unsubscribe,
  };
}
