"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { RefreshCw } from "lucide-react";
import cn from "classnames";
import { useOnline } from "@/hooks/useOnline";
import {
  WARM_IMAGE_CACHE,
  getWarmStatus,
  subscribeWarmStatus,
  warmedImageUrls,
  type WarmPhase,
} from "@/data/hooks/use-warm-images";
import { quietPill } from "./DebugTools";

/**
 * EF internal tools row: how ready this device is to work offline. Live
 * connection and image-warming state (CacheWarmer / useWarmImages), plus a
 * snapshot of the service worker, storage and Cache Storage, taken on open
 * and on Refresh (listing every cache's entries is too heavy to poll).
 */

const PHASE_LABEL: Record<WarmPhase, string> = {
  idle: "idle (nothing queued yet)",
  "waiting-for-worker": "waiting for the service worker to control the page",
  "connection-not-allowed": "skipped: Save-Data or a 2G connection",
  running: "warming",
  "paused-offline": "paused until the connection returns",
  "paused-update": "paused for the app update",
  done: "done",
};

interface Snapshot {
  worker: { controlled: boolean; script: string | null; waiting: boolean };
  storage: { usage: number; quota: number; persisted: boolean } | null;
  caches: { name: string; entries: number }[];
  /** Known warm URLs present in the image cache. */
  covered: number;
  known: number;
  takenAt: number;
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
const time = (ms: number) => new Date(ms).toLocaleTimeString();

async function takeSnapshot(): Promise<Snapshot> {
  const registration = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  const controller = navigator.serviceWorker?.controller ?? null;
  const worker = {
    controlled: controller !== null,
    script: controller ? new URL(controller.scriptURL).pathname : null,
    waiting: !!registration?.waiting,
  };

  let storage: Snapshot["storage"] = null;
  try {
    const estimate = await navigator.storage?.estimate();
    if (estimate) {
      storage = {
        usage: estimate.usage ?? 0,
        quota: estimate.quota ?? 0,
        persisted: (await navigator.storage.persisted?.()) ?? false,
      };
    }
  } catch {
    // Not available here: shown as unknown.
  }

  const list: Snapshot["caches"] = [];
  let covered = 0;
  const urls = warmedImageUrls();
  try {
    for (const name of await caches.keys()) {
      const keys = await (await caches.open(name)).keys();
      list.push({ name, entries: keys.length });
      if (name === WARM_IMAGE_CACHE) {
        const cached = new Set(keys.map((request) => request.url));
        covered = urls.filter((url) => cached.has(url)).length;
      }
    }
  } catch {
    // No Cache Storage (insecure context, private mode): empty list.
  }
  list.sort((a, b) => b.entries - a.entries);

  return { worker, storage, caches: list, covered, known: urls.length, takenAt: Date.now() };
}

export function OfflineTools() {
  const online = useOnline();
  const warm = useSyncExternalStore(subscribeWarmStatus, getWarmStatus, getWarmStatus);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    setSnapshot(await takeSnapshot());
    setBusy(false);
  }, []);

  // On open, and again when a worker takes over (that changes most of it).
  useEffect(() => {
    const load = () => void takeSnapshot().then(setSnapshot);
    load();
    navigator.serviceWorker?.addEventListener("controllerchange", load);
    return () => navigator.serviceWorker?.removeEventListener("controllerchange", load);
  }, []);

  const connection = (
    (typeof navigator === "undefined" ? undefined : navigator) as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }
  )?.connection;
  const done = warm.queued - warm.pending - warm.deferred;

  return (
    <div className="mt-3 rounded-md border border-dc-hairline bg-white p-3 text-[12px] leading-4 text-dc-muted">
      <p>
        connection:{" "}
        <span className={online ? "text-dc-fg2" : "font-semibold text-dc-error"}>
          {online ? "online" : "offline"}
        </span>
        {connection?.effectiveType && ` · ${connection.effectiveType}`}
        {connection?.saveData && " · Save-Data on"}
      </p>
      {snapshot && (
        <>
          <p>
            service worker:{" "}
            {snapshot.worker.controlled ? `controls this page (${snapshot.worker.script})` : "not in control"}
            {snapshot.worker.waiting && " · update waiting"}
          </p>
          <p>
            storage:{" "}
            {snapshot.storage
              ? `${mb(snapshot.storage.usage)} of ${mb(snapshot.storage.quota)}${
                  snapshot.storage.quota
                    ? ` (${((snapshot.storage.usage / snapshot.storage.quota) * 100).toFixed(1)}%)`
                    : ""
                } · ${snapshot.storage.persisted ? "persistent" : "not persistent (the browser may evict it)"}`
              : "unknown"}
          </p>
        </>
      )}

      <p className="mt-2 font-semibold text-dc-fg2">Image warming</p>
      <p>status: {PHASE_LABEL[warm.phase]}</p>
      {warm.queued > 0 && (
        <p>
          this pass: {done}/{warm.queued} · {warm.fetched} fetched · {warm.skipped} already cached
          {warm.failed > 0 && ` · ${warm.failed} failed`}
          {warm.deferred > 0 && ` · ${warm.deferred} waiting for connection`}
        </p>
      )}
      {warm.lastPass && (
        <p>
          last pass {time(warm.lastPass.endedAt)}: {warm.lastPass.queued} images · {warm.lastPass.fetched} fetched ·{" "}
          {warm.lastPass.skipped} already cached
          {warm.lastPass.failed > 0 && ` · ${warm.lastPass.failed} failed`} · {warm.lastPass.seconds}s
        </p>
      )}
      {snapshot && snapshot.known > 0 && (
        <p>
          coverage: {snapshot.covered} of {snapshot.known} images cached (
          {Math.round((snapshot.covered / snapshot.known) * 100)}%)
        </p>
      )}

      {snapshot && (
        <>
          <p className="mt-2 font-semibold text-dc-fg2">Caches</p>
          {snapshot.caches.length === 0 ? (
            <p>none</p>
          ) : (
            <ul>
              {snapshot.caches.map((c) => (
                <li key={c.name} className="flex justify-between gap-3">
                  <span className="truncate">{c.name}</span>
                  <span className="tabular-nums">{c.entries}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1">as of {time(snapshot.takenAt)}</p>
        </>
      )}

      <button type="button" onClick={() => void refresh()} disabled={busy} className={cn(quietPill, "mt-2")}>
        <RefreshCw className={cn("size-3.5 text-dc-purple", busy && "animate-spin")} />
        Refresh
      </button>
    </div>
  );
}
