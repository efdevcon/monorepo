"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { RefreshCw, Sparkles, X } from "lucide-react";

/**
 * Watches the service worker for an updated version and prompts the user to
 * reload. The SW is built with `skipWaiting: false`, so a new worker installs
 * but stays "waiting" until the user opts in — we surface that as a toast, then
 * message the worker to activate (handled by the `SKIP_WAITING` listener in
 * sw.ts) and reload once it takes control.
 *
 * Renders nothing; mount once at the app root. No-ops in dev (SW disabled) and
 * on browsers / insecure contexts without service worker support.
 */
export function ServiceWorkerUpdater() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let reloading = false;
    let skipWaitingRequested = false;
    let toastId: string | number | undefined;
    let registration: ServiceWorkerRegistration | undefined;

    const promptUpdate = (worker: ServiceWorker) => {
      if (toastId !== undefined) return; // already prompting
      const reload = () => {
        skipWaitingRequested = true;
        worker.postMessage({ type: "SKIP_WAITING" });
      };
      toastId = toast.custom(
        (id) => (
          <div className="flex w-full items-center gap-3 rounded-2xl border border-black/5 bg-white p-3 pl-4 shadow-xl ring-1 ring-black/5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7D52F4] to-[#a077f3] text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">Update available</p>
              <p className="truncate text-xs text-gray-500">A new version is ready.</p>
            </div>
            <button
              onClick={reload}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#7D52F4] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#6A3FD1] active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reload
            </button>
            <button
              onClick={() => toast.dismiss(id)}
              aria-label="Dismiss"
              className="shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ),
        { duration: Infinity }
      );
    };

    // The new worker has taken control — reload, but only if the user asked for
    // it (guards against a surprise reload on the very first SW install).
    const onControllerChange = () => {
      if (!skipWaitingRequested || reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker.ready.then((reg) => {
      registration = reg;

      // A worker may already be waiting from a previous session.
      if (reg.waiting && navigator.serviceWorker.controller) {
        promptUpdate(reg.waiting);
      }

      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          // "installed" while a controller already exists => an update, not the
          // first install (which has no controller to replace).
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            promptUpdate(installing);
          }
        });
      });
    });

    // Proactively check for a new worker whenever the app regains focus.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        registration?.update().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (toastId !== undefined) toast.dismiss(toastId);
    };
  }, []);

  return null;
}
