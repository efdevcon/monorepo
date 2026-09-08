"use client";

import { usePaneActive, useTabReselect } from "@/components/paneContext";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  CalendarRange,
  Check,
  ClockArrowDown,
  List,
  ListFilter,
  Maximize2,
  MoveDown,
  MoveUp,
  Search,
  Star,
} from "lucide-react";
import cn from "classnames";
import { useSessions } from "@/data/hooks";
import { useInterested } from "@/data/interested/useInterested";
import {
  HEADER_ACTIONS_ID,
  headerCircle,
  headerCircleResting,
  headerCircleActive,
} from "@/components/AppHeader";
import {
  HeaderSearchDrawer,
  HEADER_SEARCH_PANEL_ID,
} from "@/components/HeaderSearchDrawer";
import { useHeaderSearch } from "@/hooks/useHeaderSearch";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDetailRoute } from "@/routing/detailRoute";
import { GroupPlaceholder, useProgressiveReveal } from "@/hooks/useProgressiveReveal";
import { DetailLayer, useListScrollAcrossDetail } from "@/components/DetailLayer";
import { ListLoadState } from "@/components/ListLoadState";
import Session from "@/app/(page-layout)/schedule/[id]/session";
import { ghostPill, InterestedPill } from "@/components/ActionPills";
import { SearchInput } from "@/components/SearchInput";
import { DayTabs } from "./DayTabs";
import { SessionCard } from "./SessionCard";
import { ScheduleTimeline } from "./ScheduleTimeline";
import { FilterSheet } from "./FilterSheet";
import { FilterPanelContent } from "./FilterPanelContent";
import { FilterStatusBar } from "./FilterStatusBar";
import { EmptyState } from "./EmptyState";
import { SessionDetailsPanel } from "./SessionDetailsPanel";
import { useScheduleState, type DecoratedGroup } from "./useScheduleState";
import { dayKey, formatDayHeading, ms } from "./utils";
import { eventDayKey, getEventTimeZoneLabel } from "@/data/eventTime";
import {
  useIsDesktop,
  useIsLandscape,
  useOrientationChange,
  headerOffsetNow,
  safeTopNow,
} from "@/hooks/useIsDesktop";

type ViewMode = "list" | "timeline";

/** Desktop side-panel slot: 360px panel + 16px gap, animated 0 ↔ this. */
const PANEL_SLOT_W = 376;

/** Pinned side-panel edge gap: the aside pins at 81px + --safe-top, 16px
 *  below the 65px desktop header; the bottom keeps the same 16px to the
 *  viewport edge so both ends of the panel match (same recipe as
 *  Speakers.tsx). */
const PANEL_EDGE_GAP = 16;

/**
 * Page-specific app-header buttons, portaled into AppHeader's target:
 * search + jump-to-now + interested circles, and the filter button with its
 * active count bubble. The star stays filled (matching InterestedPill); the
 * lavender circle fill carries the active state — on the search button it
 * means "drawer open" (closing the drawer also clears the query).
 */
function HeaderActions({
  searchOpen,
  searchActive,
  onToggleSearch,
  interestedOnly,
  onToggleInterested,
  onJumpToNow,
  filterCount,
  onOpenFilters,
}: {
  searchOpen: boolean;
  searchActive: boolean;
  onToggleSearch: () => void;
  interestedOnly: boolean;
  onToggleInterested: () => void;
  onJumpToNow: () => void;
  filterCount: number;
  onOpenFilters: () => void;
}) {
  const [target, setTarget] = useState<Element | null>(null);
  const paneActive = usePaneActive();
  useEffect(() => {
    setTarget(document.getElementById(HEADER_ACTIONS_ID));
  }, []);
  if (!target || !paneActive) return null;

  return (
    <>
      {createPortal(
    <>
      <button
        onClick={onToggleSearch}
        aria-label="Search sessions"
        aria-expanded={searchOpen}
        aria-controls={HEADER_SEARCH_PANEL_ID}
        className={cn(
          headerCircle,
          searchActive ? headerCircleActive : headerCircleResting
        )}
      >
        <Search className="size-4 text-dc-purple" />
      </button>
      <button
        onClick={onJumpToNow}
        aria-label="Jump to now"
        className={cn(headerCircle, headerCircleResting)}
      >
        <ClockArrowDown className="size-4 text-dc-purple" />
      </button>
      <button
        onClick={onToggleInterested}
        aria-label="Show interested sessions"
        aria-pressed={interestedOnly}
        className={cn(
          headerCircle,
          interestedOnly ? headerCircleActive : headerCircleResting
        )}
      >
        <Star className="size-4 text-dc-purple" fill="currentColor" />
      </button>
      <button
        onClick={onOpenFilters}
        aria-label="Open filters"
        className={cn(headerCircle, headerCircleResting, "relative")}
      >
        <ListFilter className="size-4 text-dc-purple" />
        {filterCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-dc-purple text-[10px] font-medium leading-none text-white">
            {filterCount}
          </span>
        )}
      </button>
    </>,
        target
      )}
    </>
  );
}

/** List/Timeline segmented control on its recessed track (Figma "Tabs"). */
function ViewToggle({
  view,
  onChange,
  compact = false,
}: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
  /** Icon-only, one step shorter: fits the pinned day bar on mobile. */
  compact?: boolean;
}) {
  const buttonRefs = useRef(new Map<ViewMode, HTMLButtonElement | null>());
  // The white pill slides between segments; measured after render so it lands
  // on the active label's post-font-weight-swap width.
  const [indicator, setIndicator] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  useLayoutEffect(() => {
    const el = buttonRefs.current.get(view);
    if (!el) return;
    setIndicator({
      x: el.offsetLeft,
      y: el.offsetTop,
      w: el.offsetWidth,
      h: el.offsetHeight,
    });
  }, [view]);

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center gap-1 rounded-lg bg-dc-lavender p-1 shadow-[inset_0px_1px_1px_rgba(34,17,68,0.15),inset_0px_2px_4px_rgba(34,17,68,0.06)] lg:bg-dc-panel",
        compact ? "h-9" : "h-10"
      )}
    >
      <div
        aria-hidden
        style={
          indicator
            ? {
                transform: `translate(${indicator.x}px, ${indicator.y}px)`,
                width: indicator.w,
                height: indicator.h,
              }
            : { visibility: "hidden" }
        }
        className="absolute left-0 top-0 rounded-[4px] bg-white shadow-[0px_1px_3px_rgba(22,11,43,0.1),0px_1px_2px_rgba(22,11,43,0.1)] transition-[transform,width] duration-150 ease-out motion-reduce:transition-none"
      />
      {(
        [
          { mode: "list", label: "List", Icon: List },
          { mode: "timeline", label: "Timeline", Icon: CalendarRange },
        ] as const
      ).map(({ mode, label, Icon }) => (
        <button
          key={mode}
          ref={(el) => {
            buttonRefs.current.set(mode, el);
          }}
          onClick={() => onChange(mode)}
          aria-pressed={view === mode}
          className={cn(
            "relative z-10 flex cursor-pointer items-center gap-2 rounded-[4px] px-2 py-1 text-[14px] leading-none transition-colors",
            compact ? "min-h-7" : "min-h-8",
            view === mode
              ? "font-bold text-dc-purple"
              : "font-medium text-dc-muted hover:text-dc-fg2"
          )}
        >
          <Icon className="size-5" />
          <span className={cn(compact && "sr-only")}>{label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Completed-sessions panel (Figma 3182/4325): ONE white bordered container
 * holding the summary row and — when expanded — the completed groups stacked
 * inside it, revealed behind a hairline divider.
 */
function CompletedPanel({
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-dc-hairline bg-white">
      {/* The whole header row toggles, not just the "Show" label: collapsed,
          the row is the entire card and a tap anywhere on it is what people
          try first. Label + arrow stay as the affordance; the button carries
          the card padding so the hit area is the full card. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "group flex w-full cursor-pointer items-center justify-between gap-3 rounded-t-lg p-4 text-left transition-colors duration-150 ease-out hover:bg-dc-panel",
          !open && "rounded-b-lg"
        )}
      >
        <span className="flex min-w-0 items-center gap-1 text-[14px] leading-5 text-dc-fg2 lg:text-[16px] lg:leading-6">
          <span className="min-w-0 font-semibold">Completed sessions</span>
          <Check className="size-4 shrink-0 text-dc-muted" />
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[14px] font-bold leading-none text-dc-purple lg:text-[16px] lg:leading-6">
          <span className="group-hover:underline">
            {open ? "Hide" : "Show"}
          </span>
          {open ? (
            <MoveUp className="size-3.5" />
          ) : (
            <MoveDown className="size-3.5" />
          )}
        </span>
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "mx-4 mb-4 grid grid-cols-1 gap-6 border-t border-dc-hairline pt-5",
              "transition-opacity duration-300 motion-reduce:transition-none",
              open ? "opacity-100" : "opacity-0"
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Sticky time-group header. Pins under the day tabs: 103px on mobile (56px
 * app bar + 47px tab strip), 118px on desktop (65px nav + 53px day bar).
 * Non-live headers only paint their wash once pinned on mobile — unpinned
 * they sit directly on the gradient/band (Figma) — while a pinned header
 * needs the fill so cards scrolling beneath don't show through. Desktop
 * keeps the wash full-time (invisible on the flat panel surface until
 * something slides under). Live headers keep their tint at all times: they
 * sit inside the red band, which shares the fill.
 */
function GroupHeader({
  group,
  inPanel,
}: {
  group: DecoratedGroup;
  inPanel: boolean;
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [stuck, setStuck] = useState(false);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    const el = sentinelRef.current;
    if (inPanel || !el) return;
    // The sentinel marks the header's natural position: once it crosses
    // above the pin line (1px past the breakpoint's sticky top offset =
    // app header + day-tab strip, see the sticky top-[103px]/[118px]),
    // the header is stuck. headerOffsetNow() carries the iOS status-bar
    // inset, matching the +var(--safe-top) in those sticky classes.
    const pinLine = headerOffsetNow() + (isDesktop ? 54 : 48);
    const observer = new IntersectionObserver(
      ([entry]) => {
        // A hidden tab pane (display:none) reports a 0×0 rect that is "not
        // intersecting" and "above the pin line": ignore it, or every header
        // flips to stuck while another tab shows and flashes back on return.
        const r = entry.boundingClientRect;
        if (r.width === 0 && r.height === 0) return;
        setStuck(!entry.isIntersecting && r.top < pinLine);
      },
      { rootMargin: `-${pinLine}px 0px 0px 0px` }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inPanel, isDesktop]);

  return (
    <>
      <div ref={sentinelRef} aria-hidden />
      <header
        className={cn(
          "flex items-center justify-between gap-3",
          !inPanel &&
            "sticky top-[calc(103px+var(--safe-top))] z-10 lg:top-[calc(118px+var(--safe-top))]",
          // Pinned headers get 4px 0 padding for breathing room, offset by
          // negative margins so flow height stays put (the section is
          // flex-col so the negative margins can't collapse away). Browsers
          // pin the border box at `top`, so the margins don't move the
          // pinned fill edge. On mobile this geometry is applied full-time —
          // swapping it in at the pin moment made the title visibly snap —
          // and since -my-1 cancels py-1 in flow, section spacing is
          // unchanged at rest. Desktop keeps it pin-only (the panel surface
          // hides the swap there).
          !inPanel && "max-lg:-my-1 max-lg:py-1",
          !inPanel && stuck && "lg:-my-1 lg:py-1",
          // Pinned non-live headers also get the wash + the app-header glass
          // blur so cards scrolling beneath don't ghost through the 95%
          // fill, going full-bleed on mobile so card edges can't peek past
          // the fill in the gutters. The mobile bleed geometry is full-time
          // (same no-snap rule; px-4 keeps the text on the content column),
          // while the wash fades in on pin instead of popping. Live headers
          // keep the fully opaque band tint (already full-bleed via the
          // band), no blur.
          !inPanel &&
            (group.isLive
              ? "bg-dc-live-bg"
              : cn(
                  "max-lg:-mx-4 max-lg:px-4 max-lg:transition-[background-color] max-lg:duration-150 lg:bg-dc-panel/95 motion-reduce:transition-none",
                  stuck && "bg-dc-panel/95 backdrop-blur-[4px]"
                ))
        )}
      >
        <span className="flex min-w-0 items-center gap-1 text-[14px] leading-6 text-dc-fg lg:text-[16px] lg:text-dc-fg2">
          <span className="truncate">
            <span className="font-semibold">{group.timeLabel} </span>
            <span className="font-normal">
              – {group.sessions.length} session
              {group.sessions.length > 1 ? "s" : ""}
            </span>
          </span>
          {group.isPast && !inPanel && (
            <Check className="size-4 shrink-0 text-dc-muted" />
          )}
        </span>
        {group.isLive && (
          <span className="shrink-0 rounded-[2px] bg-dc-red px-2 py-1 text-[12px] font-bold uppercase leading-none tracking-[0.5px] text-white lg:rounded-[4px] lg:text-[14px]">
            Live now
          </span>
        )}
        {group.isOngoing && (
          <span className="shrink-0 rounded-[2px] border border-dc-red px-2 py-1 text-[12px] font-bold uppercase leading-none tracking-[0.5px] text-dc-red lg:rounded-[4px] lg:text-[14px]">
            Ongoing
          </span>
        )}
      </header>
    </>
  );
}

/**
 * Redesigned schedule view (Figma "PWA / Schedule"). Mobile: full-bleed list
 * under the glass app header with sticky day tabs and time-group headers, a
 * full-bleed live band, collapsed completed sessions, a filter bottom sheet.
 * Desktop: white panel (toolbar + day tabs + list) with filter / session
 * details as 360px right columns. Data hooks and shapes are untouched.
 */
export function Schedule() {
  const { sessions, isLoading, isError } = useSessions();
  const { ids: interestedIds } = useInterested();
  const { id: detailId, open: openDetail, close: closeDetail } =
    useDetailRoute("session");
  const {
    now,
    days,
    selectedDay,
    userPickedDay,
    setSelectedDay,
    jumpToToday,
    search,
    setSearch,
    filters,
    toggleFilter,
    clearFilters,
    activeFilterCount,
    facetFilterCounts,
    visibleGroups,
    completedGroups,
    completedCount,
    interestedOnly,
    setInterestedOnly,
    filterOptions,
    daySessions,
    resultCount,
  } = useScheduleState(sessions, interestedIds);

  const isDesktop = useIsDesktop();
  // False while another tab pane is showing: header portals and window
  // measurements belong to the visible pane only (see TabPanes).
  const paneActive = usePaneActive();
  const [view, setView] = useState<ViewMode>("list");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [timelineJumpSignal, setTimelineJumpSignal] = useState(0);
  const [listJumpSignal, setListJumpSignal] = useState(0);
  const [timelineStartSignal, setTimelineStartSignal] = useState(0);
  // Day-tab taps are signal-driven too: the scroll must run after the new
  // day's groups are mounted. `key` is the tapped day.
  const [dayJump, setDayJump] = useState<{ n: number; key: string } | null>(
    null
  );
  const contentRef = useRef<HTMLDivElement | null>(null);
  // Time carried across a view toggle (see changeView), and the timeline's
  // report of the time at its left edge (updated as it scrolls).
  const pendingTimeRef = useRef<number | null>(null);
  const timelineLeftMsRef = useRef<number | null>(null);
  const [timelineScrollToTime, setTimelineScrollToTime] = useState<{
    ms: number;
    seq: number;
  } | null>(null);
  // Closing the drawer clears the query too (see useHeaderSearch).
  const headerSearch = useHeaderSearch(() => setSearch(""));
  const mainCardRef = useRef<HTMLDivElement | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);
  const groupRefs = useRef(new Map<string, HTMLElement | null>());

  // Two selections. The fullscreen session page is the URL (`/schedule/<id>`,
  // detailId, see routing/detailRoute.ts): mobile renders it as a layer over
  // the list, desktop in place of the list. The desktop side panel is local
  // state, like a native split view, so browsing sessions there never touches
  // history; the panel's expand action and shared links use the URL form.
  const [panelSessionId, setPanelSessionId] = useState<string | null>(null);
  const selectedSessionId = isDesktop ? panelSessionId : detailId;
  const selectSession = useCallback(
    (id: string | null) => {
      if (id) setFiltersOpen(false);
      if (isDesktop) {
        setPanelSessionId(id);
      } else if (id) {
        openDetail(id);
      } else {
        closeDetail();
      }
    },
    [isDesktop, openDetail, closeDetail]
  );

  const selectedSession = useMemo(
    () =>
      selectedSessionId
        ? (sessions.find((s) => s.id === selectedSessionId) ?? null)
        : null,
    [sessions, selectedSessionId]
  );
  const routeSession = useMemo(
    () => (detailId ? (sessions.find((s) => s.id === detailId) ?? null) : null),
    [sessions, detailId]
  );
  useDocumentTitle(routeSession?.title ?? null);
  // Desktop renders the session page in place of the list: remember where
  // the list was and put it back on close (mobile's layer keeps the list as
  // is underneath).
  useListScrollAcrossDetail(isDesktop && !!detailId);
  // The filter sheet belongs to the list.
  useEffect(() => {
    if (detailId) setFiltersOpen(false);
  }, [detailId]);
  // The list is on screen: this pane is the visible one and no fullscreen
  // page replaces it. Window measurements and the landing jump wait for it.
  const listVisible = paneActive && !(isDesktop && detailId);

  const openFilters = () => {
    setFiltersOpen(true);
    if (isDesktop) selectSession(null);
  };

  // Time groups render progressively (see useProgressiveReveal): the first
  // render includes the landing group ("live now", else the next one) so the
  // initial jump measures a real element; the rest fill in over the next
  // frames. Jumps complete the list first so they land exactly.
  const landingIndex = useMemo(() => {
    const i = visibleGroups.findIndex((g) => g.isLive);
    if (i >= 0) return i;
    const j = visibleGroups.findIndex((g) => g.isOngoing);
    if (j >= 0) return j;
    return Math.max(0, visibleGroups.findIndex((g) => !g.isPast));
  }, [visibleGroups]);
  const { visible: revealedGroups, revealAll: revealAllGroups } =
    useProgressiveReveal(visibleGroups.length, 3, landingIndex + 1);

  const jumpToNow = () => {
    // Cross days first: land on the day containing "now" (both view modes only
    // render the selected day). The scroll itself is signal-driven so it runs
    // after the (possibly day-switching) re-render, when the target groups /
    // now line actually exist.
    jumpToToday();
    if (view === "timeline") {
      // The timeline scrolls itself (horizontally to the now line) on signal.
      setTimelineJumpSignal((n) => n + 1);
      return;
    }
    revealAllGroups();
    setListJumpSignal((n) => n + 1);
  };
  // Re-tapping the Schedule tab resets to the landing state: today, at "now".
  useTabReselect(jumpToNow);

  // List view "jump to now": land on the "Live now" section, else a
  // still-running one, else the next upcoming one. Called from effects so the
  // closure sees the just-jumped-to day's groups and their mounted refs.
  const scrollListToNow = (behavior: ScrollBehavior) => {
    const target =
      visibleGroups.find((g) => g.isLive) ??
      visibleGroups.find((g) => g.isOngoing) ??
      visibleGroups.find((g) => !g.isPast) ??
      visibleGroups[0];
    const el = target && groupRefs.current.get(target.key);
    if (!el) return false;
    el.scrollIntoView({ behavior, block: "start" });
    return true;
  };
  useEffect(() => {
    if (listJumpSignal === 0) return;
    // Instant, never smooth: a smooth jump across a day's list animates
    // through every screen between here and "now" and WebKit rasterises all
    // of it (PR #112 crash class, see Speakers' A–Z jumps). Falls back to the
    // top when nothing is left to land on (all done, or a filter with no
    // results), so a re-tap is never a silent no-op.
    if (!scrollListToNow("auto")) window.scrollTo({ top: 0, behavior: "auto" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listJumpSignal]);

  // Top of the selected day's list, aligned under the pinned day tabs (the
  // content wrapper carries the same scroll margin as the groups). Only ever
  // scrolls UP: if the list start is already on screen, "top" must not move
  // the page.
  const scrollListTop = () => {
    const el = contentRef.current;
    if (!el) return;
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    if (el.getBoundingClientRect().top < margin) {
      el.scrollIntoView({ behavior: "auto", block: "start" });
    }
  };

  // Day tab tap: today lands on "live now" (the same rule as jump-to-now and
  // the initial landing, falling back to the top once the day is over); any
  // other day starts at the top of its list. Instant, not smooth: a tab is a
  // new page, and a smooth scroll through content that just changed reads as
  // scrolling the wrong day.
  const selectDay = (key: string) => {
    setSelectedDay(key);
    setDayJump((prev) => ({ n: (prev?.n ?? 0) + 1, key }));
  };
  useLayoutEffect(() => {
    if (!dayJump) return;
    const isToday = dayJump.key === eventDayKey(now);
    if (view === "timeline") {
      // The timeline scrolls itself horizontally on signal; the now-jump also
      // brings its root into view, the start-jump only resets the offset.
      if (isToday) {
        setTimelineJumpSignal((n) => n + 1);
      } else {
        setTimelineStartSignal((n) => n + 1);
        scrollListTop();
      }
      return;
    }
    if (isToday && scrollListToNow("auto")) return;
    scrollListTop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayJump]);

  // Start of the group at the top of the viewport (the first one whose
  // bottom clears the pinned-tabs line); null when nothing is on screen.
  const topVisibleGroupStartMs = (): number | null => {
    const el = contentRef.current;
    const pin = el ? parseFloat(getComputedStyle(el).scrollMarginTop) || 0 : 0;
    for (const group of visibleGroups) {
      const node = groupRefs.current.get(group.key);
      if (node && node.getBoundingClientRect().bottom > pin) {
        return ms(group.sessions[0].start);
      }
    }
    return null;
  };

  // The list's counterpart of "time at the left edge": the group starting at
  // or after `t` (what's happening from t onward), else the last one.
  const scrollListToTime = (t: number) => {
    const target =
      visibleGroups.find((g) => ms(g.sessions[0].start) >= t) ??
      visibleGroups[visibleGroups.length - 1];
    const node = target && groupRefs.current.get(target.key);
    node?.scrollIntoView({ behavior: "auto", block: "start" });
  };

  // View toggle: the new view starts at the top of the content and at the
  // same time the old one was showing — leaving the list, the group at the
  // top of the viewport; leaving the timeline, the time at its left edge.
  // Captured here, while the old view is still mounted; applied in the effect
  // below once the new view is in the DOM.
  const changeView = (next: ViewMode) => {
    if (next === view) return;
    const t =
      view === "list" ? topVisibleGroupStartMs() : timelineLeftMsRef.current;
    if (next === "timeline") {
      // Batched with setView: the timeline mounts with the target already set
      // and positions itself in its own layout effect, before paint.
      if (t != null) {
        setTimelineScrollToTime((prev) => ({
          ms: t,
          seq: (prev?.seq ?? 0) + 1,
        }));
      }
      pendingTimeRef.current = null;
    } else {
      pendingTimeRef.current = t; // the list scrolls in the effect below
    }
    setView(next);
  };
  const viewMountedRef = useRef(false);
  useLayoutEffect(() => {
    if (!viewMountedRef.current) {
      viewMountedRef.current = true; // mount: the landing effect decides
      return;
    }
    scrollListTop();
    const t = pendingTimeRef.current;
    pendingTimeRef.current = null;
    if (t != null && view === "list") scrollListToTime(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Landing: the first time the selected day's content is actually in the
  // DOM (sessions loaded, day resolved), jump straight to "live now",
  // instantly, before paint, so the list never visibly starts at the top.
  // Once per mount, and the pane stays mounted across tab switches (TabPanes
  // restores the scroll position), so in practice once per app open.
  const contentReady =
    selectedDay !== null &&
    (view === "list"
      ? visibleGroups.length > 0 || completedGroups.length > 0
      : daySessions.length > 0);
  const landedRef = useRef(false);
  // Deep link (`/schedule/<id>` on app open): the list behind the page shows
  // the session's day, and once the page closes it reveals the session
  // itself rather than landing on "live now". Consumes the landing.
  const revealOnCloseRef = useRef<string | null>(null);
  useEffect(() => {
    if (!routeSession || landedRef.current) return;
    landedRef.current = true;
    revealOnCloseRef.current = routeSession.id;
    const key = dayKey(routeSession);
    if (key !== selectedDay) setSelectedDay(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSession]);
  useLayoutEffect(() => {
    // Only while the list is on screen: scrollIntoView on a hidden
    // (display:none) element is a no-op that would still consume the landing.
    if (landedRef.current || !contentReady || !listVisible) return;
    landedRef.current = true;
    if (view === "list") scrollListToNow("auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentReady, listVisible]);
  const prevDetailRef = useRef(detailId);
  useLayoutEffect(() => {
    const prev = prevDetailRef.current;
    prevDetailRef.current = detailId;
    if (!listVisible || detailId || !prev || revealOnCloseRef.current !== prev) return;
    revealOnCloseRef.current = null;
    const group = visibleGroups.find((g) => g.sessions.some((s) => s.id === prev));
    const el = group ? groupRefs.current.get(group.key) : null;
    el?.scrollIntoView({ behavior: "auto", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailId, listVisible]);

  // Mobile timeline fullscreen: auto in landscape, or by the toggle button.
  // `null` follows orientation; a rotation always resets to the auto rule, so
  // manual portrait fullscreen + rotate stays fullscreen and rotating back
  // exits, while an X in landscape sticks until the next rotation.
  const [fullscreenOverride, setFullscreenOverride] = useState<boolean | null>(
    null
  );
  useOrientationChange(() => setFullscreenOverride(null));
  const isLandscape = useIsLandscape();
  const timelineFullscreen =
    // Never from a hidden pane or under a detail page: the fullscreen
    // timeline locks body scroll, which would freeze whatever is on screen.
    listVisible &&
    !isDesktop &&
    view === "timeline" &&
    // The timeline renders nothing without sessions — never lock the page
    // behind an overlay that isn't there.
    resultCount > 0 &&
    // Auto path only: an open soft keyboard (search) can make a phone
    // viewport report landscape, so don't flip into fullscreen under the
    // user's typing. An explicit tap on the button always wins.
    (fullscreenOverride ?? (isLandscape && !headerSearch.searchOpen));

  // Timeline's horizontal offset, reported by the grid as it scrolls.
  const timelineScrollLeftRef = useRef(0);

  // Mobile list/timeline toggle. The full one sits next to the "Sessions"
  // heading (design); once that row has scrolled under the pinned day bar, a
  // compact copy appears in the bar so the view stays switchable. The
  // fullscreen timeline's bar always carries the compact one (no heading
  // there), and switching to list from it exits fullscreen, since that
  // derives from the view.
  const [headingToggleVisible, setHeadingToggleVisible] = useState(true);
  const headingObserverRef = useRef<IntersectionObserver | null>(null);
  const headingRowRef = useCallback((node: HTMLDivElement | null) => {
    headingObserverRef.current?.disconnect();
    headingObserverRef.current = null;
    if (!node) {
      setHeadingToggleVisible(true);
      return;
    }
    // "Visible" = any part below the pinned day bar (mobile header + 48px
    // tabs), not merely inside the viewport, which the sticky bars cover.
    const pin = Math.round(headerOffsetNow() + 48);
    const io = new IntersectionObserver(
      ([entry]) => {
        // Hidden tab pane: 0×0 rect, not a real "scrolled away" (see GroupHeader).
        const r = entry.boundingClientRect;
        if (r.width === 0 && r.height === 0) return;
        setHeadingToggleVisible(entry.isIntersecting);
      },
      { rootMargin: `-${pin}px 0px 0px 0px`, threshold: 0 }
    );
    io.observe(node);
    headingObserverRef.current = io;
  }, []);
  const compactViewToggle =
    resultCount > 0 ? (
      <ViewToggle view={view} onChange={changeView} compact />
    ) : null;

  // Contiguous live groups render inside one full-bleed band (Figma frame 4).
  const segments = useMemo(() => {
    const segs: { live: boolean; groups: DecoratedGroup[] }[] = [];
    for (const g of visibleGroups) {
      const last = segs[segs.length - 1];
      if (last && last.live === g.isLive) last.groups.push(g);
      else segs.push({ live: g.isLive, groups: [g] });
    }
    return segs;
  }, [visibleGroups]);

  const sidePanelOpen = isDesktop && (filtersOpen || !!selectedSession);

  // Sticky side-panel growth (unified with Speakers.tsx's measure loop —
  // keep the math in sync): as the pinned aside's top approaches the header,
  // grow the panel's max-height so it keeps PANEL_EDGE_GAP to the viewport
  // bottom — capped at the content column's bottom edge. Without that cap, a
  // list shorter than the panel gives the sticky aside no room to pin, so
  // scrolling raises `top`, which grew the max-height, which lengthened the
  // page — a feedback loop that expands the panel to its entire content.
  // The var mutates the DOM directly so per-frame scrolling doesn't
  // re-render the (large) session list.
  useEffect(() => {
    if (!sidePanelOpen || !listVisible) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const aside = asideRef.current;
      if (!aside) return;
      const viewportH = window.visualViewport?.height ?? window.innerHeight;
      const asideTop = aside.getBoundingClientRect().top;
      const cardBottom =
        mainCardRef.current?.getBoundingClientRect().bottom ?? Infinity;
      // Resting size: 141px natural offset (nav + page title) + edge gap,
      // plus the status-bar inset the sticky top gained (iPad PWA).
      const defaultRest = viewportH - 141 - safeTopNow() - PANEL_EDGE_GAP;
      const gapTarget = viewportH - asideTop - PANEL_EDGE_GAP;
      const contentLimit = cardBottom - asideTop;
      aside.style.setProperty(
        "--schedule-panel-max-h",
        `${Math.max(240, defaultRest, Math.min(gapTarget, contentLimit))}px`
      );
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [sidePanelOpen, listVisible]);

  // Side-panel content, kept mounted through the 300ms exit transition so the
  // closing panel doesn't collapse into an empty box.
  const livePanelContent = selectedSession ? (
    <SessionDetailsPanel
      session={selectedSession}
      onClose={() => selectSession(null)}
    />
  ) : filtersOpen ? (
    // Same growth var as the details panels: the filter column keeps
    // PANEL_EDGE_GAP to the viewport bottom while pinned. The fallback
    // matches the resting 141px natural offset + that 16px clearance.
    <div className="flex max-h-[var(--schedule-panel-max-h,calc(100dvh-157px-var(--safe-top)))] min-h-0 flex-col">
      <FilterPanelContent
        options={filterOptions}
        filters={filters}
        onToggle={toggleFilter}
        onClear={clearFilters}
        onClose={() => setFiltersOpen(false)}
        defaultOpen
      />
    </div>
  ) : null;
  const lastPanelContentRef = useRef<React.ReactNode>(null);
  if (livePanelContent) lastPanelContentRef.current = livePanelContent;
  const panelContent = livePanelContent ?? lastPanelContentRef.current;
  const dayHeading = useMemo(() => {
    const day = days.find((d) => d.key === selectedDay);
    return day ? formatDayHeading(day.key) : null;
  }, [days, selectedDay]);

  const renderGroup = (
    group: DecoratedGroup,
    opts: { inPanel?: boolean } = {}
  ) => (
    <section
      key={group.key}
      ref={(el) => {
        if (!opts.inPanel) groupRefs.current.set(group.key, el);
      }}
      // flex-col so GroupHeader's stuck-state negative margins stay exact
      // instead of collapsing with the card list's top margin.
      className={cn(
        "flex flex-col",
        !opts.inPanel &&
          "scroll-mt-[calc(112px+var(--safe-top))] lg:scroll-mt-[calc(127px+var(--safe-top))]"
      )}
    >
      <GroupHeader group={group} inPanel={!!opts.inPanel} />
      {/* Groups past the progressive-reveal frontier, and completed groups
          while their panel is collapsed, hold their place with a placeholder
          of about one card-row height each; the section and its header stay
          real so jumps and sticky headers work. 2+ sessions in a timeslot:
          2-col on desktop (collapses while the side panel narrows the main
          column). */}
      {(opts.inPanel ? !completedOpen : visibleGroups.indexOf(group) >= revealedGroups) ? (
        <GroupPlaceholder
          height={
            (group.sessions.length > 1 && !sidePanelOpen && isDesktop
              ? Math.ceil(group.sessions.length / 2)
              : group.sessions.length) *
              98 +
            12
          }
        />
      ) : (
        <div
          className={cn(
            "mt-3 flex flex-col gap-3",
            group.sessions.length > 1 && !sidePanelOpen && "lg:grid lg:grid-cols-2"
          )}
        >
          {group.sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              // Compact 2-up cells drop the inline FEATURED badge (Figma 4325).
              compact={group.sessions.length > 1 && !sidePanelOpen}
              selected={session.id === selectedSessionId}
              // Clicking the already-selected card closes the panel (matches
              // the timeline-view toggle behavior).
              onOpen={(id) => selectSession(id === selectedSessionId ? null : id)}
            />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <main className="expand font-heading text-dc-fg">
      {/* The session page owns the header while open (back arrow, share,
          calendar); the list's actions and its search drawer step aside and
          come back, query intact, when it closes. */}
      {!detailId && (
        <HeaderActions
          searchOpen={headerSearch.searchOpen}
          searchActive={headerSearch.searchOpen}
          onToggleSearch={headerSearch.toggleSearch}
          interestedOnly={interestedOnly}
          onToggleInterested={() => setInterestedOnly((v) => !v)}
          onJumpToNow={jumpToNow}
          filterCount={activeFilterCount}
          onOpenFilters={openFilters}
        />
      )}
      {!detailId && (
        <HeaderSearchDrawer
          open={headerSearch.searchOpen}
          onClose={headerSearch.closeSearch}
          value={search}
          onChange={setSearch}
          placeholder="Search by session, speaker or topic"
          inputRef={headerSearch.inputRef}
          drawerRef={headerSearch.drawerRef}
        />
      )}

      {/* Fullscreen session page for `/schedule/<id>`: mobile as a layer over
          the (still mounted) list, desktop in place of it. Keyed by id so a
          chained open (speaker → session) starts at the top. */}
      {detailId && !isDesktop && (
        <DetailLayer key={detailId} label="Session details" onClose={closeDetail}>
          <Session id={detailId} />
        </DetailLayer>
      )}
      {detailId && isDesktop && <Session key={detailId} id={detailId} />}

      <div
        className={cn(
          "lg:mx-auto lg:w-full lg:max-w-[1312px] lg:px-8 lg:pb-16 xl:px-0",
          // Under the mobile layer: keep layout + scroll position, stop the
          // sticky day bar from painting through, block interaction.
          !isDesktop && detailId && "invisible"
        )}
        // Desktop: the page takes the list's place in the document flow.
        hidden={(isDesktop && !!detailId) || undefined}
        inert={!!detailId || undefined}
      >
        {/* Desktop page title */}
        <h1 className="hidden pb-4 pt-8 text-[24px] font-extrabold leading-[28.8px] tracking-[-0.5px] text-dc-fg2 lg:block">
          Schedule
        </h1>

        {/* No gap here — the animated aside carries the 16px gutter (pl-4). */}
        <div className="lg:flex lg:items-start">
          {/* Main panel */}
          <div
            ref={mainCardRef}
            className="min-w-0 lg:flex-1 lg:rounded-xl lg:border lg:border-dc-hairline lg:shadow-[0px_1px_2px_rgba(22,11,43,0.04)]"
          >
            {/* Desktop: search + view toggle toolbar */}
            <div className="hidden items-center justify-between gap-3 border-b border-dc-hairline bg-white px-4 py-3 lg:flex lg:rounded-t-xl">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search by session, speaker or topic"
                className="w-[348px]"
              />
              <ViewToggle view={view} onChange={changeView} />
            </div>

            {/* Day tabs (sticky under the mobile header) + desktop controls */}
            <DayTabs
              days={days}
              selectedDay={selectedDay}
              onSelect={selectDay}
              trailing={headingToggleVisible ? null : compactViewToggle}
            >
              <InterestedPill
                active={interestedOnly}
                onToggle={() => setInterestedOnly((v) => !v)}
              />
              <button onClick={jumpToNow} className={ghostPill}>
                <ClockArrowDown className="size-4" />
                Jump to now
              </button>
              <button
                onClick={() => {
                  if (filtersOpen) setFiltersOpen(false);
                  else openFilters();
                }}
                className={cn(
                  ghostPill,
                  "relative",
                  activeFilterCount > 0 && "border border-dc-purple bg-dc-lavender"
                )}
              >
                <ListFilter className="size-4" />
                Filter
                {activeFilterCount > 0 && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-dc-red text-[10px] font-bold leading-none text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </DayTabs>

            {/* Content area: brand-neutrals/50 surface on desktop (Figma) */}
            <div
              ref={contentRef}
              className={cn(
                "px-4 pt-6 lg:rounded-b-xl lg:bg-dc-panel lg:pb-6",
                // Scroll target for day-tab "top" (see scrollListTop); same
                // pinned-tabs clearance as the group headers.
                "scroll-mt-[calc(112px+var(--safe-top))] lg:scroll-mt-[calc(127px+var(--safe-top))]",
                // Mobile timeline sits flush on the panel-grey underlay (see
                // the timeline branch); the layout's nav clearance is the
                // only gap left below it.
                view === "timeline" ? "pb-0" : "pb-6"
              )}
            >
              {/* Mobile: "Sessions" heading + view toggle (+ fullscreen button
                  in timeline view). Observed: once this row is under the
                  pinned day bar, the bar shows the compact toggle instead. */}
              {resultCount > 0 && (
                <div
                  ref={headingRowRef}
                  className="mb-3 flex items-center justify-between gap-3 lg:hidden"
                >
                  <h2 className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg">
                    Sessions
                  </h2>
                  <div className="flex items-center gap-3">
                    {view === "timeline" && (
                      <button
                        onClick={() => setFullscreenOverride(true)}
                        aria-label="Fullscreen timeline"
                        className={cn(headerCircle, headerCircleResting)}
                      >
                        <Maximize2 className="size-4 text-dc-purple" />
                      </button>
                    )}
                    <ViewToggle view={view} onChange={changeView} />
                  </div>
                </div>
              )}

              {/* Desktop: day heading + applied-filter chip */}
              <div className="mb-3 hidden items-center justify-between gap-3 lg:flex">
                {dayHeading && (
                  <h2 className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
                    {dayHeading}
                  </h2>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-[14px] tracking-[0] text-dc-muted">
                    {getEventTimeZoneLabel()}
                  </span>
                  {/* Outermost so the chip sits under the toolbar's Filter button. */}
                  <FilterStatusBar
                    counts={facetFilterCounts}
                    onClear={clearFilters}
                  />
                </div>
              </div>

              {/* Mobile applied-filter chip */}
              <div className="mb-4 lg:hidden">
                <FilterStatusBar
                  counts={facetFilterCounts}
                  onClear={clearFilters}
                />
              </div>

              {isLoading && sessions.length === 0 ? (
                <ListLoadState kind="schedule" state="loading" />
              ) : isError ? (
                <ListLoadState kind="schedule" state="error" />
              ) : sessions.length === 0 ? (
                // Synced fine, nothing published yet (the app ships before
                // the schedule does). Distinct from "no results".
                <ListLoadState kind="schedule" state="unpublished" />
              ) : selectedDay === null ? null : resultCount === 0 ? (
                // selectedDay is null only pre-data — rendering the empty
                // state then flashes "Nothing matches the current filters"
                // before any filter could exist.
                <EmptyState
                  query={search}
                  filtersActive={activeFilterCount > 0}
                  onReset={clearFilters}
                />
              ) : view === "timeline" ? (
                <>
                  {/* Mobile: panel-grey underlay (between .app-bg and the
                      content, like the details pages) so the space under the
                      full-bleed grid reads as one surface instead of the
                      gradient tail showing above the tab bar. */}
                  <div
                    className="fixed inset-0 -z-[5] bg-dc-panel lg:hidden"
                    aria-hidden
                  />
                  <ScheduleTimeline
                  sessions={daySessions}
                  nowMs={now}
                  dayLabel={
                    days.find((d) => d.key === selectedDay)?.label ?? ""
                  }
                  jumpToNowSignal={timelineJumpSignal}
                  scrollToStartSignal={timelineStartSignal}
                  onScrollLeft={(left, leftMs) => {
                    timelineScrollLeftRef.current = left;
                    timelineLeftMsRef.current = leftMs;
                  }}
                  scrollToTime={timelineScrollToTime}
                  fullscreen={timelineFullscreen}
                  onExitFullscreen={() => setFullscreenOverride(false)}
                  onJumpToNow={jumpToNow}
                  interestedOnly={interestedOnly}
                  onToggleInterested={() => setInterestedOnly((v) => !v)}
                  fullscreenTop={
                    <DayTabs
                      days={days}
                      selectedDay={selectedDay}
                      onSelect={selectDay}
                      pinned={false}
                      trailing={compactViewToggle}
                    />
                  }
                  selectedSessionId={selectedSessionId}
                  // Clicking the already-selected block closes the panel.
                  onOpen={(id) =>
                    selectSession(id === selectedSessionId ? null : id)
                  }
                  />
                </>
              ) : (
                <div className="flex flex-col gap-6">
                  {completedCount > 0 && (
                    <CompletedPanel
                      open={completedOpen}
                      onToggle={() => setCompletedOpen((v) => !v)}
                    >
                      {completedGroups.map((g) =>
                        renderGroup(g, { inPanel: true })
                      )}
                    </CompletedPanel>
                  )}
                  {segments.map((segment, i) =>
                    segment.live ? (
                      <div
                        key={`live-${i}`}
                        // -my-3 pulls the band halfway into the 24px section
                        // gaps: 12px of tint on either side of the live group.
                        className="-mx-4 -my-3 flex flex-col gap-6 border-y border-dc-red bg-dc-live-bg px-4 py-3"
                      >
                        {segment.groups.map((g) => renderGroup(g))}
                      </div>
                    ) : (
                      <div key={i} className="flex flex-col gap-6">
                        {segment.groups.map((g) => renderGroup(g))}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Desktop side column: filters or session details. Always mounted;
              its width transitions 0 ↔ 376px (360 panel + 16 gap) so the main
              column shrinks on the same clock, while the panel itself slides
              in from the right with a fade — one 300ms ease-out pair. */}
          <aside
            ref={asideRef}
            aria-hidden={!sidePanelOpen}
            // Closed panel stays mounted for the exit transition — inert
            // keeps its invisible controls out of the tab order.
            inert={!sidePanelOpen || undefined}
            style={{ width: sidePanelOpen ? PANEL_SLOT_W : 0 }}
            className={cn(
              "sticky top-[calc(81px+var(--safe-top))] hidden shrink-0 overflow-hidden lg:block",
              "transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
            )}
          >
            <div
              style={{ width: PANEL_SLOT_W }}
              className={cn(
                "pl-4 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transform-none motion-reduce:transition-none",
                sidePanelOpen
                  ? "translate-x-0 opacity-100"
                  : "translate-x-6 opacity-0"
              )}
            >
              {panelContent}
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile filter bottom sheet */}
      {!isDesktop && (
        <FilterSheet
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          options={filterOptions}
          filters={filters}
          onToggle={toggleFilter}
          onClear={clearFilters}
        />
      )}
    </main>
  );
}
