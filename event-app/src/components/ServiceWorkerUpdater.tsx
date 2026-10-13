"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { RefreshCw, X } from "lucide-react";
import { PrimaryButton } from "@/components/Buttons";

/**
 * The update toast itself. `onUpdate` activates the waiting worker; the
 * reload follows once it takes control. Returns the toast id.
 */
function showUpdateToast(onUpdate: () => void): string | number {
  return toast.custom(
    (id) => (
      <div className="flex w-full items-center gap-3 rounded-2xl border border-black/5 bg-white p-3 pl-4 shadow-xl ring-1 ring-black/5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">Update available</p>
          <p className="text-xs text-gray-500 lg:whitespace-nowrap">A new app version is ready.</p>
        </div>
        {/* Desktop: 24px from the text (12px gap + 12px); the dismiss stays at 12.
            16px sides inline: the sm size's px-6 can't be overridden by class
            (plain classnames, no tailwind-merge). */}
        <PrimaryButton
          size="sm"
          onClick={onUpdate}
          className="shrink-0 lg:ml-3"
          style={{ paddingLeft: 16, paddingRight: 16 }}
        >
          <RefreshCw className="size-4" />
          Update
        </PrimaryButton>
        <button
          onClick={() => toast.dismiss(id)}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ),
    {
      duration: Infinity,
      // Desktop: the body copy stays on one line (nowrap above), which
      // needs a few px more than sonner's fixed 356px slot. The toast
      // element (position:absolute, no width rule for a custom toast) is
      // sized to its content and re-centred on the slot: left 50% +
      // translate (the `translate` property; sonner's own transform keeps
      // its entry animation). Mobile keeps sonner's full-width rule.
      className: "lg:left-1/2 lg:w-max lg:-translate-x-1/2",
    }
  );
}

/**
 * Watches the service worker for an updated version and prompts the user to
 * reload. The SW is built with `skipWaiting: false`, so a new worker installs
 * but stays "waiting" until the user opts in — we surface that as a toast, then
 * message the worker to activate (handled by the `SKIP_WAITING` listener in
 * sw.ts) and reload once it takes control.
 *
 * Renders nothing; mount once at the app root. No-ops in dev (SW disabled) and
 * on browsers / insecure contexts without service worker support. Outside
 * production `?previewUpdateToast=1` shows the toast on its own (the dev
 * server has no service worker to wait on); its button just reloads.
 */
export function ServiceWorkerUpdater() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      process.env.NODE_ENV !== "production" &&
      new URLSearchParams(window.location.search).get("previewUpdateToast")
    ) {
      // Next tick: this effect runs before the Toaster's (a later sibling
      // in the root layout), and a toast published before it subscribes
      // never shows. The real prompt arrives async, so only the preview
      // needs the wait.
      let id: string | number | undefined;
      const timer = window.setTimeout(() => {
        id = showUpdateToast(() => window.location.reload());
      }, 0);
      return () => {
        window.clearTimeout(timer);
        if (id !== undefined) toast.dismiss(id);
      };
    }
    if (!("serviceWorker" in navigator)) return;

    let reloading = false;
    let skipWaitingRequested = false;
    let toastId: string | number | undefined;
    let registration: ServiceWorkerRegistration | undefined;

    const promptUpdate = (worker: ServiceWorker) => {
      if (toastId !== undefined) return; // already prompting
      toastId = showUpdateToast(() => {
        skipWaitingRequested = true;
        worker.postMessage({ type: "SKIP_WAITING" });
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

    // Also poll on an interval: a tab that's left open and focused the whole
    // time (never backgrounded) would otherwise never re-check and could sit
    // on a stale build indefinitely, only "fixed" by a hard refresh.
    const CHECK_INTERVAL_MS = 60_000;
    const intervalId = window.setInterval(() => {
      registration?.update().catch(() => {});
    }, CHECK_INTERVAL_MS);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(intervalId);
      if (toastId !== undefined) toast.dismiss(toastId);
    };
  }, []);

  return null;
}
