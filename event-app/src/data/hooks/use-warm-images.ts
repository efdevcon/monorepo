"use client";

import { useEffect } from "react";

/**
 * Pre-fetch remote images so they're in the service worker's image cache before
 * the network goes away.
 *
 * Why this is needed at all: the SW caches images with CacheFirst, but only ones
 * the browser actually requested. `Avatar` renders with `loading="lazy"`, so an
 * avatar never scrolled into view is never fetched and never cached — which left
 * the speakers page fully available offline (its data is warmed app-wide by
 * `CacheWarmer`) but showing a grid of blank circles.
 *
 * Deliberately a `fetch` rather than eager-loading the `<img>` tags: warming via
 * fetch never puts the images in the render tree. Dropping `loading="lazy"`
 * would also populate the cache, but it would rasterize hundreds of images
 * across a very tall page, which is the mechanism behind the iOS
 * content-process crash the speakers page already had once.
 *
 * Incremental by construction: it asks the cache what it already holds and only
 * fetches the difference. A restart with nothing changed does no work at all,
 * and a handful of new avatars costs a handful of requests — so this never turns
 * into a full re-download because the app was reopened.
 */

/**
 * Must match the `cacheName` on the image route in `src/sw.ts`. Kept as a
 * literal on both sides rather than a shared import, because the service worker
 * is bundled separately; if you rename one, rename the other.
 */
const IMAGE_CACHE = "static-images";

const CONCURRENCY = 6;
/** Images per batch; we yield to an idle callback between batches. */
const CHUNK_SIZE = 60;

/**
 * One app-wide queue with a single runner, rather than per-effect work.
 *
 * The lifecycle version of this was subtly broken: the caller's URL list grows
 * as each SWR dataset resolves (sessions, then speakers, then announcements),
 * which re-ran the effect, and the cleanup aborted the warm already in flight.
 * Worse, URLs were marked handled up front, so an aborted batch was never
 * retried — a cold load warmed ~30 of 805 images and gave up. A queue absorbs
 * late arrivals instead of restarting, and nothing is marked handled until it
 * has actually been fetched.
 */
/**
 * One queue per priority tier, drained lowest tier first.
 *
 * A single FIFO was wrong in practice: the ~645 avatars are the biggest group
 * and the least individually important, and because the speakers dataset often
 * resolves first they were being fetched ahead of the home screen's own images.
 * Tiers mean a late-arriving highlight still jumps the avatar backlog.
 */
const queues: string[][] = [];
const queued = new Set<string>();
let running = false;
/**
 * URLs whose fetch failed for connectivity reasons. Held here rather than
 * dropped, and flushed back into the queue on the next `online` event — losing
 * the network mid-warm otherwise meant those images stayed uncached until the
 * next app launch, which is exactly when you can least afford it.
 */
const deferred: string[] = [];
let onlineHookAttached = false;
let totalQueued = 0;
let totalFetched = 0;
let totalSkipped = 0;
let totalFailed = 0;
let startedAt = 0;

/**
 * Metered or slow connections don't get a background download. `saveData` is an
 * explicit user request to conserve; 2g means the warm would compete with
 * whatever the user is actually trying to do.
 */
function connectionAllowsWarming(): boolean {
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (!connection) return true; // Unsupported (Safari) — assume it's fine.
  if (connection.saveData) return false;
  return !/(^|-)2g$/.test(connection.effectiveType ?? "");
}

/** Run `task` when the browser is idle. Safari has no rIC, hence the fallback. */
function onIdle(task: () => void): void {
  const scope = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (scope.requestIdleCallback) scope.requestIdleCallback(task, { timeout: 10_000 });
  else window.setTimeout(task, 2_000);
}

/** Resolve on the next idle slot, so chunks yield the network between batches. */
function nextIdle(): Promise<void> {
  return new Promise((resolve) => onIdle(() => resolve()));
}

/**
 * Which of `urls` the image cache doesn't already hold.
 *
 * One `keys()` call rather than a `match()` per URL: it turns ~1000 async cache
 * lookups into a single call plus an in-memory set test. The cache is also the
 * only source of truth worth consulting — a separate "already warmed" ledger
 * would drift the moment an entry expired or was evicted, and would then
 * silently stop re-warming it.
 *
 * Avatar and mirrored-image filenames are content hashes, so a changed image is
 * a different URL: new ones show up as missing, unchanged ones never do.
 */
async function missingFromCache(urls: string[]): Promise<string[]> {
  try {
    const cache = await caches.open(IMAGE_CACHE);
    const cached = new Set((await cache.keys()).map((request) => request.url));
    return urls.filter((url) => !cached.has(url));
  } catch {
    // No Cache Storage access — skip rather than fetch blindly.
    return [];
  }
}

async function fetchChunk(chunk: string[]): Promise<void> {
  let cursor = 0;
  const worker = async () => {
    while (cursor < chunk.length) {
      const url = chunk[cursor++];
      try {
        // `mode: "cors"` on purpose: it must match how the <img> tags request
        // these (they carry crossOrigin="anonymous"). Cache.match keys on URL
        // alone, so warming with no-cors would store an opaque response that a
        // later CORS-mode <img> request would find and then refuse to render.
        const response = await fetch(url, { mode: "cors", credentials: "omit" });
        if (response.ok) {
          totalFetched++;
        } else {
          // A real HTTP error (404 on a stale URL). Not worth retrying, and the
          // SW won't cache it anyway — only [0, 200] are cacheable.
          totalFailed++;
        }
      } catch {
        // A thrown fetch means network, not HTTP: keep it for a retry once the
        // connection is back.
        deferred.push(url);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

async function run(): Promise<void> {
  running = true;
  startedAt = startedAt || Date.now();

  while (pendingCount() > 0) {
    // Always drain the most important non-empty tier, so anything queued later
    // at a higher priority is picked up on the next chunk.
    const tier = queues.find((t) => t && t.length > 0);
    if (!tier) break;
    // Re-check the cache per chunk rather than once up front, so images cached
    // by the page itself while we work aren't fetched again.
    const batch = tier.splice(0, CHUNK_SIZE);
    const missing = await missingFromCache(batch);
    totalSkipped += batch.length - missing.length;
    if (missing.length > 0) await fetchChunk(missing);

    const remaining = pendingCount();
    if (remaining > 0) {
      console.info(
        `[warm-images] ${totalQueued - remaining}/${totalQueued}`
      );
      await nextIdle();
    }
  }

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  const parts = [`${totalFetched} fetched`];
  if (totalSkipped) parts.push(`${totalSkipped} already cached`);
  if (totalFailed) parts.push(`${totalFailed} failed`);
  if (deferred.length) parts.push(`${deferred.length} waiting for connection`);
  console.info(
    `[warm-images] ${deferred.length ? "paused" : "complete"}: ${totalQueued} image(s) — ${parts.join(", ")} in ${seconds}s`
  );
  running = false;
  startedAt = 0;
  totalQueued = 0;
  totalFetched = 0;
  totalSkipped = 0;
  totalFailed = 0;
}

/**
 * Flush deferred URLs back into the queue when the network returns. Attached
 * once, lazily, and never removed: the warmer is app-wide and lives as long as
 * the page.
 */
function armOnlineResume(): void {
  if (onlineHookAttached) return;
  onlineHookAttached = true;
  window.addEventListener("online", () => {
    if (deferred.length === 0) return;
    const resumed = deferred.splice(0);
    console.info(`[warm-images] back online, resuming ${resumed.length} image(s)`);
    // Resumed work goes to the front: it was already deemed worth fetching.
    (queues[0] ??= []).unshift(...resumed);
    totalQueued += resumed.length;
    if (!running) void run();
  });
}

function pendingCount(): number {
  return queues.reduce((n, tier) => n + (tier?.length ?? 0), 0);
}

function enqueue(tiers: string[][]): void {
  let added = 0;
  tiers.forEach((urls, priority) => {
    for (const url of urls) {
      if (queued.has(url)) continue;
      queued.add(url);
      (queues[priority] ??= []).push(url);
      added++;
    }
  });
  if (added === 0) return;
  totalQueued += added;
  armOnlineResume();

  // Offline right now: don't burn a pass failing every fetch, just wait for the
  // `online` event.
  if (!navigator.onLine) {
    for (const tier of queues) if (tier) deferred.push(...tier.splice(0));
    console.info(
      `[warm-images] offline, ${deferred.length} image(s) queued until connection returns`
    );
    return;
  }

  if (running) {
    // A later dataset resolved mid-warm; it just extends the queue.
    console.info(`[warm-images] +${added} queued (${totalQueued} total)`);
    return;
  }
  console.info(`[warm-images] warming ${added} image(s)`);
  void run();
}

/**
 * Warm images in the background, in priority order.
 *
 * Pass an array of groups, most important first — the runner drains group 0
 * before group 1, and a group that fills in later still takes precedence over
 * anything queued below it. Safe to call with empty or changing groups.
 */
export function useWarmImages(tiers: (string | null | undefined)[][]): void {
  // Absolute http(s) URLs (API data) and root-relative paths (static assets in
  // public/) are both warmable; data: URIs are already inline. Relative paths
  // are resolved against the origin so the cache keys match what the <img>
  // requests produce.
  const normalize = (url: string | null | undefined): string[] => {
    if (!url) return [];
    if (/^https?:\/\//i.test(url)) return [url];
    if (url.startsWith("/") && !url.startsWith("//")) {
      return typeof window === "undefined"
        ? []
        : [`${window.location.origin}${url}`];
    }
    return [];
  };
  const groups = tiers.map((group) => group.flatMap(normalize));
  const candidates = groups.flat();
  // A stable key so this only reacts when the *set* changes, not every render.
  const key = `${candidates.length}|${candidates[0] ?? ""}|${candidates[candidates.length - 1] ?? ""}`;

  useEffect(() => {
    if (candidates.length === 0) return;
    // Without a controlling service worker nothing would cache the responses,
    // so warming would be pure waste. Also covers dev, where the SW is off.
    if (!navigator.serviceWorker?.controller) return;
    if (!connectionAllowsWarming()) return;
    // No cleanup/abort on purpose: the queue is app-wide and idle-chunked, and
    // aborting on every dataset arrival is exactly what broke the cold warm.
    enqueue(groups);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
