/**
 * In-memory record of the last few distinct pathnames this tab has visited,
 * so a screen can tell where the user came from (e.g. the schedule restores
 * its scroll position when returning from a session, but jumps to "live now"
 * when opened from another tab). Module state on purpose: it survives the
 * unmount/remount a client-side navigation causes and resets on a full
 * reload, when starting fresh is the right answer anyway. No storage.
 *
 * `recordPathname` is called from the page layout's effect. Effects run
 * child-first, so a freshly mounted page reads this *before* its own
 * pathname has been recorded — `previousPathnameBefore(current)` therefore
 * skips `current` explicitly instead of assuming it's already the last entry.
 */
const MAX_ENTRIES = 4;
const history: string[] = [];

export function recordPathname(pathname: string): void {
  if (history[history.length - 1] === pathname) return;
  history.push(pathname);
  if (history.length > MAX_ENTRIES) history.shift();
}

/** The most recent pathname that isn't `current`, or null if none yet. */
export function previousPathnameBefore(current: string): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i] !== current) return history[i];
  }
  return null;
}
