"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Offline fallback. The service worker serves this page's HTML for any document
 * navigation it can't fulfil offline (a route that isn't precached and was never
 * cached online — typically a dynamic detail page like /speakers/[id] visited
 * for the first time while offline). The address bar keeps the original URL, so
 * reloading once back online lands the user on the page they actually wanted.
 *
 * It lives outside the (page-layout) group on purpose: no nav chrome, no auth
 * gate — just a clear message that works regardless of where it surfaces.
 */
export default function OfflinePage() {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    // When connectivity returns, reload the *current* URL — the SW (or network)
    // can now serve the page the user was actually trying to reach.
    const onOnline = () => window.location.reload();
    window.addEventListener("online", onOnline);
    const onOffline = () => setOnline(false);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f3eeff] text-[#7D52F4]">
        <WifiOff className="h-8 w-8" />
      </div>

      <div className="max-w-sm space-y-2">
        <h1 className="text-xl font-bold text-gray-900">You&apos;re offline</h1>
        <p className="text-sm text-gray-500">
          {online
            ? "You're back online — reloading…"
            : "This page hasn't been saved for offline use yet. Reconnect to load it, or head back to a page you've already opened."}
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full cursor-pointer rounded-full bg-[#7D52F4] py-2.5 font-medium text-white transition-colors hover:bg-[#6A3FD1]"
        >
          Try again
        </button>
        <a
          href="/"
          className="w-full rounded-full border border-[#E1E4EA] py-2.5 font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          Go to home
        </a>
      </div>
    </main>
  );
}
