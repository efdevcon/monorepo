"use client";

import { useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import { StateMessage } from "@/components/StateMessage";

/**
 * Offline fallback, served by the service worker for a document navigation it
 * can't fulfil offline. Every app route is a precached shell and detail pages
 * fall back to their list tab's shell, so this only shows for routes that
 * aren't part of the app shell at all. The address bar keeps the original
 * URL, so reconnecting reloads the page the user actually wanted.
 *
 * If the page mounts while the browser already reports online (the
 * connection came back before this loaded, or the server itself failed), it
 * reloads once right away; a repeat within 30 s is left alone so a failing
 * server can't spin the tab in a reload loop.
 */
const RELOAD_GUARD_KEY = "dc-offline-reload";
const RELOAD_GUARD_MS = 30_000;

function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_GUARD_MS) return false;
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    // Storage blocked: reload anyway, the online event is a one-off.
  }
  window.location.reload();
  return true;
}

export default function OfflinePage() {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (navigator.onLine && reloadOnce()) return;
    setOnline(navigator.onLine);
    const onOnline = () => {
      setOnline(true);
      reloadOnce();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <main className="flex min-h-dvh items-center justify-center py-16">
      <div className="app-bg" aria-hidden />
      <StateMessage
        icon={CloudOff}
        title={online ? "Couldn't load this page" : "You're offline"}
        body={
          online
            ? "This page couldn't be loaded. Try again, or head back to the app."
            : "Sorry, this page isn't available offline. Reconnect to a network to reload, or head back to the app."
        }
        headingLevel="h1"
      >
        <PrimaryButton type="button" onClick={() => window.location.reload()} className="w-full">
          Try again
          <RefreshCw className="size-4" />
        </PrimaryButton>
        {/* Full load, not <Link>: this page is the SW's fallback, so client
            routing is exactly what just failed; a full load retries the SW. */}
        <SecondaryButton type="button" onClick={() => window.location.assign("/")} className="w-full">
          Back to Home
        </SecondaryButton>
      </StateMessage>
    </main>
  );
}
