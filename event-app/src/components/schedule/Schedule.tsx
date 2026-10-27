"use client";

import { trackEvent } from "@/data/analytics/track";
import { usePaneActive } from "@/components/paneContext";
import { BetaBanner } from "@/components/BetaBanner";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  CalendarDays,
  CalendarRange,
  Check,
  ClockArrowDown,
  List,
  ListFilter,
  MoveDown,
  MoveUp,
  Tent,
  type LucideIcon,
} from "lucide-react";
import cn from "classnames";
import { useSearchParams } from "next/navigation";
import { useSessions, useSessionsOfAllProgrammes } from "@/data/hooks";
import { communityHubsDataset, getActiveDataset } from "@/data/dataset";
import { isCommunityLed } from "@/data/programme";
import { useStoreState } from "@/data/store/use-event-store";
import { HUBS_PARAM, INTERESTS_PARAM, ScheduleSourceProvider, storeFor, type ScheduleSource } from "@/data/store/schedule-source";
import { useInterested } from "@/data/interested/useInterested";
import { SearchDrawerPanel } from "@/components/HeaderSearchDrawer";
import { useHeaderSearch } from "@/hooks/useHeaderSearch";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDetailRoute } from "@/routing/detailRoute";
import { GroupPlaceholder, useProgressiveReveal } from "@/hooks/useProgressiveReveal";
import { DetailLayer, useListScrollAcrossDetail } from "@/components/DetailLayer";
import { ListLoadState } from "@/components/ListLoadState";
import Session from "@/app/(page-layout)/schedule/[id]/session";
import { ghostPill, HeaderToolbar, InterestedPill, ToolbarPills } from "@/components/ActionPills";
import { RemindersNudgeRow } from "@/components/schedule/RemindersNudgeRow";
import { SearchInput } from "@/components/SearchInput";
import { DayTabs } from "./DayTabs";
import { SessionCard } from "./SessionCard";
import { ScheduleTimeline } from "./ScheduleTimeline";
import { FilterSheet } from "./FilterSheet";
import { FilterPanelContent, type FilterPanelMode } from "./FilterPanelContent";
import { FilterStatusBar } from "./FilterStatusBar";
import { EmptyState } from "./EmptyState";
import { SessionDetailsPanel } from "./SessionDetailsPanel";
import { useScheduleState, type DecoratedGroup, type FilterFacet } from "./useScheduleState";
import {
  dayKey,
  formatDayHeading,
  ms,
  TIMELINE_ZOOM_PREF_KEY,
  TIMELINE_ZOOMS,
  type TimelineZoom,
} from "./utils";
import { readPref, writePref } from "@/data/prefs";
import { eventDayKey, getEventTimeZoneLabel } from "@/data/eventTime";
import {
  APP_CHROME_OFF_ATTR,
  headerOffsetNow,
  safeTopNow,
  useIsDesktop,
  useIsPhoneLandscape,
} from "@/hooks/useIsDesktop";
import { useStuckUnderHeader } from "@/hooks/useStuckUnderHeader";
import { usePreviewState } from "@/hooks/usePreviewState";

type ViewMode = "list" | "timeline";

/**
 * "Tracks / Community" switch: which programme the whole page shows.
 * A white pill track whose purple fill sits on the chosen programme (the
 * List/Timeline control's indicator, in the topic pills' selected purple),
 * so it reads as page-level navigation and not as a twin of that control,
 * which keeps its recessed track. Type, 20px icons, gap and colours match
 * List/Timeline so the two read as one family; segments take 12px sides
 * (not that control's 8px) so labels clear the round track's ends.
 * `stretch` fills the row on mobile. The fill never animates: a switch
 * remounts the list and this toggle with it, and the slide that used to
 * replay across that remount (and on page load) read as a wiggle (Scott,
 * 2026-10-13) — the fill is simply placed, on mount and on resize.
 */
function SourceToggle({
  source,
  onChange,
  stretch = false,
}: {
  source: ScheduleSource;
  onChange: (s: ScheduleSource) => void;
  stretch?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef(new Map<ScheduleSource, HTMLButtonElement | null>());
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(null);

  // Measured after render so the fill lands on the active label's
  // post-font-weight-swap width; re-measured on resize because the stretched
  // mobile segments change width with the viewport.
  useLayoutEffect(() => {
    const measure = () => {
      const el = buttonRefs.current.get(source);
      if (el) setIndicator({ x: el.offsetLeft, w: el.offsetWidth });
    };
    measure();
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, [source]);

  return (
    <div
      ref={trackRef}
      role="tablist"
      aria-label="Which programme to show"
      className={cn(
        // Hairline as an inset ring, not a border: a border sits inside the
        // 40px box and left 30px for the 32px segments, so the fill sat 4px
        // from the top but 2px from the bottom. The ring takes no space.
        "relative flex h-10 shrink-0 items-center gap-1 rounded-full bg-white p-1 ring-1 ring-inset ring-dc-hairline",
        stretch && "w-full"
      )}
    >
      <div
        aria-hidden
        style={
          indicator
            ? { transform: `translateX(${indicator.x}px)`, width: indicator.w }
            : { visibility: "hidden" }
        }
        className="absolute left-0 top-1 h-8 rounded-full bg-dc-purple"
      />
      {(
        [
          { value: "main", label: "Tracks", Icon: CalendarDays },
          { value: "hubs", label: "Community", Icon: Tent },
        ] as const
      ).map(({ value, label, Icon }) => {
        const active = source === value;
        return (
          <button
            key={value}
            ref={(el) => {
              buttonRefs.current.set(value, el);
            }}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(value)}
            className={cn(
              "relative z-10 flex h-8 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 text-[14px] leading-none transition-colors duration-150 ease-out",
              stretch && "flex-1",
              active
                ? "font-bold text-white"
                : "font-medium text-dc-muted hover:text-dc-fg2"
            )}
          >
            <Icon className="size-5 shrink-0" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Stands in for the programme switch while "My Interests" is on: that view
 * spans both programmes, so the switch would do nothing. A plain text label
 * (not a pill, which read as a button) in the switch's 40px slot, so the day
 * tabs do not jump when the toggle flips. leading-5, not leading-none: the
 * truncate's overflow clip cut the descenders at a 14px line box.
 */
function InterestsSpanNote({ stretch = false }: { stretch?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-10 min-w-0 shrink-0 items-center whitespace-nowrap text-[14px] leading-5 text-dc-muted",
        stretch ? "w-full justify-center" : "justify-end"
      )}
    >
      <span className="min-w-0 truncate">Showing Interests from both programmes</span>
    </div>
  );
}

/** Desktop side-panel slot: 360px panel + 16px gap, animated 0 ↔ this. */
const PANEL_SLOT_W = 376;

/** Pinned side-panel edge gap: the aside pins at 81px + --safe-top, 16px
 *  below the 65px desktop header; the bottom keeps the same 16px to the
 *  viewport edge so both ends of the panel match (same recipe as
 *  Speakers.tsx). */
const PANEL_EDGE_GAP = 16;

/**
 * Floating "Live now" (Figma "New-Live-Now-Button"): mobile's jump-to-now,
 * parked bottom-right above the tab bar where the list it acts on lives,
 * instead of among the header controls. Sits 16px above the tab bar via
 * its measured height (--nav-clearance, Nav.tsx), like every other
 * bottom-anchored control. py 11: the design's 40px is padding 12 with the
 * border inside; CSS adds it outside. The `before:` box extends the 40px
 * pill to a 44px tap target without changing its look.
 */
function LiveNowButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed right-4 bottom-[calc(var(--nav-clearance)+16px)] z-20 flex cursor-pointer phone-landscape:right-[max(16px,var(--safe-right))] phone-landscape:bottom-[calc(var(--nav-clearance)+max(16px,var(--safe-bottom)))] items-center gap-2 rounded-full border border-dc-hairline bg-white py-[11px] pl-[10px] pr-3 text-[14px] font-medium leading-none text-dc-red shadow-[0_1px_3px_rgba(22,11,43,0.1),0_1px_2px_rgba(22,11,43,0.1)] transition-colors duration-150 ease-out before:absolute before:-inset-0.5 before:content-[''] hover:bg-dc-live-bg lg:hidden"
    >
      <ClockArrowDown className="size-4 shrink-0" />
      Live now
    </button>
  );
}

/** The floating controls' drop shadow (Live now uses the same recipe). */
const FLOATING_SHADOW =
  "shadow-[0_1px_3px_rgba(22,11,43,0.1),0_1px_2px_rgba(22,11,43,0.1)]";

/**
 * Segmented control on its recessed track (Figma "Tabs"): the white pill
 * slides between segments; measured after render so it lands on the active
 * label's post-font-weight-swap width. Shared by the List/Timeline toggle
 * and the timeline zoom switch.
 */
function Segmented<T extends string | number>({
  value,
  onChange,
  items,
  iconOnly = false,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  items: readonly { value: T; label: string; Icon?: LucideIcon }[];
  /** Icons only, same 40px height: the floating copy next to Live now. */
  iconOnly?: boolean;
  /** Accessible name of the group. */
  label: string;
}) {
  const buttonRefs = useRef(new Map<T, HTMLButtonElement | null>());
  const [indicator, setIndicator] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  useLayoutEffect(() => {
    const el = buttonRefs.current.get(value);
    if (!el) return;
    setIndicator({
      x: el.offsetLeft,
      y: el.offsetTop,
      w: el.offsetWidth,
      h: el.offsetHeight,
    });
  }, [value]);
  // The pill's first position is not a move: without this, every mount
  // slid it from the first segment to the active one — the Sessions /
  // Community Hubs switch remounts the schedule, and both switches
  // wiggled on each programme change (tester report, 2026-10-13). Placed
  // with the transition off and the styles flushed, so the hidden →
  // placed step is the browser's "before" state, then the transition is
  // handed back for later moves. A layout effect with a forced flush, not
  // a passive effect: after a click React flushes passive effects before
  // the browser's next style pass, so an override set and removed between
  // two style passes never took effect and the slide ran anyway (the
  // first attempt did that; it showed as the wiggle coming back).
  const pillRef = useRef<HTMLDivElement | null>(null);
  const placedRef = useRef(false);
  useLayoutEffect(() => {
    const el = pillRef.current;
    if (!indicator || !el || placedRef.current) return;
    placedRef.current = true;
    el.style.setProperty("transition", "none");
    void el.offsetWidth;
    el.style.removeProperty("transition");
  }, [indicator]);

  return (
    <div
      role="group"
      aria-label={label}
      className="relative flex h-10 shrink-0 items-center gap-1 rounded-lg bg-dc-lavender p-1 shadow-[inset_0px_1px_1px_rgba(34,17,68,0.15),inset_0px_2px_4px_rgba(34,17,68,0.06)] lg:bg-dc-panel"
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
        ref={pillRef}
        className="absolute left-0 top-0 rounded-[4px] bg-white shadow-[0px_1px_3px_rgba(22,11,43,0.1),0px_1px_2px_rgba(22,11,43,0.1)] transition-[transform,width] duration-150 ease-out motion-reduce:transition-none"
      />
      {items.map(({ value: v, label: text, Icon }) => (
        <button
          key={v}
          ref={(el) => {
            buttonRefs.current.set(v, el);
          }}
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={cn(
            "relative z-10 flex min-h-8 cursor-pointer items-center gap-2 rounded-[4px] py-1 text-[14px] leading-none transition-colors",
            // Text-only segments ("1×") get wider sides for a finger-sized cell.
            iconOnly ? "px-2.5" : Icon ? "px-2" : "px-3",
            value === v
              ? "font-bold text-dc-purple"
              : "font-medium text-dc-muted hover:text-dc-fg2"
          )}
        >
          {Icon && <Icon className="size-5" />}
          <span className={cn(iconOnly && Icon && "sr-only")}>{text}</span>
        </button>
      ))}
    </div>
  );
}

const VIEW_ITEMS = [
  { value: "list", label: "List", Icon: List },
  { value: "timeline", label: "Timeline", Icon: CalendarRange },
] as const;

/** List/Timeline switch. */
function ViewToggle({
  view,
  onChange,
  iconOnly = false,
}: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
  iconOnly?: boolean;
}) {
  return (
    <Segmented
      value={view}
      onChange={onChange}
      items={VIEW_ITEMS}
      iconOnly={iconOnly}
      label="View"
    />
  );
}

const ZOOM_ITEMS = TIMELINE_ZOOMS.map((z) => ({ value: z, label: `${z}×` }));

/**
 * Timeline zoom switch (1× / 2×), on the view toggle's track. Only while
 * the timeline shows: it is that view's camera.
 */
function ZoomToggle({
  zoom,
  onChange,
}: {
  zoom: TimelineZoom;
  onChange: (z: TimelineZoom) => void;
}) {
  return (
    <Segmented
      value={zoom}
      onChange={onChange}
      items={ZOOM_ITEMS}
      label="Timeline zoom"
    />
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
 * app bar + 47px tab strip), 183px on desktop (65px nav + 65px toolbar +
 * 53px day bar).
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
  // Re-measured on rotation: the pin line moves with the header row.
  const phoneLandscape = useIsPhoneLandscape();
  // Re-observed when the tab pane comes back: a header that mounted while
  // the pane was display:none (a live-band change re-keys its segment) only
  // ever saw a 0×0 rect, so it needs a fresh first notification.
  const paneActive = usePaneActive();

  useEffect(() => {
    const el = sentinelRef.current;
    if (inPanel || !paneActive || !el) return;
    // The sentinel marks the header's natural position: once it crosses
    // above the pin line (1px past the breakpoint's sticky top offset =
    // app header (+ desktop toolbar) + day-tab strip, see the sticky
    // top-[103px]/[183px]),
    // the header is stuck. headerOffsetNow() carries the iOS status-bar
    // inset, matching the +var(--safe-top) in those sticky classes.
    // (Phone landscape: the header row is gone, headerOffsetNow() is the
    // status-bar inset alone and the tabs pin at the top — 47 + 1 again.)
    const pinLine = headerOffsetNow() + (isDesktop ? 119 : 48);
    // The root is everything below the pin line, not just the viewport
    // (the bottom margin runs far past any day's list): "intersecting" then
    // means "below the pin line" wherever the sentinel is, so pinning is a
    // state change the observer always reports. With the viewport as the
    // root, a sentinel that jumped from below the screen to above the pin
    // line in one frame (the live-now landing, the Live now pill, a
    // restored scroll) was "not intersecting" before and after, nothing
    // fired, and the header pinned with no fill — cards scrolled through
    // its text until it came back down into view (tester report,
    // 2026-10-13).
    const observer = new IntersectionObserver(
      ([entry]) => {
        // A hidden tab pane (display:none) reports a 0×0 rect that is "not
        // intersecting": ignore it, or every header flips to stuck while
        // another tab shows and flashes back on return.
        const r = entry.boundingClientRect;
        if (r.width === 0 && r.height === 0) return;
        setStuck(!entry.isIntersecting);
      },
      { rootMargin: `-${pinLine}px 0px 1000000px 0px` }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inPanel, paneActive, isDesktop, phoneLandscape]);

  return (
    <>
      <div ref={sentinelRef} aria-hidden />
      <header
        className={cn(
          "flex items-center justify-between gap-3",
          !inPanel &&
            "sticky top-[calc(103px+var(--safe-top))] z-10 phone-landscape:top-[calc(47px+var(--safe-top))] lg:top-[calc(183px+var(--safe-top))]",
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
 *
 * The view is one component for two programmes: the Pretalx schedule and, when
 * the event has one, the Community Hubs' (a separate store, see
 * schedule-source.tsx). The segment lives in the URL as `?hubs=1` so the home
 * card and deep links can open it; the list remounts on switch so day, filter
 * and scroll state start fresh for the other programme.
 */
export function Schedule() {
  // The Tracks/Community switch shows whenever the Community view has
  // anything in it: a hubs programme for this dataset, or community-led
  // sessions in the Pretalx schedule (src/data/programme.ts).
  const mainSessions = useStoreState(storeFor("main")).snapshot.sessions;
  const hasCls = useMemo(() => mainSessions.some(isCommunityLed), [mainSessions]);
  const hasCommunity = !!communityHubsDataset(getActiveDataset()) || hasCls;
  // List or timeline: kept here so it carries over a programme switch (the
  // inner view remounts) instead of snapping back to a default.
  const [view, setView] = useState<ViewMode>("list");
  // Timeline zoom (1× / 2×): kept above the keyed inner view for the same
  // reason, and remembered per device (the prefs table), so the app reopens
  // at the scale the person last read the grid at.
  const [zoom, setZoomState] = useState<TimelineZoom>(1);
  useEffect(() => {
    let cancelled = false;
    void readPref<TimelineZoom>(TIMELINE_ZOOM_PREF_KEY).then((v) => {
      if (!cancelled && v !== undefined && TIMELINE_ZOOMS.includes(v)) {
        setZoomState(v);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const setZoom = useCallback((z: TimelineZoom) => {
    setZoomState(z);
    void writePref(TIMELINE_ZOOM_PREF_KEY, z);
  }, []);
  const searchParams = useSearchParams();
  const hubsInUrl = hasCommunity && !!searchParams.get(HUBS_PARAM);
  const [source, setSource] = useState<ScheduleSource>(hubsInUrl ? "hubs" : "main");
  // A link into `/schedule?hubs=1` while the pane is mounted switches over;
  // the param disappearing (detail pages drop the query) does not switch back.
  // Adjusted during render (React's "state from props" pattern), not in an effect.
  const [seenHubsInUrl, setSeenHubsInUrl] = useState(hubsInUrl);
  if (hubsInUrl !== seenHubsInUrl) {
    setSeenHubsInUrl(hubsInUrl);
    if (hubsInUrl) setSource("hubs");
  }
  // Whether the once-per-app-open landing on "now" has happened. Lives here,
  // above the keyed inner view, so a programme switch (which remounts it)
  // does not land again: testers read that as the app forcing them to "now".
  const landedRef = useRef(false);
  const changeSource = useCallback((next: ScheduleSource) => {
    trackEvent("schedule", "programme", next);
    setSource(next);
    const url = new URL(window.location.href);
    if (next === "hubs") url.searchParams.set(HUBS_PARAM, "1");
    else url.searchParams.delete(HUBS_PARAM);
    window.history.replaceState(window.history.state, "", url.toString());
  }, []);
  return (
    <ScheduleSourceProvider source={source}>
      <ScheduleInner
        key={source}
        source={source}
        hasCommunity={hasCommunity}
        onSourceChange={changeSource}
        view={view}
        setView={setView}
        zoom={zoom}
        setZoom={setZoom}
        landedRef={landedRef}
      />
    </ScheduleSourceProvider>
  );
}

function ScheduleInner({
  source,
  hasCommunity,
  onSourceChange,
  view,
  setView,
  zoom,
  setZoom,
  landedRef,
}: {
  source: ScheduleSource;
  hasCommunity: boolean;
  onSourceChange: (s: ScheduleSource) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  zoom: TimelineZoom;
  setZoom: (z: TimelineZoom) => void;
  landedRef: RefObject<boolean>;
}) {
  const { sessions, isLoading, isError } = useSessions();
  // "My Interests" spans both programmes (see useScheduleState).
  const everySessions = useSessionsOfAllProgrammes();
  const { ids: interestedIds } = useInterested();
  const preview = usePreviewState();
  const { id: detailId, open: openDetail, close: closeDetail } =
    useDetailRoute("session");
  // `/schedule?interests=1` (the AI planner's apply page, deep links) opens
  // with My Interests on, also while the pane is already mounted; the toggle
  // keeps the param in step so the view can be shared (same pattern as ?hubs=1).
  const interestsInUrl = !!useSearchParams().get(INTERESTS_PARAM);
  const {
    now,
    days,
    visibleDays,
    dayCounts,
    totalMatches,
    selectedDay,
    userPickedDay,
    setSelectedDay,
    jumpToToday,
    search,
    setSearch,
    filters,
    toggleFilter,
    retainFilters,
    clearFilters,
    activeFilterCount,
    facetFilterCounts,
    communityOptions,
    visibleGroups,
    completedGroups,
    completedCount,
    interestedOnly,
    setInterestedOnly,
    filterOptions,
    daySessions,
    resultCount,
    anyLive,
  } = useScheduleState(sessions, interestedIds, undefined, everySessions, interestsInUrl);
  const [seenInterestsInUrl, setSeenInterestsInUrl] = useState(interestsInUrl);
  if (interestsInUrl !== seenInterestsInUrl) {
    setSeenInterestsInUrl(interestsInUrl);
    if (interestsInUrl) setInterestedOnly(true);
  }
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has(INTERESTS_PARAM) === interestedOnly) return;
    if (interestedOnly) url.searchParams.set(INTERESTS_PARAM, "1");
    else url.searchParams.delete(INTERESTS_PARAM);
    window.history.replaceState(window.history.state, "", url.toString());
  }, [interestedOnly]);
  // Stars that still match a session in this snapshot: a withdrawn talk's
  // star stays in Dexie, and counting it would promise "saved sessions on
  // other days" that no day shows. Over every programme, since My Interests
  // spans them all (useScheduleState).
  const savedSessionCount = useMemo(
    () => everySessions.reduce((n, s) => n + (interestedIds.has(s.id) ? 1 : 0), 0),
    [everySessions, interestedIds]
  );

  // Filter panel shape: the Community programme drops Tracks and leads with
  // Communities (hubs and community-led groups, from `communityOptions`);
  // My Interests spanning both programmes shows Tracks and Communities.
  // Locations shows in every mode (the hubs' own "rooms" excepted).
  const filterMode: FilterPanelMode =
    hasCommunity && interestedOnly ? "both" : source === "hubs" ? "hubs" : "main";

  // My Interests reshapes the panel (its Communities section comes and goes;
  // on the Community programme Tracks too), but selections outlive the
  // toggle: keep only what the new panel still shows, or a hidden pick
  // keeps filtering an empty list. Adjusted during render when the mode
  // changes (React's "state from props" pattern), not in an effect.
  const [seenFilterMode, setSeenFilterMode] = useState(filterMode);
  if (filterMode !== seenFilterMode) {
    setSeenFilterMode(filterMode);
    retainFilters({
      track: filterMode !== "hubs" ? filterOptions.track : [],
      community: filterMode === "main" ? [] : filterOptions.community,
      room: filterOptions.room,
      type: filterOptions.type,
      expertise: filterOptions.expertise,
      topic: filterOptions.topic,
    });
  }

  const isDesktop = useIsDesktop();
  // False while another tab pane is showing: header portals and window
  // measurements belong to the visible pane only (see TabPanes).
  const paneActive = usePaneActive();
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
  // The timeline's report of the time at its left edge (updated as it
  // scrolls); carried into the list's "top of the viewport" on a view toggle.
  const timelineLeftMsRef = useRef<number | null>(null);
  const [timelineScrollToTime, setTimelineScrollToTime] = useState<{
    ms: number;
    seq: number;
  } | null>(null);
  // Closing the drawer clears the query too (see useHeaderSearch).
  const headerSearch = useHeaderSearch(() => setSearch(""));
  const mainCardRef = useRef<HTMLDivElement | null>(null);
  // Desktop toolbar (search + switches): sticky, glass once pinned.
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const toolbarStuck = useStuckUnderHeader(toolbarRef);
  const asideRef = useRef<HTMLElement | null>(null);
  const groupRefs = useRef(new Map<string, HTMLElement | null>());

  // Two selections. The fullscreen session page is the URL (`/schedule/<id>`,
  // detailId, see routing/detailRoute.ts): mobile renders it as a layer over
  // the list, desktop in place of the list. The desktop side panel is local
  // state, like a native split view, so browsing sessions there never touches
  // history; the panel's expand action and shared links use the URL form.
  const [panelSessionId, setPanelSessionId] = useState<string | null>(null);
  const selectedSessionId = isDesktop ? panelSessionId : detailId;
  // Bumped on every new selection and keyed onto the panel, so each session
  // opens in a fresh panel: scrolled to the top (the panel's scroller kept
  // its position across sessions, 2026-10-14) and with its blurb folded
  // again (the panel content is retained through the exit transition, so
  // without this a reopen of the same session found the old instance).
  const [panelGeneration, setPanelGeneration] = useState(0);
  // Desktop: opening or closing the side panel reflows the list under the
  // pointer — 2-up time-slot rows collapse to one column and the main column
  // narrows — which carried the clicked card off to a new place (often off
  // screen). Remember where it was and, once the new layout is in, scroll
  // the page by the difference so the card stays put (y only: a card in a
  // right-hand 2-up cell still slides left as the row becomes one column).
  const holdCardRef = useRef<{ id: string; top: number } | null>(null);
  const cardEl = (id: string) =>
    mainCardRef.current?.querySelector<HTMLElement>(
      `[data-detail-id="${CSS.escape(id)}"]`
    ) ?? null;
  const selectSession = useCallback(
    (id: string | null) => {
      if (id) setFiltersOpen(false);
      if (isDesktop) {
        const anchor = id ?? panelSessionId;
        const el = anchor ? cardEl(anchor) : null;
        holdCardRef.current = el
          ? { id: anchor as string, top: el.getBoundingClientRect().top }
          : null;
        if (id && id !== panelSessionId) setPanelGeneration((g) => g + 1);
        setPanelSessionId(id);
      } else if (id) {
        openDetail(id);
      } else {
        closeDetail();
      }
    },
    [isDesktop, panelSessionId, openDetail, closeDetail]
  );
  useLayoutEffect(() => {
    const hold = holdCardRef.current;
    if (!hold) return;
    holdCardRef.current = null;
    const el = cardEl(hold.id);
    if (!el) return;
    const delta = el.getBoundingClientRect().top - hold.top;
    if (Math.abs(delta) >= 1) window.scrollBy({ top: delta, behavior: "auto" });
  }, [panelSessionId]);

  // Looked up across both programmes: with My Interests on, the list shows
  // the other programme's starred sessions too, and a lookup in this
  // programme's list alone found nothing, so the side panel never opened
  // (or closed) for them.
  const selectedSession = useMemo(
    () =>
      selectedSessionId
        ? (everySessions.find((s) => s.id === selectedSessionId) ?? null)
        : null,
    [everySessions, selectedSessionId]
  );
  const routeSession = useMemo(
    () => (detailId ? (everySessions.find((s) => s.id === detailId) ?? null) : null),
    [everySessions, detailId]
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
    programmaticScrollRef.current = true;
    jumpToToday();
    if (view === "timeline") {
      // The timeline scrolls itself (horizontally to the now line) on signal.
      setTimelineJumpSignal((n) => n + 1);
      return;
    }
    revealAllGroups();
    setListJumpSignal((n) => n + 1);
  };
  // No useTabReselect here: re-tapping the Schedule tab used to jump to
  // "now" and testers read it as a bug (the app moving them on its own). It
  // now gets the default pane reset, an instant scroll to the top; the Live
  // now pill and the day bar's ghost pill are the way back to "now".

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

  // Day tab tap: every day starts at the top of its list (the timeline at
  // the day's start), today included — it used to land on "live now", one
  // more automatic jump testers read as the app moving them; the Live now
  // pill does that on request. Instant, not smooth: a tab is a new page, and
  // a smooth scroll through content that just changed reads as scrolling
  // the wrong day.
  const selectDay = (key: string) => {
    programmaticScrollRef.current = true;
    setSelectedDay(key);
    setDayJump((prev) => ({ n: (prev?.n ?? 0) + 1, key }));
  };
  // A filter pick from the panel. Turning on a community-led group also
  // selects the first day it runs on (as a day-tab tap would), unless the
  // active day already has its sessions, so the pick shows something instead
  // of an empty day; the hubs leave the day alone (Scott, 2026-10-27).
  const toggleFilterFromPanel = (facet: FilterFacet, value: string) => {
    toggleFilter(facet, value);
    if (facet !== "community" || filters.community.includes(value)) return;
    const ref = communityOptions.find((c) => c.key === value);
    if (!ref || ref.section !== "cls" || ref.days.length === 0) return;
    if (selectedDay !== null && ref.days.includes(selectedDay)) return;
    const day = ref.days[0];
    if (days.some((d) => d.key === day)) selectDay(day);
  };
  useLayoutEffect(() => {
    if (!dayJump) return;
    // The timeline resets its horizontal offset on signal.
    if (view === "timeline") setTimelineStartSignal((n) => n + 1);
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

  // View toggle. Into the timeline: the grid pans (horizontally, its own
  // scroll) to the time of the group at the top of the list, so the page
  // itself does not move. Into the list: the page stays where it is too —
  // it used to jump down to the group at the timeline's left-edge time,
  // which from a timeline sitting at the top of the page read as the app
  // moving the person (tester report, 2026-10-13); the list only pulls the
  // page up to its start if the content top had scrolled under the tabs.
  const changeView = (next: ViewMode) => {
    if (next === view) return;
    programmaticScrollRef.current = true;
    if (next === "timeline") {
      // Batched with setView: the timeline mounts with the target already set
      // and positions itself in its own layout effect, before paint.
      const t = topVisibleGroupStartMs();
      if (t != null) {
        setTimelineScrollToTime((prev) => ({
          ms: t,
          seq: (prev?.seq ?? 0) + 1,
        }));
      }
    }
    trackEvent("schedule", "view", next);
    setView(next);
  };
  const viewMountedRef = useRef(false);
  useLayoutEffect(() => {
    if (!viewMountedRef.current) {
      viewMountedRef.current = true; // mount: the landing effect decides
      return;
    }
    scrollListTop();
  }, [view]);

  // Landing: the first time the selected day's content is actually in the
  // DOM (sessions loaded, day resolved), jump straight to "live now",
  // instantly, before paint, so the list never visibly starts at the top.
  // Once per app open: the flag lives in the parent (above the programme
  // switch's remount) and the pane stays mounted across tab switches
  // (TabPanes restores the scroll position). A later mount — the other
  // programme — starts at the top of its list instead.
  const contentReady =
    selectedDay !== null &&
    (view === "list"
      ? visibleGroups.length > 0 || completedGroups.length > 0
      : daySessions.length > 0);
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
  const placedRef = useRef(false);
  useLayoutEffect(() => {
    // Only while the list is on screen: scrollIntoView on a hidden
    // (display:none) element is a no-op that would still consume the landing.
    if (placedRef.current || !contentReady || !listVisible) return;
    placedRef.current = true;
    if (landedRef.current) {
      // Remounted after a programme switch: the document is still scrolled
      // to wherever the previous list was, so start this one at its top.
      scrollListTop();
      return;
    }
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

  // Timeline's horizontal offset, reported by the grid as it scrolls.
  const timelineScrollLeftRef = useRef(0);

  // Mobile timeline: the app header (Search / My Interests / Filter) folds
  // away once the day tabs have pinned and the user keeps scrolling down —
  // the dense grid wants the height — and comes back on the first scroll
  // up, or when the tabs unpin. Published as <html data-app-header-hidden>
  // for AppHeader (outside this tree); DayTabs and the timeline's axis take
  // the flag as a prop and re-pin 56px higher on the same clock. Own
  // jumps (Live now, day tabs, view toggle) are not "scrolling down": the
  // flag skips the scroll frame they cause.
  const programmaticScrollRef = useRef(false);
  const [scrollChromeHidden, setChromeHidden] = useState(false);
  // Phone in landscape: the header row and the bottom tab bar are gone for
  // as long as the list shows (both views — the day tabs carry the header's
  // pills, see `landscapeControls`; the bar is back on rotating upright),
  // published as <html data-app-chrome-off> for AppHeader, Nav, the page
  // layout's bottom padding and the offset math; the scroll fold below
  // stays out of it. (Feedback round, 2026-10-13: the mock has the tabs at
  // the very top, the grid under them, the short viewport to the content.)
  const phoneLandscape = useIsPhoneLandscape();
  const headerOff = phoneLandscape && listVisible && !detailId && !isDesktop;
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute(APP_CHROME_OFF_ATTR, headerOff);
    return () => root.removeAttribute(APP_CHROME_OFF_ATTR);
  }, [headerOff]);
  // Not under a session page: the layer locks the page scroll, so a header
  // hidden at the moment of the tap would have no scroll to bring it back.
  const chromeCollapsible =
    listVisible &&
    !detailId &&
    !isDesktop &&
    !phoneLandscape &&
    view === "timeline" &&
    resultCount > 0;
  const chromeHidden = headerOff || scrollChromeHidden;
  useEffect(() => {
    if (!chromeCollapsible) {
      setChromeHidden(false);
      return;
    }
    let raf = 0;
    let lastY = window.scrollY;
    const measure = () => {
      raf = 0;
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      if (programmaticScrollRef.current) {
        programmaticScrollRef.current = false;
        return;
      }
      // Day tabs pinned: the content area's top has reached the bottom of
      // the header + tab strip (56 + 47; it only gets higher from there).
      const content = contentRef.current;
      const tabsPinned =
        !!content &&
        content.getBoundingClientRect().top <= headerOffsetNow() + 48;
      if (!tabsPinned || dy < -2) setChromeHidden(false);
      else if (dy > 2) setChromeHidden(true);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      setChromeHidden(false);
    };
  }, [chromeCollapsible]);
  // Both flags in one layout effect: when the fold disarms (a session page
  // opens, the view changes) the header must be back instantly, not slide
  // in over the new page. Before paint, so no frame shows the page without
  // its bar; and the animate flag is dropped and the style flushed BEFORE
  // the transform changes — engines differ on whether a transition removed
  // in the same style change still runs (WebKit ran it).
  useLayoutEffect(() => {
    const root = document.documentElement;
    const reset = () => {
      root.removeAttribute("data-app-header-animates");
      void root.offsetHeight; // flush: transition-property is none now
      root.removeAttribute("data-app-header-hidden");
    };
    if (!chromeCollapsible) {
      reset();
      return;
    }
    root.setAttribute("data-app-header-animates", "");
    root.toggleAttribute("data-app-header-hidden", scrollChromeHidden);
    return reset;
  }, [chromeCollapsible, scrollChromeHidden]);

  // Mobile list/timeline toggle sits next to the "Sessions" heading (design).
  // Once that row has scrolled under the pinned day tabs, a floating copy
  // takes the bottom-left corner, opposite the Live now pill, so the view
  // stays switchable mid-list. Observed like GroupHeader's pin line; the
  // row is display:none on desktop (0×0 rect) and never trips it there.
  const viewRowRef = useRef<HTMLDivElement | null>(null);
  const [viewRowScrolledOut, setViewRowScrolledOut] = useState(false);
  const hasViewRow = resultCount > 0;
  useEffect(() => {
    const el = viewRowRef.current;
    if (!el || !listVisible || isDesktop) {
      setViewRowScrolledOut(false);
      return;
    }
    const pinLine = headerOffsetNow() + 47;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const r = entry.boundingClientRect;
        if (r.width === 0 && r.height === 0) return;
        setViewRowScrolledOut(!entry.isIntersecting && r.top < pinLine);
      },
      { rootMargin: `-${pinLine}px 0px 0px 0px` }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [listVisible, isDesktop, hasViewRow]);

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
      key={panelGeneration}
      session={selectedSession}
      onClose={() => selectSession(null)}
      // Desktop only: on phones this aside is mounted but hidden, and the
      // fullscreen page already runs the session's feed (one SSE stream each).
      showQa={isDesktop && listVisible}
    />
  ) : filtersOpen ? (
    // Same growth var as the details panels: the filter column keeps
    // PANEL_EDGE_GAP to the viewport bottom while pinned. The fallback
    // matches the resting 141px natural offset + that 16px clearance.
    <div className="flex max-h-[var(--schedule-panel-max-h,calc(100dvh-157px-var(--safe-top)))] min-h-0 flex-col">
      <FilterPanelContent
        options={filterOptions}
        filters={filters}
        onToggle={toggleFilterFromPanel}
        onClear={clearFilters}
        onClose={() => setFiltersOpen(false)}
        defaultOpen
        mode={filterMode}
        communities={communityOptions}
      />
    </div>
  ) : null;
  const lastPanelContentRef = useRef<React.ReactNode>(null);
  if (livePanelContent) lastPanelContentRef.current = livePanelContent;
  const panelContent = livePanelContent ?? lastPanelContentRef.current;
  // Facet filters only — search and Interested have their own pills now.
  const facetFilterTotal = Object.values(facetFilterCounts).reduce(
    (n, c) => n + (c ?? 0),
    0
  );
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
          "scroll-mt-[calc(112px+var(--safe-top))] lg:scroll-mt-[calc(192px+var(--safe-top))]"
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
        <HeaderToolbar
          headerOff={headerOff}
          kind="session"
          searchLabel="Search sessions"
          searchOpen={headerSearch.searchOpen}
          searchActive={headerSearch.searchOpen}
          onToggleSearch={headerSearch.toggleSearch}
          interestedOnly={interestedOnly}
          interestedCount={interestedIds.size}
          onToggleInterested={() => setInterestedOnly((v) => !v)}
          filterCount={facetFilterTotal}
          filtersOpen={filtersOpen}
          onOpenFilters={openFilters}
        />
      )}
      {/* Only while something is live (Scott: no pill when nothing is on),
          and regardless of the filtered list being empty — with a filter
          on and a matchless day showing, it is the way back to today. */}
      {!detailId && paneActive && anyLive && (
        <LiveNowButton onClick={jumpToNow} />
      )}
      {/* Floating mobile controls, bottom-left opposite Live now: the
          list/timeline toggle once the in-flow one has scrolled away (kept
          mounted for the 150ms fade; inert while hidden), and in timeline
          view the zoom switch, always there — alone at the left edge until
          the toggle appears, then sliding right to make room: the toggle's
          clipping wrapper grows from 0 to its width on the fade's clock (its
          padding + negative margins keep the drop shadow inside the clip).
          Same bottom as Live now: 16px above the tab bar's measured height. */}
      {!detailId && paneActive && hasViewRow && (
        <div className="fixed bottom-[calc(var(--nav-clearance)+16px)] left-4 z-20 flex items-center phone-landscape:left-[max(16px,var(--safe-left))] phone-landscape:bottom-[calc(var(--nav-clearance)+max(16px,var(--safe-bottom)))] lg:hidden">
          <div
            aria-hidden={!viewRowScrolledOut}
            inert={!viewRowScrolledOut || undefined}
            className={cn(
              "-mx-1 -mb-1 -mt-0.5 overflow-hidden px-1 pb-1 pt-0.5 transition-[opacity,transform,max-width] duration-150 ease-out motion-reduce:transition-none",
              viewRowScrolledOut
                ? "max-w-28 translate-y-0 opacity-100"
                : "pointer-events-none max-w-0 translate-y-2 opacity-0"
            )}
          >
            <div className={cn(FLOATING_SHADOW, "rounded-lg", view === "timeline" && "mr-2")}>
              <ViewToggle view={view} onChange={changeView} iconOnly />
            </div>
          </div>
          {view === "timeline" && (
            <div className={cn(FLOATING_SHADOW, "rounded-lg")}>
              <ZoomToggle zoom={zoom} onChange={setZoom} />
            </div>
          )}
        </div>
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

      {/* Desktop: full-bleed under the app header, above the page title, in
          flow (the main column below is width-capped, so it sits outside).
          Gone with the list while a session page takes its place. */}
      {!(isDesktop && detailId) && <BetaBanner className="hidden lg:flex" />}

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
        {/* Desktop page title, with the programme switch beside it: it
            changes the whole page (list, filters, day set), so it sits at
            page level rather than among the list's toolbar controls. */}
        <div className="hidden items-center justify-between gap-4 pb-4 pt-8 lg:flex">
          <h1 className="text-[24px] font-extrabold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
            Schedule
          </h1>
          {hasCommunity &&
            (interestedOnly ? (
              <InterestsSpanNote />
            ) : (
              <SourceToggle source={source} onChange={onSourceChange} />
            ))}
        </div>

        {/* No gap here — the animated aside carries the 16px gutter (pl-4). */}
        <div className="lg:flex lg:items-start">
          {/* Main panel */}
          <div
            ref={mainCardRef}
            className="min-w-0 lg:flex-1 lg:rounded-xl lg:border lg:border-dc-hairline lg:shadow-[0px_1px_2px_rgba(22,11,43,0.04)]"
          >
            {/* Desktop: search + view toggle toolbar. Sticky under the app
                header, with the day tabs pinning right beneath it (the
                Speakers page's two-row stack): search and the view switch
                stay in reach mid-list. 65px tall (12 + 40 +
                12 + 1px border), which every desktop offset below the day
                tabs adds (DayTabs' lg:top, GroupHeader, the scroll margins).
                Pinned, it swaps to the app header's glass and squares its
                corners, like the Speakers toolbar. */}
            <div
              ref={toolbarRef}
              className={cn(
                "z-20 hidden items-center justify-between gap-3 border-b border-dc-hairline px-4 py-3 lg:sticky lg:top-[calc(65px+var(--safe-top))] lg:flex",
                toolbarStuck
                  ? "bg-white/75 backdrop-blur-[4px]"
                  : "bg-white lg:rounded-t-xl"
              )}
            >
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search by session, speaker or topic"
                className="w-[348px]"
                resultCount={totalMatches}
              />
              <div className="flex items-center">
                <ViewToggle view={view} onChange={changeView} />
                {/* The zoom switch stays mounted and slides in beside the
                    toggle when the timeline shows — 150ms ease-out like the
                    floating controls, the exit a touch quicker; the clipping
                    wrapper grows from 0 to its width and carries the 12px
                    gap so a hidden switch leaves no gap behind. */}
                <div
                  aria-hidden={view !== "timeline"}
                  inert={view !== "timeline" || undefined}
                  className={cn(
                    "overflow-hidden transition-[opacity,transform,max-width,margin] ease-out motion-reduce:transition-none",
                    view === "timeline"
                      // 112px cap: the switch is ~96px, and the clip must
                      // never cut it where a fallback × glyph runs wider.
                      ? "ml-3 max-w-28 translate-x-0 opacity-100 duration-150"
                      : "pointer-events-none ml-0 max-w-0 -translate-x-1 opacity-0 duration-100"
                  )}
                >
                  <ZoomToggle zoom={zoom} onChange={setZoom} />
                </div>
              </div>
            </div>

            {/* Mobile search, in flow: opening it pushes the day tabs and the
                list down instead of covering the tabs (the header overlay left
                no way to switch days mid-search). Not sticky — it scrolls away
                with the page, so DayTabs still pins at 56px and every
                hardcoded offset (103/112px group headers, timeline axis) stays
                valid. Unmounted under a detail page (the session page owns the
                header) and in hidden panes: one #header-search-panel in the
                DOM at a time (Speakers portals its own). */}
            {!detailId && paneActive && (
              <SearchDrawerPanel
                open={headerSearch.searchOpen}
                onClose={headerSearch.closeSearch}
                value={search}
                onChange={setSearch}
                placeholder="Search by session, speaker or topic"
                inputRef={headerSearch.inputRef}
                drawerRef={headerSearch.drawerRef}
                resultCount={totalMatches}
              />
            )}

            {/* Mobile: programme switch on the day bar's lavender, in flow
                right above the day tabs so the two read as one block of
                programme navigation (an open search drawer sits above it,
                against the header). It scrolls away with the page like the
                search does; DayTabs alone pins. */}
            {hasCommunity && !detailId && (
              <div className="bg-dc-lavender px-4 pb-1 pt-3 lg:hidden">
                {interestedOnly ? (
                  <InterestsSpanNote stretch />
                ) : (
                  <SourceToggle source={source} onChange={onSourceChange} stretch />
                )}
              </div>
            )}

            {/* Day tabs (sticky under the mobile header) + desktop controls */}
            <DayTabs
              days={visibleDays}
              counts={dayCounts}
              selectedDay={selectedDay}
              onSelect={selectDay}
              raised={chromeHidden}
              // Desktop: pins under the sticky toolbar above (65px nav +
              // 65px toolbar).
              stackedUnderToolbar
              // Phone landscape: the header's pills, opposite the dates.
              // Only this copy listens for the "+1" bubble there; the
              // header copy is display:none with its row.
              landscapeControls={
                !detailId && (
                  <ToolbarPills
                    kind="session"
                    layout="row"
                    pulseEnabled={paneActive && headerOff}
                    searchLabel="Search sessions"
                    searchOpen={headerSearch.searchOpen}
                    searchActive={headerSearch.searchOpen}
                    onToggleSearch={headerSearch.toggleSearch}
                    interestedOnly={interestedOnly}
                    interestedCount={interestedIds.size}
                    onToggleInterested={() => setInterestedOnly((v) => !v)}
                    filterCount={facetFilterTotal}
                    filtersOpen={filtersOpen}
                    onOpenFilters={openFilters}
                  />
                )
              }
            >
              <InterestedPill
                kind="session"
                active={interestedOnly}
                count={interestedIds.size}
                onToggle={() => setInterestedOnly((v) => !v)}
              />
              <button onClick={jumpToNow} className={ghostPill}>
                <ClockArrowDown className="size-4" />
                Live now
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

            {/* Mobile: under the pinned day tabs, in flow, so it scrolls away. */}
            <BetaBanner className="flex lg:hidden" />

            {/* Content area: brand-neutrals/50 surface on desktop (Figma) */}
            <div
              ref={contentRef}
              className={cn(
                "px-4 pt-6 lg:rounded-b-xl lg:bg-dc-panel lg:pb-6",
                // Phone landscape: the gutters grow to the notch's inset
                // (16px where there is none).
                "phone-landscape:pl-[max(16px,var(--safe-left))] phone-landscape:pr-[max(16px,var(--safe-right))]",
                // Scroll target for day-tab "top" (see scrollListTop); same
                // pinned-tabs clearance as the group headers.
                "scroll-mt-[calc(112px+var(--safe-top))] phone-landscape:scroll-mt-[calc(56px+var(--safe-top))] lg:scroll-mt-[calc(192px+var(--safe-top))]",
                // Mobile timeline sits flush on the panel-grey underlay (see
                // the timeline branch); the layout's nav clearance is the
                // only gap left below it.
                view === "timeline" ? "pb-0" : "pb-6"
              )}
            >
              {/* Mobile: "Sessions" heading + view toggle. */}
              {hasViewRow && (
                <div
                  ref={viewRowRef}
                  className="mb-3 flex items-center justify-between gap-3 lg:hidden"
                >
                  <h2 className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg">
                    Sessions
                  </h2>
                  <ViewToggle view={view} onChange={changeView} />
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

              {/* My Interests: the standing reminders offer (the third-star
                  sheet asks only once). Only over a non-empty list. */}
              {interestedOnly && resultCount > 0 && (
                <RemindersNudgeRow className="mb-5" />
              )}

              {preview === "loading" || (isLoading && sessions.length === 0) ? (
                <ListLoadState kind="schedule" state="loading" />
              ) : preview === "failed" || isError ? (
                <ListLoadState kind="schedule" state="error" />
              ) : preview === "unpublished" || sessions.length === 0 ? (
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
                  interestsOnly={interestedOnly && activeFilterCount === 1}
                  interestedCount={savedSessionCount}
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
                  headerRaised={chromeHidden}
                  zoom={zoom}
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
          onToggle={toggleFilterFromPanel}
          onClear={clearFilters}
          mode={filterMode}
          communities={communityOptions}
        />
      )}
    </main>
  );
}
