"use client";

import { trackEvent } from "@/data/analytics/track";
import { useEffect } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, X } from "lucide-react";
import { PrimaryButton } from "@/components/Buttons";
import { pauseImageWarming } from "@/data/hooks/use-warm-images";
import { createUpdateFlow, type UpdateMarker, type UpdateState } from "@/utils/serviceWorkerUpdate";

/** sessionStorage: an update was asked for and the page reloaded to finish it. */
const MARKER_KEY = "sw-update-requested";

function readMarker(): UpdateMarker | null {
  try {
    const raw = sessionStorage.getItem(MARKER_KEY);
    if (!raw) return null;
    const marker = JSON.parse(raw) as Partial<UpdateMarker> | null;
    return typeof marker?.at === "number" && typeof marker.reloads === "number"
      ? { at: marker.at, reloads: marker.reloads }
      : null;
  } catch {
    return null;
  }
}

function writeMarker(marker: UpdateMarker | null): void {
  try {
    if (marker) sessionStorage.setItem(MARKER_KEY, JSON.stringify(marker));
    else sessionStorage.removeItem(MARKER_KEY);
  } catch {
    // Storage blocked: the request is not carried over a reload, the click still works.
  }
}

const toastFrame =
  "flex w-full items-center gap-3 rounded-2xl border border-black/5 bg-white p-3 pl-4 shadow-xl ring-1 ring-black/5";

/**
 * The toast's three faces: the prompt, the switch in progress, and the switch
 * taking longer than it should (see serviceWorkerUpdate.ts for why it can).
 */
function UpdateToast({
  state,
  onUpdate,
  onReload,
  onDismiss,
}: {
  state: Exclude<UpdateState, "idle">;
  onUpdate: () => void;
  onReload: () => void;
  onDismiss: () => void;
}) {
  if (state === "available") {
    return (
      <div className={toastFrame}>
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
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }
  if (state === "slow") {
    return (
      <div className={toastFrame} role="status">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">Still updating</p>
          <p className="text-xs text-gray-500">
            Closing other tabs with the app open helps. It finishes by itself within a few minutes.
          </p>
        </div>
        <PrimaryButton size="sm" onClick={onReload} className="shrink-0" style={{ paddingLeft: 16, paddingRight: 16 }}>
          <RefreshCw className="size-4" />
          Reload
        </PrimaryButton>
      </div>
    );
  }
  return (
    <div className={toastFrame} role="status">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">Updating</p>
        <p className="text-xs text-gray-500 lg:whitespace-nowrap">The new version is taking over.</p>
      </div>
      <Loader2 className="size-5 shrink-0 animate-spin text-gray-400" aria-label="Updating" />
    </div>
  );
}

const TOAST_OPTIONS = {
  duration: Infinity,
  // Desktop: the body copy stays on one line (nowrap above), which needs a
  // few px more than sonner's fixed 356px slot. The toast element
  // (position:absolute, no width rule for a custom toast) is sized to its
  // content and re-centred on the slot: left 50% + translate (the `translate`
  // property; sonner's own transform keeps its entry animation). Mobile keeps
  // sonner's full-width rule.
  className: "lg:left-1/2 lg:w-max lg:max-w-md lg:-translate-x-1/2",
};

/**
 * Watches the service worker for an updated version and prompts the user to
 * reload. The SW is built with `skipWaiting: false`, so a new worker installs
 * but stays "waiting" until the user opts in. The toast's states and what the
 * click does are the update flow in utils/serviceWorkerUpdate.ts; this
 * component wires it to the registration, sessionStorage and the toast.
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
        const reload = () => window.location.reload();
        id = toast.custom(
          (toastId) => (
            <UpdateToast state="available" onUpdate={reload} onReload={reload} onDismiss={() => toast.dismiss(toastId)} />
          ),
          TOAST_OPTIONS
        );
      }, 0);
      return () => {
        window.clearTimeout(timer);
        if (id !== undefined) toast.dismiss(id);
      };
    }
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | undefined;
    let toastId: string | number | undefined;

    const flow = createUpdateFlow({
      waiting: () => registration?.waiting ?? null,
      installing: () => !!registration?.installing,
      pauseWarming: pauseImageWarming,
      reload: () => window.location.reload(),
      readMarker,
      writeMarker,
      setTimeout: (fn, ms) => window.setTimeout(fn, ms),
      clearTimeout: (id) => window.clearTimeout(id as number),
      now: Date.now,
      onState: (state) => {
        if (state === "idle") {
          if (toastId !== undefined) toast.dismiss(toastId);
          toastId = undefined;
          return;
        }
        if (state === "available") trackEvent("sw", "update-shown");
        if (state === "slow") trackEvent("sw", "update-slow");
        const onUpdate = () => {
          trackEvent("sw", "update-accepted");
          flow.requestUpdate();
        };
        // A fresh attempt: the reload bound starts over for this click.
        const onReload = () => {
          trackEvent("sw", "update-reload");
          writeMarker({ at: Date.now(), reloads: 0 });
          window.location.reload();
        };
        const onDismiss = () => {
          if (toastId !== undefined) toast.dismiss(toastId);
          toastId = undefined;
        };
        // Same id: sonner swaps the content of the toast already showing.
        toastId = toast.custom(
          () => <UpdateToast state={state} onUpdate={onUpdate} onReload={onReload} onDismiss={onDismiss} />,
          { ...TOAST_OPTIONS, id: toastId }
        );
      },
    });

    const onControllerChange = () => flow.controllerChanged();
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker.ready.then((reg) => {
      registration = reg;

      // A request carried over a reload resumes here, without a click.
      flow.start();

      // A worker may already be waiting from a previous session.
      if (reg.waiting && navigator.serviceWorker.controller) flow.updateAvailable();

      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          // "installed" while a controller already exists => an update, not the
          // first install (which has no controller to replace).
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            flow.workerInstalled(installing);
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
      flow.dispose();
      if (toastId !== undefined) toast.dismiss(toastId);
    };
  }, []);

  return null;
}
