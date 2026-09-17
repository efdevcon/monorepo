"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import cn from "classnames";
import { Clock3, Star, User } from "lucide-react";
import type { Session } from "@/data/models";
import { DetailLink } from "@/routing/DetailLink";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useInterested } from "@/data/interested/useInterested";
import {
  buildTimeline,
  DESKTOP_METRICS,
  formatTime,
  formatTimeRange,
  MOBILE_METRICS,
  offsetPx,
  timeAtOffset,
  sessionBox,
  type TimelineMetrics,
} from "./utils";
import { getTrackTheme, trackBadgeLabel } from "./trackTheme";

/**
 * A session block in a room lane (Figma): pastel tile with title + meta and
 * the interest star (desktop). `compact` (mobile metrics) runs the same
 * two-line title + meta row one size down — track label always, time and
 * speakers once the block is wide enough — and drops the star, which ate
 * the tile on the dense mobile grid.
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
  /** Open the details in place (side panel on desktop, layer on mobile). */
  onOpen?: (id: string) => void;
}) {
  const theme = getTrackTheme(session.track);
  const { left, width } = sessionBox(session, startMs, m.slotWidth);
  const featured = session.featured === true;
  const { isInterested, toggle } = useInterested();
  const interested = isInterested(session.id);
  // 1.5 slots = 15 min: room for the time/speakers/Featured meta. The
  // mobile block is 100px a slot with 6px padding, so its meta comes in
  // stages instead — speakers from 25 min, the Featured chip from 35 —
  // otherwise a 20-min block showed a lone person icon beside the chip.
  const wide = width >= m.slotWidth * 1.5;
  const showSpeakers = width >= m.slotWidth * (compact ? 2.5 : 1.5);
  const showFeatured = featured && width >= m.slotWidth * (compact ? 3.5 : 1.5);
  const padX = compact ? 6 : 12;
  const metaText = compact ? "text-[11px]" : "text-[12px]";
  const metaIcon = compact ? "size-3" : "size-3.5";

  return (
    <DetailLink
      kind="session"
      id={session.id}
      onOpen={onOpen}
      title={`${session.title} — ${session.room?.name ?? ""}`}
      style={{
        left: left + m.blockInset,
        top: m.blockInset,
        width: width - m.blockInset * 2,
        height: m.laneH - m.blockInset * 2,
        backgroundColor: theme.neutral ? "#ffffff" : theme.color,
      }}
      className={cn(
        "absolute z-[1] flex items-center rounded-[4px] hover:z-[2] hover:ring-1 hover:ring-inset hover:ring-dc-purple",
        compact ? "px-1.5 py-1.5" : "p-3",
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
        <span
          className={cn(
            "flex max-w-full min-w-0 items-center leading-none",
            compact ? "gap-1.5" : "gap-2"
          )}
        >
          <span className="flex shrink-0 items-center gap-1">
            {theme.gem && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={theme.gem}
                alt=""
                className={cn(metaIcon, "object-contain")}
              />
            )}
            <span
              className={cn(
                "font-semibold uppercase tracking-[0.5px] text-dc-fg2",
                compact ? "text-[10px]" : "text-[12px]"
              )}
            >
              {trackBadgeLabel(session.track)}
            </span>
          </span>
          {wide && (
            <>
              <span
                className={cn(
                  "flex shrink-0 items-center gap-1 text-dc-muted",
                  metaText
                )}
              >
                <Clock3 className={metaIcon} />
                {formatTimeRange(session)}
              </span>
              {showSpeakers && session.speakers.length > 0 && (
                <span
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-1 text-dc-muted",
                    metaText
                  )}
                >
                  <User className={cn(metaIcon, "shrink-0")} />
                  <span className="truncate">
                    {session.speakers.map((s) => s.name).join(", ")}
                  </span>
                </span>
              )}
              {showFeatured && (
                <span
                  className={cn(
                    "shrink-0 rounded-[4px] bg-dc-featured px-1.5 py-0.5 font-semibold uppercase leading-none tracking-[0.5px] text-dc-fg2",
                    compact ? "text-[10px]" : "text-[12px]"
                  )}
                >
                  Featured
                </span>
              )}
            </>
          )}
        </span>
      </div>
      {/* Desktop only (see above). Sits at the block's right end; the sticky
          text column shrinks (min-w-0) to make room on short blocks. Inside
          the anchor, so the click must not open the session. Hover fill is
          translucent white, not the cards' lavender: blocks come in every
          track colour and the pink clashed with most of them. */}
      {!compact && (
        <button
          aria-label={
            interested ? "Remove from interested" : "Add to interested"
          }
          aria-pressed={interested}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void toggle(session.id, session.title);
          }}
          className="group/star -m-2.5 ml-auto flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-white/30"
        >
          <Star
            className={cn(
              "size-4 transition-colors",
              interested
                ? "fill-dc-purple text-dc-purple"
                : "fill-transparent text-dc-muted group-hover/star:text-dc-purple"
            )}
          />
        </button>
      )}
    </DetailLink>
  );
}

/** Now pill: 10px text + 3px padding ≈ 16px tall; half its typical width. */
const PILL_H = 16;
const PILL_HALF_W = 22;

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
 * `headerRaised` (mobile): the app header has folded away (Schedule.tsx hides
 * it while the user scrolls down the timeline), so the day tabs pin at the
 * very top and the axis pins 56px higher, on the same 200ms clock.
 */
export function ScheduleTimeline({
  sessions,
  nowMs,
  dayLabel,
  jumpToNowSignal = 0,
  scrollToStartSignal = 0,
  scrollToTime = null,
  selectedSessionId = null,
  onOpen,
  initialScrollLeft,
  onScrollLeft,
  headerRaised = false,
}: {
  sessions: Session[];
  nowMs: number;
  /** Short label for the sticky corner cell (e.g. "Nov 3"). */
  dayLabel?: string;
  /** Increment to horizontally scroll the grid to the now line. */
  jumpToNowSignal?: number;
  /** Increment to scroll the grid back to the day's start (left edge). */
  scrollToStartSignal?: number;
  /**
   * Put this time at the left edge of the time area (view toggle from the
   * list: the time that was at the top of the list). `seq` must grow.
   */
  scrollToTime?: { ms: number; seq: number } | null;
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
  /** Horizontal offset and the time at the time area's left edge. */
  onScrollLeft?: (left: number, leftMs: number) => void;
  /** Mobile: the app header is hidden, so the sticky axis pins 56px higher. */
  headerRaised?: boolean;
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
    // The grid's own horizontal scroll may animate (one row of blocks, cheap
    // to paint); the page scroll to the grid is instant, like every other
    // vertical jump in the app (WebKit rasterises everything a smooth page
    // scroll passes over). Reduced motion turns the horizontal one off too.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({
      left: Math.max(0, m.roomCol + nowLeft - el.clientWidth / 2),
      behavior: reduce ? "auto" : "smooth",
    });
    rootRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
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

  // View toggle from the list: the time that was at the top of the list goes
  // to the left edge of the time area (just past the sticky room column).
  // Layout effect so it lands before paint; declared after the restore below
  // would be wrong — it must win over a stale restored offset on mount.
  const handledTimeSeqRef = useRef(0);
  useLayoutEffect(() => {
    if (!scrollToTime || scrollToTime.seq <= handledTimeSeqRef.current) return;
    handledTimeSeqRef.current = scrollToTime.seq;
    const el = scrollRef.current;
    if (!el || slots.length === 0) return;
    el.scrollLeft = Math.max(0, offsetPx(scrollToTime.ms, startMs, m.slotWidth));
    syncHeader(el.scrollLeft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToTime]);

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

  if (!hasGrid) return null;

  const chromeCell =
    "flex shrink-0 items-center border-b border-dc-hairline text-dc-fg2";
  // Room cells: the app header's glass recipe (DayTabs / GroupHeader use the
  // same once pinned), so blocks sliding underneath stay faintly visible.
  const glassCell = "bg-white/75 backdrop-blur-[4px]";

  return (
    <div
      ref={rootRef}
      className={cn(
        "bg-white",
        // Mobile: full-bleed across the page gutters, hairline top/bottom.
        "-mx-4 border-y border-dc-hairline",
        // Desktop: the Figma card. overflow-hidden is lg-only on purpose —
        // on mobile it would become the axis header's scroll container.
        "lg:mx-0 lg:overflow-hidden lg:rounded-xl lg:border",
        // Jump-to-now scroll target: clear of the pinned app header + day
        // tabs on both breakpoints (56 + 47 + 9 mobile; 65 + 53 + 9 desktop,
        // the list groups' clearance) so the axis — date corner, time slots
        // and the now pill — lands fully visible instead of under the bar.
        "scroll-mt-[calc(112px+var(--safe-top))] lg:scroll-mt-[calc(127px+var(--safe-top))]"
      )}
    >
      {/* Time-axis header: its own track, scrollLeft mirrored from the body */}
      <div
        ref={headerRef}
        style={{ height: m.headerH }}
        className={cn(
          "relative z-10 shrink-0 overflow-hidden bg-dc-panel",
          // Pinned under the header + day tabs (56 + 47) on mobile pages;
          // under the tabs alone (47) while the header is folded away, the
          // move animated on the header's clock.
          "sticky transition-[top] duration-200 ease-out motion-reduce:transition-none lg:static",
          headerRaised
            ? "top-[calc(47px+var(--safe-top))]"
            : "top-[calc(103px+var(--safe-top))]"
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

      {/* Lanes: the only horizontally scrollable box (the page owns Y, which
          is what lets the mobile axis header above stay sticky). */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const left = e.currentTarget.scrollLeft;
          syncHeader(left);
          onScrollLeft?.(left, timeAtOffset(left, startMs, m.slotWidth));
        }}
        // Scrollbar hidden (DayTabs pattern): the time-axis header and the
        // room column already say "this pans", and the thin bar sat on top
        // of the last lane on desktop.
        className="isolate overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div style={{ width: m.roomCol + gridWidth }} className="relative">
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
    </div>
  );
}
