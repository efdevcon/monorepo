/**
 * Decisions behind the quiet app updates (ServiceWorkerUpdater.tsx), pure so
 * `data:test` can check them. The worker is built `skipWaiting: false`, and a
 * page on the old build must never run under the new worker's caches (old
 * chunks vanish when it activates, deploys are atomic), so the rule is: ask
 * for the switch only at a moment when the reload that follows is invisible
 * or harmless, then reload at once.
 *
 * - Kiosk, the room-screen TVs: as soon as the TV is online and no session in
 *   its room starts or ends within two minutes.
 * - Launch: a worker already waiting when the app boots is applied before the
 *   first paint matters (no decision needed, see the updater).
 * - Hidden tab: after HIDDEN_DELAY_MS hidden (15 s: a real absence rather
 *   than a glance at a notification), unless a stream or translation player
 *   is mounted, a sheet or dialog is open, or someone was typing.
 * - Return: iOS freezes hidden pages, so that timer never fires there; coming
 *   back after at least that long away is the quiet moment instead, under the
 *   same page guards (the page re-appears and refreshes once).
 *
 * The update toast stays as the fallback: a build still waiting a day later,
 * or one the new deploy marks urgent (public/version.json, next.config.ts).
 */

/** How long a tab must have been hidden (or away) before a quiet switch. */
export const HIDDEN_DELAY_MS = 15_000;
/** A build waiting this long gets the toast after all. */
export const TOAST_AFTER_MS = 24 * 60 * 60 * 1000;
/** No kiosk switch this close to a session start or end in its room. */
export const CHANGEOVER_HOLD_MS = 2 * 60_000;
/** The kiosk re-checks its gates this often while something is in the way. */
export const KIOSK_RETRY_MS = 30_000;
/** Venue hour (0-23) of the kiosk's nightly reload. */
export const NIGHTLY_RELOAD_HOUR = 4;

export type UpdateTrigger = "kiosk" | "launch" | "hidden" | "return";
export type DeferReason = "offline" | "changeover" | "visible" | "too-soon" | "media" | "dialog" | "typing";

export interface UpdateContext {
  online: boolean;
  /** A session in the kiosk's room starts or ends within CHANGEOVER_HOLD_MS. */
  changeoverNear: boolean;
  hidden: boolean;
  hiddenForMs: number;
  /** A stream or translation player is on the page, or audio/video plays. */
  mediaPlaying: boolean;
  /** A sheet or modal dialog is open. */
  dialogOpen: boolean;
  /** A text field has focus or holds text. */
  typing: boolean;
}

/** Why a kiosk must not switch right now, or null to go ahead. */
export function kioskUpdateBlocker(ctx: UpdateContext): DeferReason | null {
  if (!ctx.online) return "offline";
  if (ctx.changeoverNear) return "changeover";
  return null;
}

/**
 * Why a hidden tab must not switch right now, or null to go ahead. Being
 * offline is no reason: the shells are precached, so the reload lands.
 */
export function hiddenUpdateBlocker(ctx: UpdateContext): DeferReason | null {
  if (!ctx.hidden) return "visible";
  if (ctx.hiddenForMs < HIDDEN_DELAY_MS) return "too-soon";
  if (ctx.mediaPlaying) return "media";
  if (ctx.dialogOpen) return "dialog";
  if (ctx.typing) return "typing";
  return null;
}

/**
 * Why a tab coming back to the front must not switch right now, or null to go
 * ahead: only a real absence counts, and the page guards still apply.
 */
export function returnUpdateBlocker(ctx: UpdateContext): DeferReason | null {
  if (ctx.hiddenForMs < HIDDEN_DELAY_MS) return "too-soon";
  if (ctx.mediaPlaying) return "media";
  if (ctx.dialogOpen) return "dialog";
  if (ctx.typing) return "typing";
  return null;
}

/** Whether the fallback toast is due for a build first seen waiting at `availableSinceMs`. */
export function toastDue(availableSinceMs: number | null, nowMs: number, urgent: boolean): boolean {
  if (urgent) return true;
  return availableSinceMs !== null && nowMs - availableSinceMs >= TOAST_AFTER_MS;
}

/** A session (Unix seconds) starts or ends within `holdMs` of `nowMs`. */
export function changeoverNear(
  sessions: ReadonlyArray<{ start: number; end: number }>,
  nowMs: number,
  holdMs: number = CHANGEOVER_HOLD_MS
): boolean {
  return sessions.some(
    (s) => Math.abs(s.start * 1000 - nowMs) <= holdMs || Math.abs(s.end * 1000 - nowMs) <= holdMs
  );
}

/**
 * The venue day key (YYYY-MM-DD) when the kiosk's nightly reload is due: the
 * venue clock reads NIGHTLY_RELOAD_HOUR and that day has not reloaded yet
 * (`lastKey`). Null otherwise.
 */
export function nightlyReloadDue(nowMs: number, timeZone: string, lastKey: string | null): string | null {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
  }).formatToParts(new Date(nowMs));
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  // Some engines print midnight as "24".
  if (Number(part("hour")) % 24 !== NIGHTLY_RELOAD_HOUR) return null;
  const key = `${part("year")}-${part("month")}-${part("day")}`;
  return key === lastKey ? null : key;
}
