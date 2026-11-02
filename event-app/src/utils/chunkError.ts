/**
 * Build skew: the page runs an older build and asked for a chunk the current
 * deploy no longer serves (deploys replace the hashed files, and a device
 * without a working worker has no cached copy). Seen on production
 * 2026-11-02: a tab opened on one build tapped My Devcon 86 s after the next
 * deploy went live, and the tab pane's lazy chunk answered 404. A reload
 * lands on the new build, so the error boundaries reload once for this
 * class of error instead of showing the crash screen; a second failure
 * within a minute shows it after all.
 */

export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  if (name === "ChunkLoadError") return true;
  if (typeof message !== "string") return false;
  return (
    /Loading (CSS )?chunk [\w-]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message)
  );
}

/** sessionStorage: when this tab last reloaded for a chunk error. */
const RELOAD_KEY = "chunk-reload";
/** A second chunk failure within this long is not retried. */
export const CHUNK_RELOAD_TTL_MS = 60_000;

/** Whether a reload for a chunk error is still allowed (none within the last minute). */
export function canReloadForChunkError(now: number = Date.now()): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY));
    return !(Number.isFinite(last) && last > 0 && now - last < CHUNK_RELOAD_TTL_MS);
  } catch {
    return true;
  }
}

/** Record the attempt and reload onto the current deploy. */
export function reloadForChunkError(now: number = Date.now()): void {
  try {
    sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {
    // Storage blocked: the boundary remounts on reload and may retry once more.
  }
  window.location.reload();
}
