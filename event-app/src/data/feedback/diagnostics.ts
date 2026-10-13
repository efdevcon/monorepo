"use client";

import { getActiveDataset } from "@/data/dataset";
import { getEventTimeZone } from "@/data/eventTime";
import { storeFor } from "@/data/store/schedule-source";
import { iosMajorVersion, isBrave, isStandalone } from "@/utils/platform";
import { summarizeUserAgent } from "./device";
import { recentConsoleEntries } from "./consoleCapture";

/**
 * What the app knows at report time, attached to every feedback row so the
 * team never has to ask "which phone, which build, were you offline?".
 * Nothing personal beyond what the attendee types: no ticket secrets, no
 * tokens, no interest ids (only the count).
 */
export async function collectDiagnostics(known: {
  signedIn: boolean;
  interests: number;
}): Promise<Record<string, unknown>> {
  const params = new URLSearchParams(window.location.search);
  const dataset = getActiveDataset();
  const main = storeFor("main").getState();
  const hubs = storeFor("hubs").getState();
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string; saveData?: boolean };
  };

  const storage = await (async () => {
    try {
      const persisted = await navigator.storage?.persisted?.();
      const estimate = await navigator.storage?.estimate?.();
      return {
        indexedDB: typeof indexedDB !== "undefined",
        persisted: persisted ?? null,
        usageMB: estimate?.usage ? Math.round(estimate.usage / 1_048_576) : null,
        quotaMB: estimate?.quota ? Math.round(estimate.quota / 1_048_576) : null,
      };
    } catch {
      return { indexedDB: typeof indexedDB !== "undefined" };
    }
  })();

  const sw = await (async () => {
    if (!("serviceWorker" in navigator)) return { supported: false };
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      return {
        supported: true,
        controlled: !!navigator.serviceWorker.controller,
        registered: !!reg,
        updateWaiting: !!reg?.waiting,
      };
    } catch {
      return { supported: true, controlled: !!navigator.serviceWorker.controller };
    }
  })();

  const push = await (async () => {
    const permission = "Notification" in window ? Notification.permission : "unsupported";
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      return { permission, subscribed: !!sub };
    } catch {
      return { permission };
    }
  })();

  const ios = iosMajorVersion();
  const brave = isBrave();
  const sync = (s: { status: string; meta: { version?: string; syncedAt?: number } | null; lastError: string | null }) => ({
    status: s.status,
    version: s.meta?.version ?? null,
    syncedAt: s.meta?.syncedAt ? new Date(s.meta.syncedAt).toISOString() : null,
    lastError: s.lastError,
  });

  return {
    build: process.env.APP_BUILD || "dev",
    origin: window.location.origin,
    page: window.location.pathname + window.location.search,
    displayMode: isStandalone() ? "installed" : "browser",
    device: summarizeUserAgent(navigator.userAgent, { iosMajor: ios, brave }),
    userAgent: navigator.userAgent,
    screen: `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}`,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    venueTimezone: getEventTimeZone(),
    online: navigator.onLine,
    connection: nav.connection?.effectiveType ?? null,
    now: new Date().toISOString(),
    mock: {
      now: params.get("mockNow"),
      speed: params.get("mockSpeed"),
      dataset: params.get("dataset"),
    },
    dataset: { key: dataset.key, eventId: dataset.eventId },
    signedIn: known.signedIn,
    interests: known.interests,
    catalogue: { main: sync(main), hubs: sync(hubs) },
    storage,
    serviceWorker: sw,
    push,
    recentConsole: recentConsoleEntries(),
  };
}
