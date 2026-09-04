"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Offline fallback, served by the service worker for a document navigation it
 * can't fulfil offline. Every app route is a precached shell (details are
 * query params on those shells), so this only shows for routes that aren't
 * part of the app shell at all. The address bar keeps the original URL, so
 * reconnecting reloads the page the user actually wanted.
 */
export default function OfflinePage() {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => window.location.reload();
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
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
            ? "You're back online, reloading…"
            : "This page isn't available offline. Reconnect to load it, or head back to the app."}
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
        {/* Hard <a>, not <Link>: this page is the SW's fallback, so client
            routing is exactly what just failed; a full load retries the SW. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
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
