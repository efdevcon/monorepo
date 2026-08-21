"use client";

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
  MoveDown,
  MoveUp,
  Search,
  Star,
} from "lucide-react";
import cn from "classnames";
import { useSessions } from "@/data/hooks";
import { useInterested } from "@/data/interested/useInterested";
import { HEADER_ACTIONS_ID } from "@/components/AppHeader";
import { ghostPill, InterestedPill } from "@/components/ActionPills";
import {
  SearchInput,
  scrollToTopAndFocusSearch,
} from "@/components/SearchInput";
import { DayTabs } from "./DayTabs";
import { SessionCard } from "./SessionCard";
import { ScheduleTimeline } from "./ScheduleTimeline";
import { FilterSheet } from "./FilterSheet";
import { FilterPanelContent } from "./FilterPanelContent";
import { FilterStatusBar } from "./FilterStatusBar";
import { EmptyState } from "./EmptyState";
import { SessionDetailsPanel } from "./SessionDetailsPanel";
import { useScheduleState, type DecoratedGroup } from "./useScheduleState";
import { formatDayHeading } from "./utils";
import { getEventTimeZoneLabel } from "@/data/eventTime";
import {
  useIsDesktop,
  isDesktopNow,
  HEADER_OFFSET_DESKTOP,
  HEADER_OFFSET_MOBILE,
} from "@/hooks/useIsDesktop";

type ViewMode = "list" | "timeline";

/** Desktop side-panel slot: 360px panel + 16px gap, animated 0 ↔ this. */
const PANEL_SLOT_W = 376;

/** Pinned side-panel edge gap: the aside pins at top-[81px], 16px below the
 *  65px desktop header; the bottom keeps the same 16px to the viewport edge
 *  so both ends of the panel match (same recipe as Speakers.tsx). */
const PANEL_EDGE_GAP = 16;

/** Circular 32px glass icon button used in the app header (Figma). Border
 *  and fill are applied per-usage (resting vs active) — Tailwind resolves
 *  same-property conflicts by stylesheet order, not class order, so an
 *  appended active bg-* could not reliably override one baked in here. */
const headerCircle =
  "flex size-8 cursor-pointer items-center justify-center rounded-full border transition-opacity";
const headerCircleResting = "border-dc-hairline bg-white";
const headerCircleActive = "border-dc-purple bg-dc-lavender";

/**
 * Page-specific app-header buttons, portaled into AppHeader's target:
 * scroll-revealed search + jump-to-now + interested circles, and the filter
 * button with its active count bubble — same left-to-right order as the
 * top-of-page action row. The star stays filled (matching InterestedPill);
 * the lavender circle fill carries the active state.
 */
function HeaderActions({
  revealed,
  onSearch,
  interestedOnly,
  onToggleInterested,
  onJumpToNow,
  filterCount,
  onOpenFilters,
}: {
  revealed: boolean;
  onSearch: () => void;
  interestedOnly: boolean;
  onToggleInterested: () => void;
  onJumpToNow: () => void;
  filterCount: number;
  onOpenFilters: () => void;
}) {
  const [target, setTarget] = useState<Element | null>(null);
  useEffect(() => {
    setTarget(document.getElementById(HEADER_ACTIONS_ID));
  }, []);
  if (!target) return null;

  return (
    <>
      {createPortal(
    <>
      <button
        onClick={onSearch}
        aria-label="Search sessions"
        className={cn(
          headerCircle,
          headerCircleResting,
          !revealed && "pointer-events-none opacity-0"
        )}
      >
        <Search className="size-4 text-dc-purple" />
      </button>
      <button
        onClick={onJumpToNow}
        aria-label="Jump to now"
        className={cn(
          headerCircle,
          headerCircleResting,
          !revealed && "pointer-events-none opacity-0"
        )}
      >
        <ClockArrowDown className="size-4 text-dc-purple" />
      </button>
      <button
        onClick={onToggleInterested}
        aria-label="Show interested sessions"
        aria-pressed={interestedOnly}
        className={cn(
          headerCircle,
          interestedOnly ? headerCircleActive : headerCircleResting,
          !revealed && "pointer-events-none opacity-0"
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
}: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
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
    <div className="relative flex h-10 shrink-0 items-center gap-1 rounded-lg bg-dc-lavender p-1 shadow-[inset_0px_1px_1px_rgba(34,17,68,0.15),inset_0px_2px_4px_rgba(34,17,68,0.06)] lg:bg-dc-panel">
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
          className={cn(
            "relative z-10 flex min-h-8 cursor-pointer items-center gap-2 rounded-[4px] px-2 py-1 text-[14px] leading-none transition-colors",
            view === mode
              ? "font-bold text-dc-purple"
              : "font-medium text-dc-muted hover:text-dc-fg2"
          )}
        >
          <Icon className="size-5" />
          {label}
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
  count,
  untilLabel,
  open,
  onToggle,
  children,
}: {
  count: number;
  untilLabel: string | null;
  open: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-dc-hairline bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1 text-[14px] leading-5 text-dc-fg2 lg:text-[16px] lg:leading-6">
          <span className="min-w-0">
            <span className="font-semibold">
              {count} session{count > 1 ? "s" : ""}
            </span>{" "}
            completed{untilLabel ? ` before ${untilLabel}` : ""}
          </span>
          <Check className="size-4 shrink-0 text-dc-muted" />
        </span>
        <button
          onClick={onToggle}
          className="group flex shrink-0 cursor-pointer items-center gap-1 text-[14px] font-bold leading-none text-dc-purple lg:text-[16px] lg:leading-6"
        >
          <span className="group-hover:underline">
            {open ? "Hide" : "Show"}
          </span>
          {open ? (
            <MoveUp className="size-3.5" />
          ) : (
            <MoveDown className="size-3.5" />
          )}
        </button>
      </div>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "mt-3 grid grid-cols-1 gap-6 border-t border-dc-hairline pt-6",
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
    // the header is stuck.
    const pinLine = isDesktop
      ? HEADER_OFFSET_DESKTOP + 54
      : HEADER_OFFSET_MOBILE + 48;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setStuck(
          !entry.isIntersecting && entry.boundingClientRect.top < pinLine
        ),
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
          !inPanel && "sticky top-[103px] z-10 lg:top-[118px]",
          // Every pinned header gets 4px 0 padding for breathing room,
          // offset by negative margins so flow height stays put (no 8px
          // content jump at the pin; the section is flex-col so the
          // negative margins can't collapse away). Browsers pin the border
          // box at `top`, so the margins don't move the pinned fill edge.
          !inPanel && stuck && "-my-1 py-1",
          // Pinned non-live headers also get the wash + the app-header glass
          // blur so cards scrolling beneath don't ghost through the 95%
          // fill, going full-bleed on mobile so card edges can't peek past
          // the fill in the gutters. Live headers keep the fully opaque band
          // tint (already full-bleed via the band), no blur.
          !inPanel &&
            (group.isLive
              ? "bg-dc-live-bg"
              : cn(
                  "lg:bg-dc-panel/95",
                  stuck &&
                    "-mx-4 bg-dc-panel/95 px-4 backdrop-blur-[4px] lg:mx-0 lg:px-0"
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
  const { sessions, isLoading, isError, error } = useSessions();
  const { ids: interestedIds } = useInterested();
  const {
    now,
    days,
    selectedDay,
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
    completedUntilLabel,
    interestedOnly,
    setInterestedOnly,
    filterOptions,
    daySessions,
    resultCount,
  } = useScheduleState(sessions, interestedIds);

  const isDesktop = useIsDesktop();
  const [view, setView] = useState<ViewMode>("list");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [scrolled, setScrolled] = useState(false);
  const [timelineJumpSignal, setTimelineJumpSignal] = useState(0);
  const [listJumpSignal, setListJumpSignal] = useState(0);
  const searchBlockRef = useRef<HTMLDivElement | null>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);
  const mainCardRef = useRef<HTMLDivElement | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);
  const groupRefs = useRef(new Map<string, HTMLElement | null>());

  // Reveal the header's star/jump buttons once the search block scrolls away.
  useEffect(() => {
    const el = searchBlockRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { rootMargin: `-${HEADER_OFFSET_MOBILE}px 0px 0px 0px` }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Desktop side panel selection, mirrored to ?session= for shareability.
  const selectSession = useCallback((id: string | null) => {
    setSelectedSessionId(id);
    if (id) setFiltersOpen(false);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("session", id);
    else url.searchParams.delete("session");
    window.history.replaceState(null, "", url.toString());
  }, []);
  useEffect(() => {
    // Desktop-only: selection renders in the side panel there. On mobile the
    // highlight has no clear affordance (details live on /schedule/[id]), so
    // restoring it would pin one card purple forever.
    if (!isDesktopNow()) return;
    const id = new URLSearchParams(window.location.search).get("session");
    if (id) setSelectedSessionId(id);
  }, []);

  const selectedSession = useMemo(
    () =>
      selectedSessionId
        ? (sessions.find((s) => s.id === selectedSessionId) ?? null)
        : null,
    [sessions, selectedSessionId]
  );

  const openFilters = () => {
    setFiltersOpen(true);
    if (isDesktop) selectSession(null);
  };

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
    setListJumpSignal((n) => n + 1);
  };

  // List view "jump to now": land on the "Live now" section, else a
  // still-running one, else the next upcoming one. Runs as an effect so the
  // closure sees the just-jumped-to day's groups and their mounted refs.
  useEffect(() => {
    if (listJumpSignal === 0) return;
    const target =
      visibleGroups.find((g) => g.isLive) ??
      visibleGroups.find((g) => g.isOngoing) ??
      visibleGroups.find((g) => !g.isPast) ??
      visibleGroups[0];
    if (!target) return;
    groupRefs.current
      .get(target.key)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listJumpSignal]);

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
    if (!sidePanelOpen) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const aside = asideRef.current;
      if (!aside) return;
      const viewportH = window.visualViewport?.height ?? window.innerHeight;
      const asideTop = aside.getBoundingClientRect().top;
      const cardBottom =
        mainCardRef.current?.getBoundingClientRect().bottom ?? Infinity;
      // Resting size: 141px natural offset (nav + page title) + edge gap.
      const defaultRest = viewportH - 141 - PANEL_EDGE_GAP;
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
  }, [sidePanelOpen]);

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
    <div className="flex max-h-[var(--schedule-panel-max-h,calc(100dvh-157px))] min-h-0 flex-col">
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
        !opts.inPanel && "scroll-mt-[112px] lg:scroll-mt-[127px]"
      )}
    >
      <GroupHeader group={group} inPanel={!!opts.inPanel} />
      {/* 2+ sessions in a timeslot: 2-col on desktop (collapses while the
          side panel narrows the main column). */}
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
            // Compact 2-up cells drop the inline KEYNOTE badge (Figma 4325).
            compact={group.sessions.length > 1 && !sidePanelOpen}
            selected={session.id === selectedSessionId}
            // Clicking the already-selected card closes the panel (matches
            // the timeline-view toggle behavior).
            onOpen={(id) => selectSession(id === selectedSessionId ? null : id)}
          />
        ))}
      </div>
    </section>
  );

  return (
    <main className="expand font-heading text-dc-fg">
      <HeaderActions
        revealed={scrolled}
        onSearch={() =>
          scrollToTopAndFocusSearch(mobileSearchInputRef.current)
        }
        interestedOnly={interestedOnly}
        onToggleInterested={() => setInterestedOnly((v) => !v)}
        onJumpToNow={jumpToNow}
        filterCount={activeFilterCount}
        onOpenFilters={openFilters}
      />

      <div className="lg:mx-auto lg:w-full lg:max-w-[1312px] lg:px-8 lg:pb-16 xl:px-0">
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
            {/* Mobile: search + actions block (scrolls away) */}
            <div
              ref={searchBlockRef}
              className="flex flex-col gap-3 border-b border-dc-hairline px-4 py-3 lg:hidden"
            >
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search by session, speaker or topic"
                inputRef={mobileSearchInputRef}
              />
              <div className="flex items-center justify-between">
                <button onClick={jumpToNow} className={ghostPill}>
                  <ClockArrowDown className="size-4" />
                  Jump to now
                </button>
                <InterestedPill
                  active={interestedOnly}
                  onToggle={() => setInterestedOnly((v) => !v)}
                />
              </div>
            </div>

            {/* Desktop: search + view toggle toolbar */}
            <div className="hidden items-center justify-between gap-3 border-b border-dc-hairline bg-white px-4 py-3 lg:flex lg:rounded-t-xl">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search by session, speaker or topic"
                className="w-[348px]"
              />
              <ViewToggle view={view} onChange={setView} />
            </div>

            {/* Day tabs (sticky under the mobile header) + desktop controls */}
            <DayTabs
              days={days}
              selectedDay={selectedDay}
              onSelect={setSelectedDay}
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
            <div className="px-4 py-6 lg:rounded-b-xl lg:bg-dc-panel">
              {/* Mobile: "Sessions" heading + view toggle */}
              {resultCount > 0 && (
                <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
                  <h2 className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg">
                    Sessions
                  </h2>
                  <ViewToggle view={view} onChange={setView} />
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
                <p className="py-12 text-center text-dc-muted">
                  Loading schedule…
                </p>
              ) : isError ? (
                <p className="py-12 text-center text-dc-red">
                  {error?.message ?? "Failed to load the schedule."}
                </p>
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
                <ScheduleTimeline
                  sessions={daySessions}
                  nowMs={now}
                  dayLabel={
                    days.find((d) => d.key === selectedDay)?.label ?? ""
                  }
                  jumpToNowSignal={timelineJumpSignal}
                  selectedSessionId={selectedSessionId}
                  // Clicking the already-selected block closes the panel.
                  onOpen={(id) =>
                    selectSession(id === selectedSessionId ? null : id)
                  }
                />
              ) : (
                <div className="flex flex-col gap-6">
                  {completedCount > 0 && (
                    <CompletedPanel
                      count={completedCount}
                      untilLabel={completedUntilLabel}
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
              "sticky top-[81px] hidden shrink-0 overflow-hidden lg:block",
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
