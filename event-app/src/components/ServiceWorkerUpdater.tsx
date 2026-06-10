"use client";

import { useEffect } from "react";
import { toast } from "sonner";

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
      toastId = toast("A new version is available", {
        description: "Reload to get the latest.",
        duration: Infinity,
        action: {
          label: "Reload",
          onClick: () => {
            skipWaitingRequested = true;
            worker.postMessage({ type: "SKIP_WAITING" });
          },
        },
      });
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
