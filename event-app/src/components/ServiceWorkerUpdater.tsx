"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RefreshCw, X } from "lucide-react";
import APP_CONFIG from "@/CONFIG";
import { PrimaryButton } from "@/components/Buttons";
import { isKioskChangeoverNear } from "@/components/room-screen/kioskState";
import { trackEvent } from "@/data/analytics/track";
import { pauseImageWarming } from "@/data/hooks/use-warm-images";
import { parseKioskPath } from "@/routing/viewParams";
import { createUpdateFlow, type UpdateMarker, type UpdateState } from "@/utils/serviceWorkerUpdate";
import {
  HIDDEN_DELAY_MS,
  KIOSK_RETRY_MS,
  hiddenUpdateBlocker,
  kioskUpdateBlocker,
  returnUpdateBlocker,
  toastDue,
  type UpdateTrigger,
} from "@/utils/silentUpdate";
import { timeoutSignal } from "@/utils/timeoutSignal";
import { dialogOpen, mediaPlaying, typing } from "@/utils/updateSafety";

/** sessionStorage: an update was asked for and the page reloaded to finish it. */
const MARKER_KEY = "sw-update-requested";
/** localStorage: when a new build was first seen waiting on this device (the 24 h toast fallback). */
const AVAILABLE_KEY = "sw-update-available-since";
/** sessionStorage: the scroll position a quiet hidden-tab switch left behind. */
const SCROLL_KEY = "sw-update-scroll";
/** The build's own id, time and urgent flag, written by next.config.ts; fetched from the current deploy. */
const VERSION_URL = "/version.json";
/** localStorage: the last quiet switch this device made (survives the reload it causes). */
const LAST_AUTO_KEY = "sw-update-last-auto";

/**
 * What the EF internal tools show about the updater (internal/UpdateTools.tsx):
 * a readout, never a second source of truth. Real-clock timestamps.
 */
export interface UpdateDebug {
  /** Service workers exist here (not under `pnpm dev`, not on an insecure origin). */
  supported: boolean;
  kiosk: boolean;
  /** A worker controls this page. */
  controlled: boolean;
  /** A newer build is installed and waiting. */
  waiting: boolean;
  state: UpdateState;
  /** The running switch was started quietly (kiosk, launch, hidden, return), not by a click. */
  quiet: boolean;
  lastCheckAt: number | null;
  nextCheckAt: number | null;
  hiddenSince: number | null;
  lastDefer: { reason: string; at: number } | null;
  /** The last quiet switch, from this load or carried over its reload. */
  lastRequest: { trigger: string; at: number } | null;
}

function readLastAuto(): UpdateDebug["lastRequest"] {
  try {
    const raw = localStorage.getItem(LAST_AUTO_KEY);
    const v = raw ? (JSON.parse(raw) as { trigger?: unknown; at?: unknown }) : null;
    return v && typeof v.trigger === "string" && typeof v.at === "number" ? { trigger: v.trigger, at: v.at } : null;
  } catch {
    return null;
  }
}

let debug: UpdateDebug = {
  supported: true,
  kiosk: false,
  controlled: false,
  waiting: false,
  state: "idle",
  quiet: false,
  lastCheckAt: null,
  nextCheckAt: null,
  hiddenSince: null,
  lastDefer: null,
  lastRequest: null,
};
const debugListeners = new Set<() => void>();
function setDebug(patch: Partial<UpdateDebug>) {
  debug = { ...debug, ...patch };
  debugListeners.forEach((listener) => listener());
}
const subscribeDebug = (listener: () => void) => {
  debugListeners.add(listener);
  return () => {
    debugListeners.delete(listener);
  };
};
const SERVER_DEBUG: UpdateDebug = { ...debug };

/** The updater's live state for the EF internal tools. */
export function useUpdateDebug(): UpdateDebug {
  return useSyncExternalStore(subscribeDebug, () => debug, () => SERVER_DEBUG);
}

/** A quiet switch is running on this page right now (UpdatingIndicator in the header). */
export function useQuietUpdating(): boolean {
  const d = useUpdateDebug();
  return d.quiet && d.state === "updating";
}

let debugActions = { checkNow: () => {}, applyNow: () => {} };
/** EF internal tools: ask the browser for a new worker right now. */
export function updateCheckNow() {
  debugActions.checkNow();
}
/** EF internal tools: apply a waiting build right now (counts as an accepted update). */
export function updateApplyNow() {
  debugActions.applyNow();
}

function readMarker(): UpdateMarker | null {
  try {
    const raw = sessionStorage.getItem(MARKER_KEY);
    if (!raw) return null;
    const marker = JSON.parse(raw) as Partial<UpdateMarker> | null;
    if (typeof marker?.at !== "number" || typeof marker.reloads !== "number") return null;
    return typeof marker.quiet === "string"
      ? { at: marker.at, reloads: marker.reloads, quiet: marker.quiet }
      : { at: marker.at, reloads: marker.reloads };
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

function availableSince(): number | null {
  try {
    const raw = localStorage.getItem(AVAILABLE_KEY);
    const at = raw ? Number(raw) : NaN;
    return Number.isFinite(at) ? at : null;
  } catch {
    return null;
  }
}

function markAvailable(): void {
  if (availableSince() !== null) return;
  try {
    localStorage.setItem(AVAILABLE_KEY, String(Date.now()));
  } catch {
    // Storage blocked: the fallback toast never comes due, the quiet paths still run.
  }
}

function clearAvailable(): void {
  try {
    localStorage.removeItem(AVAILABLE_KEY);
  } catch {
    // see above
  }
}

function saveScroll(): void {
  try {
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ path: window.location.pathname, y: window.scrollY }));
  } catch {
    // Storage blocked: the page comes back at the top.
  }
}

/** After a quiet switch, put the page back where it was; the lists render once the store hydrates, so a few tries. */
function restoreScroll(): void {
  let saved: { path?: unknown; y?: unknown } | null = null;
  try {
    const raw = sessionStorage.getItem(SCROLL_KEY);
    if (raw) {
      sessionStorage.removeItem(SCROLL_KEY);
      saved = JSON.parse(raw) as { path?: unknown; y?: unknown };
    }
  } catch {
    return;
  }
  if (!saved || saved.path !== window.location.pathname || typeof saved.y !== "number" || !(saved.y > 0)) return;
  const y = saved.y;
  // The lists fill in as the store hydrates, so scroll once the page is tall
  // enough to hold the position (a short page clamps the scroll), or at the
  // last attempt whatever the height.
  const deadline = Date.now() + 4000;
  const attempt = () => {
    const tall = document.documentElement.scrollHeight - window.innerHeight >= y;
    if (tall || Date.now() >= deadline) {
      window.scrollTo(0, y);
      return;
    }
    window.setTimeout(attempt, 100);
  };
  attempt();
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
        <p className="text-xs text-gray-500 lg:whitespace-nowrap">New version being applied.</p>
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
 * How often an open page checks for a new worker: a conditional request for
 * /sw.js that the CDN answers with a 304 when nothing changed. The same tick
 * re-arms a stuck kiosk and brings the fallback toast when due.
 */
const CHECK_INTERVAL_MS = 60_000;
const TICK_MS = 5_000;

/**
 * Applies new app versions at quiet moments and keeps the update toast as the
 * fallback. The worker is built with `skipWaiting: false`: a new build
 * installs and waits until this component asks it to take over, after which
 * the page reloads at once (a page on the old build must never keep running
 * under the new worker). The state machine is utils/serviceWorkerUpdate.ts,
 * the decisions utils/silentUpdate.ts; this component wires both to the
 * registration, the page and storage.
 *
 * - Kiosk (`/room-screens/<id>`, the TVs): the switch happens by itself as
 *   soon as the TV is online (a real probe, not only navigator.onLine) and no
 *   session in the room starts or ends within two minutes; while something
 *   is in the way it re-checks every 30 s, and after the reload bound it
 *   re-arms on the minute check, so an unattended screen never gets stuck.
 *   No toast, ever. A TV also never reloads while offline.
 * - Launch: a worker already waiting when the app boots is applied at once,
 *   before anything on screen matters.
 * - Hidden tab: 15 s after the tab goes hidden, unless a stream or
 *   translation player is mounted, a sheet or dialog is open or someone was
 *   typing; the scroll position rides along and is restored.
 * - Return: a phone freezes a hidden page, so that timer never fires there.
 *   Coming back after at least 15 s away applies the waiting build at
 *   once under the same guards: the page re-appears and refreshes once, with
 *   the scroll restored.
 * - Another page switched the worker (`controllerchange` this page did not
 *   ask for): this page runs the old build under the new worker and a lazy
 *   load could fail, so it reloads at its next hidden moment, or shows the
 *   toast while visible.
 * - Toast fallback: a build still waiting 24 h after it was first seen on the
 *   device, or one the new deploy marks urgent (/version.json). Its faces for
 *   a running switch show only when the user clicked, except "Still
 *   updating", which a quiet switch shows too (not on a kiosk).
 *
 * Renders nothing; mount once at the app root. No-ops in dev (SW disabled) and
 * on browsers / insecure contexts without service worker support. Outside
 * production `?previewUpdateToast=1` shows the toast on its own (the dev
 * server has no service worker to wait on); `=updating` and `=slow` show the
 * other two faces; its buttons just reload.
 */
export function ServiceWorkerUpdater() {
  const pathname = usePathname();
  const kiosk = APP_CONFIG.KIOSK_AUTO_UPDATE && parseKioskPath(pathname) !== null;
  const kioskRef = useRef(false);
  useEffect(() => {
    kioskRef.current = kiosk;
    setDebug({ kiosk });
  }, [kiosk]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const preview =
      process.env.NODE_ENV !== "production" ? new URLSearchParams(window.location.search).get("previewUpdateToast") : null;
    if (preview) {
      const state: Exclude<UpdateState, "idle"> = preview === "updating" || preview === "slow" ? preview : "available";
      // Next tick: this effect runs before the Toaster's (a later sibling
      // in the root layout), and a toast published before it subscribes
      // never shows. The real prompt arrives async, so only the preview
      // needs the wait.
      let id: string | number | undefined;
      const timer = window.setTimeout(() => {
        const reload = () => window.location.reload();
        id = toast.custom(
          (toastId) => (
            <UpdateToast state={state} onUpdate={reload} onReload={reload} onDismiss={() => toast.dismiss(toastId)} />
          ),
          TOAST_OPTIONS
        );
      }, 0);
      return () => {
        window.clearTimeout(timer);
        if (id !== undefined) toast.dismiss(id);
      };
    }
    if (!("serviceWorker" in navigator)) {
      setDebug({ supported: false });
      return;
    }
    restoreScroll();
    setDebug({
      supported: true,
      controlled: !!navigator.serviceWorker.controller,
      lastRequest: readLastAuto(),
      hiddenSince: document.visibilityState === "hidden" ? Date.now() : null,
    });

    let registration: ServiceWorkerRegistration | undefined;
    let toastId: string | number | undefined;
    /** The quiet trigger behind the current request; null when the user clicked. */
    let quiet: UpdateTrigger | null = null;
    /** Another page switched the worker: this one must reload at its own quiet moment. */
    let foreign = false;
    let urgent = false;
    let hiddenSince: number | null = null;
    let hiddenTimer: number | null = null;
    let kioskTimer: number | null = null;
    /**
     * Whether a worker controlled this page when it loaded. On a first install
     * the new worker claims the page (clientsClaim) and `controllerchange`
     * fires without any switch between builds; that one is not a foreign
     * switch and must do nothing.
     */
    let hadController = !!navigator.serviceWorker.controller;
    /**
     * The old Devcon 7 app's worker still controlled this page when it loaded
     * (its `workbox-precache-*` cache is the tell, see sw.ts). The takeover
     * there skips waiting, claims and reloads every page itself, so its
     * `controllerchange` is not a switch between builds of this app either.
     */
    let legacyTakeover = false;
    if (typeof caches !== "undefined") {
      caches
        .keys()
        .then((keys) => {
          legacyTakeover = keys.some((key) => key.startsWith("workbox-precache"));
        })
        .catch(() => {});
    }
    const isKiosk = () => kioskRef.current;
    // A quiet switch that needed the fallback reload resumes quietly too:
    // without this the resumed request would show the toast's "Updating" face.
    const carried = readMarker();
    if (carried?.quiet === "kiosk" || carried?.quiet === "launch" || carried?.quiet === "hidden" || carried?.quiet === "return") {
      quiet = carried.quiet;
      setDebug({ quiet: true });
    }

    function dismissToast() {
      if (toastId !== undefined) toast.dismiss(toastId);
      toastId = undefined;
    }

    function showToast(state: Exclude<UpdateState, "idle">) {
      if (state === "available" && toastId === undefined) trackEvent("sw", "update-shown");
      const onUpdate = () => {
        trackEvent("sw", "update-accepted");
        quiet = null;
        setDebug({ quiet: false });
        foreign = false;
        flow.requestUpdate();
      };
      // A fresh attempt: the reload bound starts over for this click.
      const onReload = () => {
        trackEvent("sw", "update-reload");
        writeMarker({ at: Date.now(), reloads: 0 });
        window.location.reload();
      };
      // Same id: sonner swaps the content of the toast already showing. The
      // key is only set once there is an id: sonner spreads the options over
      // its own id, so an explicit `id: undefined` makes it create a toast
      // under a different id than the one it returns.
      toastId = toast.custom(
        () => <UpdateToast state={state} onUpdate={onUpdate} onReload={onReload} onDismiss={dismissToast} />,
        toastId === undefined ? TOAST_OPTIONS : { ...TOAST_OPTIONS, id: toastId }
      );
    }

    /** A TV never reloads without network; everyone else reloads at once (the shells are precached). */
    function reloadNow() {
      if (isKiosk() && !navigator.onLine) {
        window.setTimeout(reloadNow, 5000);
        return;
      }
      window.location.reload();
    }

    let dueAt = Date.now() + CHECK_INTERVAL_MS;

    /** The browser's own update check (the periodic tick, a tab coming back, the tools' button). */
    function check() {
      registration?.update().catch(() => {});
      const now = Date.now();
      dueAt = now + CHECK_INTERVAL_MS;
      setDebug({ lastCheckAt: now, nextCheckAt: dueAt, waiting: !!registration?.waiting });
    }

    /** A quiet switch: ask the waiting worker (or, after a foreign switch, just reload). */
    function request(trigger: UpdateTrigger) {
      quiet = trigger;
      trackEvent("sw", "update-auto", trigger);
      const at = Date.now();
      try {
        localStorage.setItem(LAST_AUTO_KEY, JSON.stringify({ trigger, at }));
      } catch {
        // Storage blocked: the readout forgets it over the reload.
      }
      setDebug({ lastRequest: { trigger, at }, quiet: true });
      if (trigger === "hidden" || trigger === "return") saveScroll();
      foreign = false;
      dismissToast();
      flow.requestUpdate(trigger);
    }

    function pendingQuiet() {
      return APP_CONFIG.SILENT_UPDATE_HIDDEN && !isKiosk() && (flow.state === "available" || foreign);
    }

    function stopHiddenTimer() {
      if (hiddenTimer === null) return;
      window.clearTimeout(hiddenTimer);
      hiddenTimer = null;
    }

    function startHiddenTimer() {
      stopHiddenTimer();
      hiddenTimer = window.setTimeout(onHiddenTimer, HIDDEN_DELAY_MS);
    }

    function onHiddenTimer() {
      hiddenTimer = null;
      if (!pendingQuiet()) return;
      const blocker = hiddenUpdateBlocker({
        online: navigator.onLine,
        changeoverNear: false,
        hidden: document.visibilityState === "hidden",
        hiddenForMs: hiddenSince === null ? 0 : Date.now() - hiddenSince,
        mediaPlaying: mediaPlaying(),
        dialogOpen: dialogOpen(),
        typing: typing(),
      });
      if (blocker) {
        // The next time the tab hides, it tries again.
        trackEvent("sw", "update-deferred", blocker);
        setDebug({ lastDefer: { reason: blocker, at: Date.now() } });
        return;
      }
      request("hidden");
    }

    /** The network for real: the version file is not cached by the worker, so this reaches the server or fails. */
    async function probeOnline(): Promise<boolean> {
      try {
        const res = await fetch(`${VERSION_URL}?probe=${Date.now()}`, { cache: "no-store", signal: timeoutSignal(5000) });
        return res.ok;
      } catch {
        return false;
      }
    }

    function tryKiosk() {
      if (kioskTimer !== null) {
        window.clearTimeout(kioskTimer);
        kioskTimer = null;
      }
      if (flow.state !== "available" && !foreign) return;
      void (async () => {
        const online = navigator.onLine && (await probeOnline());
        const blocker = kioskUpdateBlocker({
          online,
          changeoverNear: isKioskChangeoverNear(),
          hidden: false,
          hiddenForMs: 0,
          mediaPlaying: false,
          dialogOpen: false,
          typing: false,
        });
        if (blocker) {
          trackEvent("sw", "update-deferred", blocker);
          setDebug({ lastDefer: { reason: blocker, at: Date.now() } });
          kioskTimer = window.setTimeout(tryKiosk, KIOSK_RETRY_MS);
          return;
        }
        // The state may have moved while the probe ran.
        if (flow.state !== "available" && !foreign) return;
        request("kiosk");
      })();
    }

    /** The new deploy's own word on urgency, read once a build is seen waiting. */
    async function checkUrgent() {
      try {
        const res = await fetch(`${VERSION_URL}?at=${Date.now()}`, { cache: "no-store", signal: timeoutSignal(5000) });
        if (!res.ok) return;
        const info = (await res.json()) as { urgent?: unknown };
        if (info.urgent !== true || urgent) return;
        urgent = true;
        if ((flow.state === "available" || foreign) && toastId === undefined && !isKiosk()) showToast("available");
      } catch {
        // Not reachable: not urgent.
      }
    }

    /** A new build is waiting: the kiosk goes, everyone else waits for a quiet moment or the fallback. */
    function onAvailable() {
      if (isKiosk()) {
        tryKiosk();
        return;
      }
      markAvailable();
      void checkUrgent();
      if (toastDue(availableSince(), Date.now(), urgent)) {
        showToast("available");
        return;
      }
      if (document.visibilityState === "hidden") {
        hiddenSince ??= Date.now();
        startHiddenTimer();
      }
    }

    const flow = createUpdateFlow({
      waiting: () => registration?.waiting ?? null,
      installing: () => !!registration?.installing,
      pauseWarming: pauseImageWarming,
      reload: reloadNow,
      readMarker,
      writeMarker,
      setTimeout: (fn, ms) => window.setTimeout(fn, ms),
      clearTimeout: (id) => window.clearTimeout(id as number),
      now: Date.now,
      onState: (state) => {
        setDebug({ state, waiting: !!registration?.waiting, ...(state === "updating" ? {} : { quiet: false }) });
        if (state === "idle") {
          dismissToast();
          return;
        }
        if (state === "available") {
          onAvailable();
          return;
        }
        if (state === "slow") trackEvent("sw", "update-slow");
        // The user clicked: the faces as before. A quiet switch stays quiet,
        // except one that got stuck, where a person can help (never a TV: the
        // minute check re-arms it instead).
        if (quiet === null || (state === "slow" && !isKiosk())) showToast(state);
      },
    });

    const onControllerChange = () => {
      setDebug({ controlled: true, waiting: false });
      const firstInstall = !hadController;
      hadController = true;
      if (firstInstall) return; // the page is already on this build
      if (legacyTakeover) {
        // The worker reloads this page itself (sw.ts, activate).
        legacyTakeover = false;
        return;
      }
      clearAvailable();
      flow.controllerChanged();
      if (flow.state === "updating") return; // our request: the flow reloads
      // Another page asked for the switch: this page runs the old build under
      // the new worker, where a lazy load could fail.
      foreign = true;
      if (isKiosk()) {
        tryKiosk();
        return;
      }
      if (document.visibilityState === "hidden") {
        hiddenSince ??= Date.now();
        startHiddenTimer();
        return;
      }
      showToast("available");
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker.ready.then((reg) => {
      // Only a test harness that blocks workers resolves this with nothing.
      if (!reg) return;
      registration = reg;
      // Nothing waiting now: whatever was waiting has been applied or dropped,
      // so the fallback toast's clock must not carry over to the next build.
      if (!reg.waiting) clearAvailable();
      setDebug({ controlled: !!navigator.serviceWorker.controller, waiting: !!reg.waiting, nextCheckAt: dueAt });
      debugActions = {
        checkNow: check,
        applyNow: () => {
          if (!registration?.waiting && flow.state !== "available" && !foreign) return;
          trackEvent("sw", "update-accepted");
          quiet = null;
          setDebug({ quiet: false });
          foreign = false;
          dismissToast();
          flow.requestUpdate();
        },
      };

      // A request carried over a reload resumes here, without a click.
      flow.start();

      // A worker already waiting from an earlier session: at launch nothing on
      // screen matters yet, so it is applied at once (the kiosk through its
      // own gates).
      if (reg.waiting && navigator.serviceWorker.controller) {
        if (!isKiosk() && APP_CONFIG.SILENT_UPDATE_LAUNCH && flow.state === "idle") request("launch");
        else flow.updateAvailable();
      }

      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          setDebug({ waiting: !!reg.waiting });
          // "installed" while a controller already exists => an update, not the
          // first install (which has no controller to replace).
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            flow.workerInstalled(installing);
          }
        });
      });
    });

    // A tab coming back checks for a new worker; a tab going away starts the
    // quiet-switch clock when a build is waiting.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const away = hiddenSince === null ? 0 : Date.now() - hiddenSince;
        hiddenSince = null;
        stopHiddenTimer();
        setDebug({ hiddenSince: null });
        check();
        // The hidden timer never ran on a frozen page (iOS): a return after a
        // real absence is the quiet moment instead.
        if (away > 0 && pendingQuiet()) {
          const blocker = returnUpdateBlocker({
            online: navigator.onLine,
            changeoverNear: false,
            hidden: false,
            hiddenForMs: away,
            mediaPlaying: mediaPlaying(),
            dialogOpen: dialogOpen(),
            typing: typing(),
          });
          if (!blocker) {
            request("return");
          } else if (blocker !== "too-soon") {
            trackEvent("sw", "update-deferred", blocker);
            setDebug({ lastDefer: { reason: blocker, at: Date.now() } });
          }
        }
        return;
      }
      hiddenSince = Date.now();
      setDebug({ hiddenSince });
      if (pendingQuiet()) startHiddenTimer();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Also poll: a tab that's left open and focused the whole time (never
    // backgrounded) would otherwise never re-check and could sit on a stale
    // build indefinitely. A short tick, so the other duties below run promptly.
    const intervalId = window.setInterval(() => {
      if (Date.now() >= dueAt) check();
      if (isKiosk()) {
        if (flow.state === "slow") flow.reset();
        return;
      }
      if (toastId === undefined && (flow.state === "available" || foreign) && toastDue(availableSince(), Date.now(), urgent)) {
        showToast("available");
      }
    }, TICK_MS);

    return () => {
      debugActions = { checkNow: () => {}, applyNow: () => {} };
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(intervalId);
      stopHiddenTimer();
      if (kioskTimer !== null) window.clearTimeout(kioskTimer);
      flow.dispose();
      dismissToast();
    };
  }, []);

  return null;
}
