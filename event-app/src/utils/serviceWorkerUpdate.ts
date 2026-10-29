/**
 * The "Update" flow behind the update toast (ServiceWorkerUpdater.tsx), as a
 * small state machine with its browser dependencies injected so it can be
 * checked in scripts/test-data.ts.
 *
 * The worker is built with `skipWaiting: false`: a new version installs and
 * waits until the user opts in. Opting in posts SKIP_WAITING to the waiting
 * worker (sw.ts), and the page reloads once the new worker takes control.
 * Two things made that look like a dead button:
 *
 * 1. Chrome only lets the new worker take over once the old one has no fetch
 *    event in flight. Right after a load the image warmer keeps it busy for
 *    tens of seconds, and once the switch has been held back a trickle of
 *    further requests (hover prefetches, images while scrolling, another tab)
 *    can hold it for Chrome's five-minute limit. So the click pauses the
 *    warmer, aborting its requests, and if the switch still has not happened
 *    after TAKEOVER_TIMEOUT_MS the page reloads: a navigation ends the page's
 *    requests and the switch was seen to go through at once. The request is
 *    carried over the reload in sessionStorage so the flow resumes without a
 *    second click, with a bound on the reloads: past it the toast says it is
 *    still working and waits for the switch.
 * 2. The toast used to hold on to the worker object it was shown for. When
 *    another deploy landed before the click, that worker was redundant and
 *    the message went nowhere. The worker waiting at click time is asked, and
 *    a worker finishing its install after the click is asked too.
 */

/** The message sw.ts listens for. */
export const SKIP_WAITING_MESSAGE = { type: "SKIP_WAITING" } as const;
/** How long the new worker gets to take control before the page reloads to help it along. */
export const TAKEOVER_TIMEOUT_MS = 4000;
/** Reloads per update request before the flow stops reloading and just waits. */
export const MAX_FALLBACK_RELOADS = 2;
/** A carried-over request older than this is dropped: it is from another attempt. */
export const MARKER_TTL_MS = 10 * 60 * 1000;

export type UpdateState = "idle" | "available" | "updating" | "slow";

/** The request as carried across a reload. */
export interface UpdateMarker {
  at: number;
  reloads: number;
}

export interface WaitingWorker {
  postMessage(message: unknown): void;
}

export interface UpdateFlowDeps {
  /** The registration's waiting worker right now. */
  waiting(): WaitingWorker | null;
  /** A newer worker is still installing. */
  installing(): boolean;
  pauseWarming(): void;
  reload(): void;
  readMarker(): UpdateMarker | null;
  writeMarker(marker: UpdateMarker | null): void;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
  now(): number;
  onState(state: UpdateState): void;
}

export interface UpdateFlow {
  readonly state: UpdateState;
  /** Once the registration is known: resumes a request carried over a reload. */
  start(): void;
  /** A worker is waiting (found at start-up). */
  updateAvailable(): void;
  /** The user clicked Update. */
  requestUpdate(): void;
  /** A worker finished installing while a controller exists. */
  workerInstalled(worker: WaitingWorker): void;
  /** `controllerchange`: a worker took control of the page. */
  controllerChanged(): void;
  dispose(): void;
}

export function createUpdateFlow(deps: UpdateFlowDeps): UpdateFlow {
  let state: UpdateState = "idle";
  let requested = false;
  let timer: unknown = null;

  const setState = (next: UpdateState) => {
    state = next;
    deps.onState(next);
  };
  const disarm = () => {
    if (timer === null) return;
    deps.clearTimeout(timer);
    timer = null;
  };
  const onTimeout = () => {
    timer = null;
    const marker = deps.readMarker() ?? { at: deps.now(), reloads: 0 };
    if (marker.reloads < MAX_FALLBACK_RELOADS) {
      deps.writeMarker({ at: marker.at, reloads: marker.reloads + 1 });
      deps.reload();
      return;
    }
    setState("slow");
  };
  const ask = (worker: WaitingWorker) => worker.postMessage(SKIP_WAITING_MESSAGE);

  /** Shared by the click and a carried-over request. */
  const begin = (marker: UpdateMarker) => {
    requested = true;
    deps.pauseWarming();
    deps.writeMarker(marker);
    setState("updating");
    const worker = deps.waiting();
    if (worker) ask(worker);
    disarm();
    timer = deps.setTimeout(onTimeout, TAKEOVER_TIMEOUT_MS);
  };

  return {
    get state() {
      return state;
    },
    start() {
      const marker = deps.readMarker();
      if (!marker) return;
      if (deps.now() - marker.at > MARKER_TTL_MS) {
        deps.writeMarker(null);
        return;
      }
      if (deps.waiting() || deps.installing()) {
        begin(marker);
        return;
      }
      // Nothing waiting: the switch went through during the reload. One more
      // reload, so this page is served by the new worker rather than being the
      // old shell it may have been served under the old one.
      deps.writeMarker(null);
      if (marker.reloads < MAX_FALLBACK_RELOADS) deps.reload();
    },
    updateAvailable() {
      if (!requested) setState("available");
    },
    requestUpdate() {
      if (requested) return;
      if (!deps.waiting() && !deps.installing()) {
        // The switch already happened (another tab asked for it): the reload
        // alone brings in the new version.
        deps.writeMarker(null);
        deps.reload();
        return;
      }
      begin({ at: deps.now(), reloads: 0 });
    },
    workerInstalled(worker) {
      if (requested) ask(worker);
      else setState("available");
    },
    controllerChanged() {
      if (!requested) return;
      disarm();
      deps.writeMarker(null);
      deps.reload();
    },
    dispose: disarm,
  };
}
