"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/data/auth/supabase";
import { useUser } from "@/data/auth/useUser";
import { readPref, writePref } from "@/data/prefs";
import { isIOS, isStandalone } from "@/utils/platform";

/**
 * Push opt-in state machine for the notification switches (announcements and
 * session reminders).
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
 *
 * Preferences: while "on", this device has two flags on its server row,
 * `announcements` (default on) and `reminders` (session reminders, opt-in).
 * The row, and so the browser subscription, exists only while at least one
 * is on: `setPref` turning on the first flag subscribes (permission prompt)
 * with only that flag, turning off the last one unsubscribes, anything else
 * is a PATCH. The last known flags are cached in Dexie (`prefs` table) so the
 * switches show offline; the server copy is re-read on mount.
 */
export type PushState =
  | "loading"
  | "unsupported"
  | "requires-install"
  | "denied"
  | "off"
  | "on";

export type PushPrefKind = "announcements" | "reminders";
export type PushPrefs = Record<PushPrefKind, boolean>;

/** What a plain subscribe() stores: the column defaults. */
const DEFAULT_PREFS: PushPrefs = { announcements: true, reminders: false };
/** Dexie `prefs` key for this device's last known flags (null when off). */
const PREFS_KEY = "push.prefs";

const isPushPrefs = (v: unknown): v is PushPrefs =>
  !!v &&
  typeof (v as PushPrefs).announcements === "boolean" &&
  typeof (v as PushPrefs).reminders === "boolean";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Bearer header for the app's own API routes (throws when signed out). */
export async function authHeader(): Promise<Record<string, string>> {
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
  const [prefs, setPrefsState] = useState<PushPrefs | null>(null);
  const [prefBusy, setPrefBusy] = useState<PushPrefKind | null>(null);
  // setPref decides subscribe / PATCH / unsubscribe from the CURRENT flags;
  // a ref so a tap never acts on a render's stale copy.
  const prefsRef = useRef<PushPrefs | null>(null);

  const setPrefs = useCallback((next: PushPrefs | null) => {
    prefsRef.current = next;
    setPrefsState(next);
    void writePref(PREFS_KEY, next);
  }, []);

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
        // Don't wait for `serviceWorker.ready` just to DISPLAY the toggle: on
        // a first visit the worker spends a while precaching before it
        // activates, and ready doesn't resolve until then — the card would
        // stay hidden the whole time. No active registration simply means
        // "not subscribed yet"; subscribe() awaits readiness itself.
        const registration = await navigator.serviceWorker.getRegistration();
        const sub = registration?.active
          ? await registration.pushManager.getSubscription()
          : null;
        if (cancelled) return;
        setState(sub ? "on" : "off");
        if (!sub) return;
        // Show the cached flags at once (offline too; a subscription from
        // before the flags existed has the defaults), then refresh them from
        // the server. Best-effort: signed out, offline or an unknown row
        // leaves the cached copy.
        const cached = await readPref<PushPrefs | null>(PREFS_KEY);
        if (cancelled || prefsRef.current) return;
        const shown = isPushPrefs(cached) ? cached : DEFAULT_PREFS;
        prefsRef.current = shown;
        setPrefsState(shown);
        try {
          const res = await fetch("/api/push/subscriptions/prefs", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(await authHeader()) },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          const json = await res.json();
          if (!cancelled && json.success && isPushPrefs(json.data)) setPrefs(json.data);
        } catch {}
      } catch {
        if (!cancelled) setState("unsupported");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setPrefs]);

  /**
   * Subscribe this device with the given flags (unset ones take
   * DEFAULT_PREFS). Must be called straight from the tap: nothing is awaited
   * before `Notification.requestPermission()`, which browsers only honour
   * inside the user gesture.
   */
  const subscribe = useCallback(async (opts?: Partial<PushPrefs>) => {
    const desired: PushPrefs = { ...DEFAULT_PREFS, ...opts };
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      setError("Push is not configured");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Chrome's quiet-UI can swallow the prompt into an address-bar bell
      // icon, leaving this promise pending — don't spin forever on it.
      const permission = await Promise.race([
        Notification.requestPermission(),
        new Promise<"timeout">((resolve) =>
          setTimeout(() => resolve("timeout"), 30_000)
        ),
      ]);
      if (permission === "timeout") {
        throw new Error(
          "No answer from the notification prompt — look for a bell icon in the address bar and allow notifications there."
        );
      }
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      // First visit: the worker may still be precaching; ready resolves on
      // activation. Bound the wait so a stalled install surfaces as a retry
      // hint instead of an infinite spinner.
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "The app is still setting up offline support — try again in a few seconds."
                )
              ),
            20_000
          )
        ),
      ]);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
      const res = await fetch("/api/push/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ ...subscription.toJSON(), prefs: desired }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to subscribe");
      setPrefs(isPushPrefs(json.data) ? json.data : desired);
      setState("on");
    } catch (err) {
      // Roll back a browser-side subscription the server never stored.
      try {
        const registration = await navigator.serviceWorker.ready;
        await (await registration.pushManager.getSubscription())?.unsubscribe();
      } catch {}
      setError((err as Error).message);
      setPrefs(null);
      setState("off");
    } finally {
      setBusy(false);
    }
  }, [setPrefs]);

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
      setPrefs(null);
      setState("off");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [setPrefs]);

  /**
   * Flip one notification type for this device. Off → on subscribes with
   * only that type on (the first switch is the permission prompt, so this
   * must run straight from the tap; subscribe() is called before anything is
   * awaited). Turning off the last type on unsubscribes; anything else
   * PATCHes the row. `prefs` updates once the server has confirmed.
   */
  const setPref = useCallback(
    async (kind: PushPrefKind, value: boolean) => {
      const other: PushPrefKind = kind === "announcements" ? "reminders" : "announcements";
      if (state === "off") {
        if (!value) return;
        setPrefBusy(kind);
        try {
          await subscribe({ [kind]: true, [other]: false });
        } finally {
          setPrefBusy(null);
        }
        return;
      }
      if (state !== "on") return;
      const current = prefsRef.current ?? DEFAULT_PREFS;
      if (current[kind] === value) return;
      setPrefBusy(kind);
      try {
        if (!value && !current[other]) {
          await unsubscribe();
          return;
        }
        setError(null);
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        if (!sub) throw new Error("This device is no longer subscribed");
        const res = await fetch("/api/push/subscriptions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...(await authHeader()) },
          body: JSON.stringify({ endpoint: sub.endpoint, prefs: { [kind]: value } }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Failed to update notifications");
        setPrefs(isPushPrefs(json.data) ? json.data : { ...current, [kind]: value });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setPrefBusy(null);
      }
    },
    [state, subscribe, unsubscribe, setPrefs]
  );

  return {
    /** Only signed-in users can subscribe (the API requires it). */
    signedIn: !!user,
    state,
    busy,
    error,
    subscribe,
    unsubscribe,
    /** This device's flags while "on" (cached, then server-confirmed); null otherwise. */
    prefs: state === "on" ? prefs : null,
    /** The type whose switch is mid-change, for its spinner/disabled state. */
    prefBusy,
    setPref,
  };
}
