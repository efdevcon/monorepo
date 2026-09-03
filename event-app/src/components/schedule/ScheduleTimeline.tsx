"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import cn from "classnames";
import { Clock3, ClockArrowDown, Star, User, X } from "lucide-react";
import type { Session } from "@/data/models";
import { Link } from "@/routing";
import { isDesktopNow, useIsDesktop } from "@/hooks/useIsDesktop";
import {
  buildTimeline,
  DESKTOP_METRICS,
  formatTime,
  formatTimeRange,
  MOBILE_METRICS,
  offsetPx,
  sessionBox,
  type TimelineMetrics,
} from "./utils";
import { getTrackTheme, trackBadgeLabel } from "./trackTheme";

/**
 * A session block in a room lane (Figma): pastel tile with title + meta.
 * `compact` (mobile metrics) keeps only a two-line title — the details page
 * carries the rest, and colour already encodes the track. No star here (the
 * list cards and details page have it): on a dense grid it ate the tile.
 *
 * The text column is `sticky` inside the block (Devcon SEA behaviour): as a
 * long session scrolls under the room column its title stays at the visible
 * left edge instead of disappearing with the block's start. The block must
 * not clip overflow, or it would become the sticky container; the column is
 * content-sized and capped to the visible grid so it has room to slide.
 */
function TimelineSession({
  session,
  startMs,
  metrics: m,
  compact,
  selected = false,
  onOpen,
}: {
  session: Session;
  startMs: number;
  metrics: TimelineMetrics;
  compact: boolean;
  /** Desktop side-panel selection highlight. */
  selected?: boolean;
  /** Desktop: open the details side panel instead of navigating (as cards do). */
  onOpen?: (id: string) => void;
}) {
  const theme = getTrackTheme(session.track);
  const { left, width } = sessionBox(session, startMs, m.slotWidth);
  const featured = session.featured === true;
  // 1.5 slots = 15 min: room for the time/speakers/Featured meta (desktop).
  const wide = width >= m.slotWidth * 1.5;
  const padX = compact ? 6 : 12;

  return (
    <Link
      href={`/schedule/${session.id}`}
      // No viewport prefetch (see SpeakerCard) — client page on cached data.
      prefetch={false}
      title={`${session.title} — ${session.room?.name ?? ""}`}
      onClick={(e) => {
        if (onOpen && isDesktopNow()) {
          e.preventDefault();
          onOpen(session.id);
        }
      }}
      style={{
        left: left + m.blockInset,
        top: m.blockInset,
        width: width - m.blockInset * 2,
        height: m.laneH - m.blockInset * 2,
        backgroundColor: theme.neutral ? "#ffffff" : theme.color,
      }}
      className={cn(
        "absolute z-[1] flex items-center rounded-[4px] hover:z-[2] hover:ring-1 hover:ring-inset hover:ring-dc-purple",
        compact ? "px-1.5 py-1" : "p-3",
        theme.neutral && "border border-dc-hairline",
        selected && "ring-1 ring-inset ring-dc-purple"
      )}
    >
      <div
        style={{
          left: m.roomCol + padX,
          // Never wider than the block, nor than the grid area beside the
          // room column — the slack is what lets the text stay in view.
          maxWidth: `min(100%, calc(100vw - ${m.roomCol + padX * 2 + 16}px))`,
        }}
        className="sticky flex w-fit min-w-0 flex-col items-start gap-1.5"
      >
        <span
          className={cn(
            "max-w-full text-dc-fg2",
            compact
              ? "line-clamp-2 text-[12px] font-semibold leading-[14px]"
              : "truncate text-[14px] font-bold leading-5"
          )}
        >
          {session.title}
        </span>
        {!compact && (
          <span className="flex max-w-full min-w-0 items-center gap-2 leading-none">
            <span className="flex shrink-0 items-center gap-1">
              {theme.gem && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={theme.gem}
                  alt=""
                  className="size-3.5 object-contain"
                />
              )}
              <span className="text-[12px] font-semibold uppercase tracking-[0.5px] text-dc-fg2">
                {trackBadgeLabel(session.track)}
              </span>
            </span>
            {wide && (
              <>
                <span className="flex shrink-0 items-center gap-1 text-[12px] text-dc-muted">
                  <Clock3 className="size-3.5" />
                  {formatTimeRange(session)}
                </span>
                {session.speakers.length > 0 && (
                  <span className="flex min-w-0 flex-1 items-center gap-1 text-[12px] text-dc-muted">
                    <User className="size-3.5 shrink-0" />
                    <span className="truncate">
                      {session.speakers.map((s) => s.name).join(", ")}
                    </span>
                  </span>
                )}
                {featured && (
                  <span className="shrink-0 rounded-[4px] bg-dc-featured px-1.5 py-0.5 text-[12px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg2">
                    Featured
                  </span>
                )}
              </>
            )}
          </span>
        )}
      </div>
    </Link>
  );
}

/** Now pill: 10px text + 3px padding ≈ 16px tall; half its typical width. */
const PILL_H = 16;
const PILL_HALF_W = 22;

/** Fullscreen controls: InterestedPill's white/hairline pill, 40px tall.
 *  flex-auto (not flex-1): each pill keeps its label's natural width and only
 *  the leftover row width is shared — equal thirds squeezed the icons out of
 *  "Jump to now" on a 390px phone. */
const fullscreenPill =
  "pointer-events-auto flex h-10 flex-auto cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3 text-[14px] font-normal leading-none text-dc-fg2 shadow-[0_1px_4px_rgba(0,0,0,0.12)] transition-colors duration-150 ease-out";
const fullscreenPillResting = "border-dc-hairline bg-white hover:bg-dc-purple-wash";
/** Active toggle state, matching InterestedPill's lavender fill. */
const fullscreenPillActive = "border-dc-purple bg-dc-lavender";

/**
 * Room-by-time timeline (Figma "1 - Timeline view"). Desktop: 10 min = 180px
 * columns, 74px lanes, sticky 120px room column, `#f9f8fa` chrome cells,
 * pastel track blocks and a red now line + dot + time pill, scrolling
 * horizontally inside its rounded hairline card. Mobile (`< lg`): denser
 * metrics (Devcon SEA parity — see MOBILE_METRICS), full-bleed, and the time
 * axis pinned to the page under the day tabs.
 *
 * Structure: the axis header and the lanes are siblings — the header is its
 * own `overflow-hidden` track whose scrollLeft mirrors the body's. Inside one
 * `overflow-x-auto` box a `sticky top` header could never pin to the page
 * (the box is its scroll container), so the split is what makes the mobile
 * sticky axis possible. NOTE: no ancestor between this header and the page
 * may set `overflow` on mobile, or the pin silently breaks.
 *
 * `fullscreen` (mobile only, auto in landscape or via the toggle) swaps the
 * root to a fixed full-viewport overlay above the app chrome; the body then
 * scrolls both axes with the room column and axis pinned inside it. Same
 * element, class-swapped — no remount, so scroll offsets and refs persist.
 */
export function ScheduleTimeline({
  sessions,
  nowMs,
  dayLabel,
  jumpToNowSignal = 0,
  scrollToStartSignal = 0,
  selectedSessionId = null,
  onOpen,
  initialScrollLeft,
  onScrollLeft,
  fullscreen = false,
  onExitFullscreen,
  onJumpToNow,
  fullscreenTop,
  interestedOnly = false,
  onToggleInterested,
}: {
  sessions: Session[];
  nowMs: number;
  /** Short label for the sticky corner cell (e.g. "Nov 3"). */
  dayLabel?: string;
  /** Increment to horizontally scroll the grid to the now line. */
  jumpToNowSignal?: number;
  /** Increment to scroll the grid back to the day's start (left edge). */
  scrollToStartSignal?: number;
  /** Desktop side-panel selection highlight. */
  selectedSessionId?: string | null;
  /** Desktop: open the details side panel instead of navigating. */
  onOpen?: (id: string) => void;
  /**
   * Horizontal offset to start at (restoring the grid where the user left
   * it when they come back from a session's details page). Applied once,
   * before first paint, as soon as the grid exists.
   */
  initialScrollLeft?: number;
  /** Reports the grid's horizontal offset as the user scrolls. */
  onScrollLeft?: (left: number) => void;
  /** Mobile: render as a full-viewport overlay covering header + nav. */
  fullscreen?: boolean;
  /** Fullscreen X button / Escape. */
  onExitFullscreen?: () => void;
  /** Fullscreen "jump to now" button (the header's is covered). */
  onJumpToNow?: () => void;
  /**
   * Fullscreen only: a bar fixed above the time axis (the day tabs — the
   * page's own are covered by the overlay). Should render in normal flow.
   */
  fullscreenTop?: React.ReactNode;
  /** Fullscreen only: the page's interested-only filter (header star). */
  interestedOnly?: boolean;
  onToggleInterested?: () => void;
}) {
  const isDesktop = useIsDesktop();
  const compact = !isDesktop;
  const m = isDesktop ? DESKTOP_METRICS : MOBILE_METRICS;

  const { rooms, slots, startMs, byRoom } = useMemo(
    () => buildTimeline(sessions),
    [sessions]
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const exitRef = useRef<HTMLButtonElement | null>(null);
  // The signal counter lives in Schedule and survives this component's
  // unmount (view toggle, filtered-to-empty), so a remount would replay the
  // last jump. Baseline whatever value we mounted with; only act on growth.
  const handledSignalRef = useRef(jumpToNowSignal ?? 0);

  const gridWidth = slots.length * m.slotWidth;
  const lastSlotEnd = slots.length ? slots[slots.length - 1] : 0;
  const nowVisible =
    slots.length > 0 && nowMs >= startMs && nowMs <= lastSlotEnd;
  const nowLeft = offsetPx(nowMs, startMs, m.slotWidth);
  const corner = dayLabel?.split(", ")[1] ?? dayLabel ?? "";

  // Axis labels the now pill would sit on top of: hide them (layout kept) —
  // the pill shows the exact time, so nothing is lost. Labels start at the
  // slot's left padding and run ~labelW; the pill is centred on nowLeft.
  const hiddenLabels = useMemo(() => {
    const hidden = new Set<number>();
    if (!nowVisible) return hidden;
    const labelW = isDesktop ? 40 : 32;
    const pad = isDesktop ? 6 : 4;
    const slotIdx = Math.floor(nowLeft / m.slotWidth);
    const off = nowLeft - slotIdx * m.slotWidth;
    if (off - PILL_HALF_W < pad + labelW) hidden.add(slotIdx);
    if (off + PILL_HALF_W > m.slotWidth + pad && slotIdx + 1 < slots.length) {
      hidden.add(slotIdx + 1);
    }
    return hidden;
  }, [nowVisible, nowLeft, isDesktop, m.slotWidth, slots.length]);

  const syncHeader = (left: number) => {
    if (headerRef.current) headerRef.current.scrollLeft = left;
  };

  // "Jump to now": center the now line in the visible grid area.
  useEffect(() => {
    if ((jumpToNowSignal ?? 0) <= handledSignalRef.current) return;
    handledSignalRef.current = jumpToNowSignal ?? 0;
    const el = scrollRef.current;
    if (!el || !nowVisible) return;
    el.scrollTo({
      left: Math.max(0, m.roomCol + nowLeft - el.clientWidth / 2),
      behavior: "smooth",
    });
    // Page is locked in fullscreen (and the grid already fills it).
    if (!fullscreen) {
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToNowSignal]);

  // Day-tab switch to a day other than today: start at the day's left edge
  // instead of wherever the previous day happened to be scrolled.
  const handledStartRef = useRef(0);
  useEffect(() => {
    if (scrollToStartSignal <= handledStartRef.current) return;
    handledStartRef.current = scrollToStartSignal;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: 0, behavior: "auto" });
    syncHeader(0);
  }, [scrollToStartSignal]);

  // Restore a remembered horizontal offset once the grid is in the DOM (it
  // isn't while `sessions` is empty). Layout effect: lands before paint.
  const restoredRef = useRef(false);
  const hasGrid = sessions.length > 0;
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (restoredRef.current || initialScrollLeft == null || !el) return;
    restoredRef.current = true;
    el.scrollLeft = initialScrollLeft;
    syncHeader(el.scrollLeft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasGrid]);

  // The box changes shape on the fullscreen swap; the browser may clamp the
  // body's scrollLeft, so re-mirror the header after the class change lands.
  useLayoutEffect(() => {
    if (scrollRef.current) syncHeader(scrollRef.current.scrollLeft);
  }, [fullscreen]);

  // Fullscreen: lock the page behind (BottomSheet's pattern), Escape exits,
  // focus moves to the exit button and returns to the opener afterwards.
  useEffect(() => {
    if (!fullscreen) return;
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    exitRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExitFullscreen?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen]);

  if (!hasGrid) return null;

  const chromeCell =
    "flex shrink-0 items-center border-b border-dc-hairline text-dc-fg2";
  // Room cells: the app header's glass recipe (DayTabs / GroupHeader use the
  // same once pinned), so blocks sliding underneath stay faintly visible.
  const glassCell = "bg-white/75 backdrop-blur-[4px]";

  return (
    <div
      ref={rootRef}
      role={fullscreen ? "dialog" : undefined}
      aria-modal={fullscreen || undefined}
      aria-label={fullscreen ? "Timeline, fullscreen" : undefined}
      className={cn(
        "bg-white",
        fullscreen
          ? // Overlay: above header/nav (z-30), sheets (50), kiosk (60), the
            // splash (70) and the overlay scrollbar (80); below modals (90+).
            "fixed inset-0 z-[85] flex flex-col pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)]"
          : cn(
              // Mobile: full-bleed across the page gutters, hairline top/bottom.
              "-mx-4 border-y border-dc-hairline",
              // Desktop: the Figma card. overflow-hidden is lg-only on purpose —
              // on mobile it would become the axis header's scroll container.
              "lg:mx-0 lg:overflow-hidden lg:rounded-xl lg:border",
              "scroll-mt-[calc(112px+var(--safe-top))] lg:scroll-mt-[calc(80px+var(--safe-top))]"
            )
      )}
    >
      {fullscreen && fullscreenTop}

      {/* Time-axis header: its own track, scrollLeft mirrored from the body */}
      <div
        ref={headerRef}
        style={{ height: m.headerH }}
        className={cn(
          "relative z-10 shrink-0 overflow-hidden bg-dc-panel",
          // Pinned under the header + day tabs (56 + 47) on mobile pages.
          !fullscreen &&
            "sticky top-[calc(103px+var(--safe-top))] lg:static"
        )}
      >
        <div
          style={{ width: m.roomCol + gridWidth }}
          className="relative flex h-full"
        >
          <div
            style={{ width: m.roomCol }}
            className={cn(
              chromeCell,
              // Same panel grey as the time labels beside it (the glass is
              // for the room cells below, where blocks slide underneath).
              "sticky left-0 z-10 justify-center border-r bg-dc-panel font-bold leading-none",
              compact ? "text-[11px]" : "text-[14px]"
            )}
          >
            {corner}
          </div>
          {slots.map((slot, i) => (
            <div
              key={slot}
              style={{ width: m.slotWidth }}
              className={cn(
                chromeCell,
                "bg-dc-panel font-medium leading-none",
                compact ? "pl-1 text-[11px]" : "pl-1.5 text-[14px]",
                hiddenLabels.has(i) && "invisible"
              )}
            >
              {formatTime(slot / 1000)}
            </div>
          ))}
          {nowVisible && (
            <div
              aria-hidden
              style={{ left: m.roomCol + nowLeft }}
              className="pointer-events-none absolute inset-y-0 z-[5] w-0"
            >
              <span
                className="absolute size-2 -translate-x-1/2 rounded-full bg-dc-red"
                style={{ top: m.headerH - 4 }}
              />
              <span
                className="absolute -translate-x-1/2 rounded-full bg-dc-red px-1.5 py-[3px] text-[10px] font-semibold leading-none text-white"
                style={{ top: (m.headerH - PILL_H) / 2 }}
              >
                {formatTime(nowMs / 1000)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Lanes: the only user-scrollable box (x inline; x + y in fullscreen) */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const left = e.currentTarget.scrollLeft;
          syncHeader(left);
          onScrollLeft?.(left);
        }}
        className={cn(
          "isolate overflow-x-auto [scrollbar-width:thin]",
          fullscreen && "min-h-0 flex-1 overflow-auto [overscroll-behavior:contain]"
        )}
      >
        <div
          style={{ width: m.roomCol + gridWidth }}
          // Fullscreen: room to scroll the last lane clear of the floating
          // controls in the bottom-right corner.
          className={cn("relative", fullscreen && "pb-14")}
        >
          {/* Now line — below the sticky room cells (z-10) so it slides under
              them instead of painting over the room names. */}
          {nowVisible && (
            <span
              aria-hidden
              style={{ left: m.roomCol + nowLeft }}
              className="pointer-events-none absolute inset-y-0 z-[5] w-[2px] -translate-x-1/2 bg-dc-red"
            />
          )}
          {rooms.map((room) => (
            <div key={room} className="flex" style={{ height: m.laneH }}>
              <div
                style={{ width: m.roomCol }}
                title={room}
                className={cn(
                  chromeCell,
                  glassCell,
                  "sticky left-0 z-10 justify-center border-r text-center font-semibold leading-[1.2]",
                  // Wrap at spaces (or hyphenate where the browser can);
                  // never mid-word — "Decompressio/n Room" reads worse than
                  // a clipped tail, and the title attr carries the full name.
                  compact ? "px-1 text-[11px] [hyphens:auto]" : "px-2 text-[12px]"
                )}
              >
                <span className="line-clamp-2">{room}</span>
              </div>
              <div
                className="relative shrink-0 border-b border-dc-hairline bg-white"
                style={{
                  width: gridWidth,
                  backgroundImage:
                    "repeating-linear-gradient(to right, rgba(34,17,68,0.1) 0 1px, transparent 1px " +
                    m.slotWidth +
                    "px)",
                }}
              >
                {byRoom[room].map((session) => (
                  <TimelineSession
                    key={session.id}
                    session={session}
                    startMs={startMs}
                    metrics={m}
                    compact={compact}
                    selected={session.id === selectedSessionId}
                    onOpen={onOpen}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {fullscreen && (
        // Labelled pills (the Interested pill's recipe, one size down): icon-
        // only circles were easy to miss floating over the dense grid.
        <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+20px)] flex justify-center gap-2 pl-[calc(env(safe-area-inset-left)+16px)] pr-[calc(env(safe-area-inset-right)+16px)]">
          {onToggleInterested && (
            <button
              onClick={onToggleInterested}
              aria-pressed={interestedOnly}
              className={cn(
                fullscreenPill,
                interestedOnly ? fullscreenPillActive : fullscreenPillResting
              )}
            >
              <Star
                className="size-4 shrink-0 text-dc-purple"
                fill="currentColor"
              />
              Interested
            </button>
          )}
          <button
            onClick={onJumpToNow}
            className={cn(fullscreenPill, fullscreenPillResting)}
          >
            <ClockArrowDown className="size-4 shrink-0 text-dc-purple" />
            Jump to now
          </button>
          <button
            ref={exitRef}
            onClick={onExitFullscreen}
            aria-label="Exit fullscreen"
            className={cn(fullscreenPill, fullscreenPillResting)}
          >
            <X className="size-4 shrink-0 text-dc-purple" />
            Exit
          </button>
        </div>
      )}
    </div>
  );
}
