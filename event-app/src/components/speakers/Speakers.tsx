"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CircleX, ListFilter, Search, Star } from "lucide-react";
import cn from "classnames";
import { HEADER_ACTIONS_ID } from "@/components/AppHeader";
import { InterestedPill } from "@/components/ActionPills";
import {
  SearchInput,
  scrollToTopAndFocusSearch,
} from "@/components/SearchInput";
import { useInterestedSpeakers } from "@/data/interested/useInterestedSpeakers";
import {
  useIsDesktop,
  isDesktopNow,
  headerOffsetNow,
} from "@/hooks/useIsDesktop";
import { useSpeakersData, type DecoratedSpeaker } from "./useSpeakersData";
import { useSpeakersState } from "./useSpeakersState";
import { SpeakerCard } from "./SpeakerCard";
import { TopicPills } from "./TopicPills";
import { TypeTabs, typeLabel } from "./TypeTabs";
import { TopicSheet } from "./TopicSheet";
import { SpeakersFilterStatusBar } from "./SpeakersFilterStatusBar";
import { SpeakersEmptyState } from "./SpeakersEmptyState";
import { AzIndexRail, KEYNOTE_SECTION } from "./AzIndexRail";
import { SpeakerDetailsPanel } from "./SpeakerDetailsPanel";

/** Desktop side-panel slot: 360px panel + 16px gap, animated 0 ↔ this. */
const PANEL_SLOT_W = 376;

/** Pinned side-panel edge gap: the aside pins at top-[81px], 16px below the
 *  65px desktop header; the bottom keeps the same 16px to the viewport edge
 *  so both ends of the panel match. Keep the aside's sticky top equal to
 *  65 + this, or the two ends drift apart. */
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
 * Page-specific app-header buttons, portaled into AppHeader's target (mobile):
 * the scroll-revealed search and interested circles and the topic-filter
 * button with its active count bubble. The star stays filled (matching
 * InterestedPill); the lavender circle fill carries the active state.
 */
function HeaderActions({
  revealed,
  onSearch,
  interestedOnly,
  onToggleInterested,
  filterCount,
  onOpenFilters,
}: {
  revealed: boolean;
  onSearch: () => void;
  interestedOnly: boolean;
  onToggleInterested: () => void;
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
            aria-label="Search speakers"
            className={cn(
              headerCircle,
              headerCircleResting,
              !revealed && "pointer-events-none opacity-0"
            )}
          >
            <Search className="size-4 text-dc-purple" />
          </button>
          <button
            onClick={onToggleInterested}
            aria-label="Show interested speakers"
            aria-pressed={interestedOnly}
            className={cn(
              headerCircle,
              interestedOnly ? headerCircleActive : headerCircleResting,
              // Hidden only while it would duplicate the on-screen pill. Once
              // the filter is ON it stays put even unrevealed, because it is
              // then the active-state indicator *and* the way to clear it:
              // filtering to interested-only empties the list for anyone with
              // no stars yet, which collapses the page back to the top and
              // would otherwise fade out the very control just pressed (it
              // read as "the star does nothing"). Same rule as the topic
              // filter button, which is never gated for carrying state.
              !revealed && !interestedOnly && "pointer-events-none opacity-0"
            )}
          >
            <Star className="size-4 text-dc-purple" fill="currentColor" />
          </button>
          <button
            onClick={onOpenFilters}
            aria-label="Filter by topic"
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

/**
 * Redesigned speakers view (Figma "PWA / Speakers"). One combined view:
 * white panel (search toolbar, topic pills, format tabs) over a dc-panel
 * list sectioned Keynote → # → A–Z, with the letter rail always present on
 * the right (keynote mic cell on top). Filters/search keep the sections and
 * rail, just built from the filtered set (absent letters disable in the
 * rail). Speaker details open in a 360px right column; mobile navigates to
 * /speakers/[id] instead. All data derives from the cached speakers ×
 * sessions join (offline-safe).
 */
export function Speakers() {
  const {
    decorated,
    byId,
    topicOptions,
    typeOptions,
    isLoading,
    isError,
    error,
  } = useSpeakersData();
  // Single interested subscription for the whole page — memoized cards get
  // plain `interested`/`onToggleInterested` props instead of each running
  // their own SWR hook.
  const { ids: interestedIds, toggle: toggleInterestedSpeaker } =
    useInterestedSpeakers();
  const {
    search,
    setSearch,
    topics,
    toggleTopic,
    type,
    setType,
    interestedOnly,
    setInterestedOnly,
    clearAll,
    activeFilterCount,
    resultCount,
    keynoteSpeakers,
    letterGroups,
    letters,
  } = useSpeakersState(decorated, interestedIds);

  const isDesktop = useIsDesktop();
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string | null>(
    null
  );
  const [topicSheetOpen, setTopicSheetOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const searchBlockRef = useRef<HTMLDivElement | null>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);
  const letterRefs = useRef(new Map<string, HTMLElement | null>());
  const mainCardRef = useRef<HTMLDivElement | null>(null);
  const stickyRowsRef = useRef<HTMLDivElement | null>(null);
  const railStickyRef = useRef<HTMLDivElement | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);
  const [rowsStuck, setRowsStuck] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Reveal the header's star circle once the search block scrolls away.
  useEffect(() => {
    const el = searchBlockRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { rootMargin: "-56px 0px 0px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const clearTopics = useCallback(() => {
    // toggleTopic uses functional updates, so successive calls compose.
    topics.forEach((t) => toggleTopic(t));
  }, [topics, toggleTopic]);

  // Desktop side panel selection, mirrored to ?speaker= for shareability.
  // The ref mirrors the state so card callbacks can stay referentially
  // stable (memoized cards would otherwise re-render on every selection).
  const selectedIdRef = useRef<string | null>(null);
  const selectSpeaker = useCallback((id: string | null) => {
    selectedIdRef.current = id;
    setSelectedSpeakerId(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("speaker", id);
    else url.searchParams.delete("speaker");
    window.history.replaceState(null, "", url.toString());
  }, []);
  // Clicking the already-selected card closes the panel.
  const onOpenCard = useCallback(
    (id: string) => selectSpeaker(id === selectedIdRef.current ? null : id),
    [selectSpeaker]
  );
  useEffect(() => {
    // Desktop-only: selection renders in the side panel there. On mobile the
    // highlight has no clear affordance (details live on /speakers/[id]), so
    // restoring it would pin one card purple forever.
    if (!isDesktopNow()) return;
    const id = new URLSearchParams(window.location.search).get("speaker");
    if (id) {
      selectedIdRef.current = id;
      setSelectedSpeakerId(id);
    }
  }, []);

  // Crossing below lg leaves the selection with no panel and no deselect
  // affordance (one card permanently lavender, stale ?speaker=) — clear it.
  useEffect(() => {
    if (!isDesktop && selectedSpeakerId) selectSpeaker(null);
  }, [isDesktop, selectedSpeakerId, selectSpeaker]);

  // The sheet only exists below lg; a stale open flag would otherwise pop it
  // open uninvited when the viewport narrows back.
  useEffect(() => {
    if (isDesktop) setTopicSheetOpen(false);
  }, [isDesktop]);

  const selectedSpeaker = useMemo(
    () => (selectedSpeakerId ? (byId.get(selectedSpeakerId) ?? null) : null),
    [byId, selectedSpeakerId]
  );

  const sidePanelOpen = isDesktop && !!selectedSpeaker;

  // Side-panel content, kept mounted through the 300ms exit transition so the
  // closing panel doesn't collapse into an empty box.
  const livePanelContent = selectedSpeaker ? (
    <SpeakerDetailsPanel
      decorated={selectedSpeaker}
      onClose={() => selectSpeaker(null)}
    />
  ) : null;
  const lastPanelContentRef = useRef<React.ReactNode>(null);
  if (livePanelContent) lastPanelContentRef.current = livePanelContent;
  const panelContent = livePanelContent ?? lastPanelContentRef.current;

  // Rail/spy section order: the keynote section leads when present, then the
  // letter groups (# first, then A–Z) — all derived from the filtered set.
  const sections = useMemo(
    () =>
      keynoteSpeakers.length > 0 ? [KEYNOTE_SECTION, ...letters] : letters,
    [keynoteSpeakers.length, letters]
  );

  // While a click-jump's smooth scroll is in flight, the scroll-spy would
  // walk the pill letter-by-letter through everything it passes. Instead the
  // pill goes straight to the clicked letter and the spy stays muted until it
  // agrees (or a fallback timeout fires — e.g. the user interrupts the scroll,
  // or the target section can't reach the spy line near the page bottom).
  const spyTargetRef = useRef<string | null>(null);
  const spyTimeoutRef = useRef(0);

  const jumpToSection = useCallback((section: string) => {
    const el = letterRefs.current.get(section);
    if (!el) return;
    spyTargetRef.current = section;
    setActiveSection(section);
    window.clearTimeout(spyTimeoutRef.current);
    spyTimeoutRef.current = window.setTimeout(() => {
      spyTargetRef.current = null;
    }, 1500);
    // Measured landing offset: the pinned filter rows vary by breakpoint
    // (TypeTabs alone on mobile; TopicPills + TypeTabs on desktop), so a
    // static scroll-mt can't clear them. Land 16px below the rows — above
    // the spy line (rows + 100), so the spy-resume handshake still fires.
    const rowsH = stickyRowsRef.current?.getBoundingClientRect().height ?? 0;
    const top =
      el.getBoundingClientRect().top +
      window.scrollY -
      (headerOffsetNow() + rowsH + 16);
    // Instant, not smooth: a smooth jump animates the viewport through every
    // screen between here and the target, and this list is ~98 viewports tall
    // (82,000px for DC7's 746 speakers). WebKit tile-rasterizes everything it
    // passes over — with 2,200+ inline SVGs and the sticky backdrop-filter
    // rows recomposited the whole way — so tapping several letters quickly
    // stacked up sweeps until iOS killed the content process (PR #112: "the
    // app crashes if you click multiple letters quickly"). Teleporting paints
    // only the destination, and matches how native iOS A–Z index bars behave.
    window.scrollTo({ top, behavior: "auto" });
  }, []);

  // Scroll-linked chrome, measured on one rAF-throttled listener:
  // - glass recipe on the format tabs once the filter rows pin,
  // - the A–Z rail stretching to fill the viewport while pinned (and back to
  //   its compact stack at the top), plus the topmost-letter scroll-spy,
  // - the side panel growing to keep a 32px gap to the viewport bottom.
  // Heights/vars mutate the DOM directly so per-frame scrolling doesn't
  // re-render the (large) speaker list; only the rare boolean/letter flips do.
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const headerOffset = headerOffsetNow();
      const viewportH = window.visualViewport?.height ?? window.innerHeight;

      // --- Read phase: all layout reads before any write, so the writes
      // below can't force a reflow between measurements. ---
      // The pinned header rows sit above the rail and the section headings,
      // so every "top of viewport" line below starts under them.
      const rowsRect = stickyRowsRef.current?.getBoundingClientRect();
      const rowsH = rowsRect?.height ?? 0;
      const pinnedOffset = headerOffset + rowsH;

      const rail = railStickyRef.current;
      // Measure the rail's CONTAINER, never the rail itself. The sticky offset
      // is written further down in this same function, so on the first run
      // after mount `top` is still unset and a sticky element with no offset
      // reports its *static* position — ~30,000px above the viewport when the
      // page loads already scrolled (reload deep in the list). That fed a
      // 30,631px height into the cell stack, spreading the 28 letters so far
      // apart that only one stayed on screen. The container's box is always
      // truthful, and a sticky child sits at max(pinnedOffset, containerTop).
      const colRect = rail?.parentElement?.getBoundingClientRect();
      const colTop = colRect?.top ?? 0;
      const colBottom = colRect?.bottom ?? Infinity;

      // Scroll-spy read: the key of the topmost section in view. Sections
      // render in `sections` order, so take the last one above the spy line.
      let spySection: string | null = null;
      if (rail) {
        for (const section of sections) {
          const el = letterRefs.current.get(section);
          if (!el) continue;
          if (el.getBoundingClientRect().top <= pinnedOffset + 100)
            spySection = section;
          else break;
        }
      }

      const aside = asideRef.current;
      const asideTop =
        aside && sidePanelOpen ? aside.getBoundingClientRect().top : null;
      const cardBottom =
        asideTop !== null
          ? (mainCardRef.current?.getBoundingClientRect().bottom ?? Infinity)
          : Infinity;

      // --- Write phase. ---
      setRowsStuck(rowsRect !== undefined && rowsRect.top <= headerOffset + 1);

      if (rail) {
        // The rail pins just below the filter rows, whose height varies by
        // breakpoint — position it directly rather than via static classes.
        rail.style.top = `${pinnedOffset}px`;
        // Compact = the natural cell stack (24px cells + 8px paddings):
        // 26 letters + the keynote cell + the optional "#" cell.
        const compact = (sections.includes("#") ? 28 : 27) * 24 + 16;
        // visualViewport catches browser-chrome overlays innerHeight misses.
        if (!isDesktopNow()) {
          // Mobile: the rail is `fixed` (see the wrapper's max-lg: classes),
          // so its geometry is derived from the viewport alone — never from
          // scroll position or the column's height. `pinnedOffset` is the
          // rows' *height*, not their position, so it doesn't move as you
          // scroll: the rail looks identical at the top of the list, deep
          // into it, and when a filter leaves only a couple of results.
          // Room is reserved for the floating bottom nav pill (24px offset +
          // ~52px pill + safe-area headroom); on viewports too short for the
          // full stack the cells flex-shrink evenly rather than clipping.
          // The lavender strip runs to the bottom of the viewport (bottom-0
          // on the wrapper, so no inline height here — an explicit height
          // would win over `bottom` and cut the strip short). The letter
          // stack keeps its own shorter height through --az-rail-stack-h, so
          // Z still stops clear of the floating nav pill while the strip
          // continues behind it.
          rail.style.height = "";
          rail.style.setProperty(
            "--az-rail-stack-h",
            `${Math.max(200, Math.min(compact, viewportH - pinnedOffset - 96))}px`
          );
        } else {
          // Desktop: sticky in the lavender column, compact at rest and
          // stretching to fill the viewport once pinned. Space is measured
          // from the rail's live top and capped by the column bottom.
          rail.style.removeProperty("--az-rail-stack-h");
          const stuck = colTop <= pinnedOffset;
          const stackTop = Math.max(pinnedOffset, colTop);
          const avail = Math.min(viewportH, colBottom) - stackTop - 8;
          rail.style.height = `${Math.max(
            200,
            stuck ? avail : Math.min(compact, avail)
          )}px`;
        }

        const resolved = spySection ?? sections[0] ?? null;
        if (spyTargetRef.current) {
          // Jump in flight: resume the spy once the scroll has arrived.
          if (resolved === spyTargetRef.current) {
            spyTargetRef.current = null;
            window.clearTimeout(spyTimeoutRef.current);
          }
        } else {
          setActiveSection(resolved);
        }
      }

      if (aside && asideTop !== null) {
        // Resting size: 141px natural offset (nav + page title) + edge gap.
        const defaultRest = viewportH - 141 - PANEL_EDGE_GAP;
        // Sticky growth target: keep the edge gap to the viewport bottom…
        const gapTarget = viewportH - asideTop - PANEL_EDGE_GAP;
        // …but never grow past the content column's bottom edge. Without this
        // cap, a list shorter than the panel gives the sticky aside no room
        // to pin, so scrolling raises `top`, which grew the max-height, which
        // lengthened the page — a feedback loop that expanded the panel to
        // its entire content. A content column shorter than the resting size
        // keeps the resting size (the floor below).
        const contentLimit = cardBottom - asideTop;
        aside.style.setProperty(
          "--speaker-panel-max-h",
          `${Math.max(240, defaultRest, Math.min(gapTarget, contentLimit))}px`
        );
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(spyTimeoutRef.current);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [sidePanelOpen, sections]);

  const filtersActive =
    activeFilterCount > 0 || interestedOnly || search.trim().length > 0;

  const renderGrid = (speakers: DecoratedSpeaker[]) => (
    <div
      className={cn(
        "grid grid-cols-1 gap-3",
        !sidePanelOpen && "lg:grid-cols-2"
      )}
    >
      {speakers.map((d) => (
        <SpeakerCard
          key={d.speaker.id}
          decorated={d}
          selected={d.speaker.id === selectedSpeakerId}
          interested={interestedIds.has(d.speaker.id)}
          onOpen={onOpenCard}
          onToggleInterested={toggleInterestedSpeaker}
        />
      ))}
    </div>
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
        filterCount={topics.length}
        onOpenFilters={() => setTopicSheetOpen(true)}
      />

      <div className="lg:mx-auto lg:w-full lg:max-w-[1312px] lg:px-8 lg:pb-16 xl:px-0">
        {/* Desktop page title */}
        <h1 className="hidden pb-4 pt-8 text-[24px] font-extrabold leading-[28.8px] tracking-[-0.5px] text-dc-fg2 lg:block">
          Speakers
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
              // pr-12 = the fixed rail's 32px gutter + a 16px gap, so the
              // right-aligned Interested pill is never clipped (or partly
              // untappable) under the rail at the top of the page.
              className="flex flex-col gap-3 border-b border-dc-hairline px-4 py-3 pr-12 lg:hidden"
            >
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Find a speaker"
                inputRef={mobileSearchInputRef}
              />
              <div className="flex items-center justify-end">
                <InterestedPill
                  active={interestedOnly}
                  onToggle={() => setInterestedOnly((v) => !v)}
                />
              </div>
            </div>

            {/* Header rows, sticky under the app header: the desktop search +
                topic toolbar (Figma "Top Bar") and the format tabs. Mobile
                filters topics via the header button + bottom sheet instead. */}
            <div
              ref={stickyRowsRef}
              className="sticky top-14 z-20 border-b border-dc-hairline lg:top-[65px]"
            >
              {/* Left padding only — the pill strip scrolls to the card's
                  right edge behind TopicPills' white fade. Pinned, the bar
                  swaps to the app header's glass and squares its corners so
                  cards scroll past behind it instead of through the notches. */}
              <div
                className={cn(
                  "hidden items-center gap-6 border-b border-dc-hairline py-3 pl-4 lg:flex",
                  rowsStuck
                    ? "bg-white/75 backdrop-blur-[4px]"
                    : "bg-white lg:rounded-t-xl"
                )}
              >
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Find a speaker"
                  className="w-[348px] shrink-0"
                />
                <TopicPills
                  options={topicOptions}
                  selected={topics}
                  onToggle={toggleTopic}
                  onClear={clearTopics}
                  stuck={rowsStuck}
                />
              </div>
              <TypeTabs
                options={typeOptions}
                selected={type}
                onSelect={setType}
                stuck={rowsStuck}
              >
                <InterestedPill
                  active={interestedOnly}
                  onToggle={() => setInterestedOnly((v) => !v)}
                  className="hidden lg:flex"
                />
              </TypeTabs>
            </div>

            {/* Content area: brand-neutrals/50 surface on desktop (Figma).
                The list column carries its own padding so the lavender rail
                column can sit flush against the card's right edge. */}
            <div
              className={cn(
                "lg:rounded-b-xl lg:bg-dc-panel",
                (isLoading || isError) && "px-4 py-6"
              )}
            >
              {isLoading ? (
                <p className="py-12 text-center text-dc-muted">
                  Loading speakers…
                </p>
              ) : isError ? (
                <p className="py-12 text-center text-dc-red">
                  {(error as Error | undefined)?.message ??
                    "Failed to load speakers."}
                </p>
              ) : (
                <div className="flex items-stretch">
                  <div className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-6">
                    {/* Desktop: removable chips row */}
                    <div className="hidden empty:hidden lg:block">
                      <SpeakersFilterStatusBar
                        topics={topics}
                        // Chip label matches the tab that set it ("Talks").
                        type={type ? typeLabel(type) : null}
                        onRemoveTopic={toggleTopic}
                        onClearType={() => setType(null)}
                        onClearAll={clearAll}
                        resultCount={resultCount}
                      />
                    </div>

                    {/* Mobile: applied-filter bar, schedule FilterStatusBar
                        style. Topics join with "or" — the topic filter
                        matches any selected topic, not all of them. */}
                    {(topics.length > 0 || type !== null) && (
                      <div className="lg:hidden">
                        <div className="flex h-9 min-w-0 items-center justify-between gap-2 rounded-[4px] border border-dc-purple bg-dc-lavender px-2 py-1">
                          <p className="min-w-0 truncate text-[12px] leading-none text-dc-purple">
                            <span className="font-bold">Filters:</span>{" "}
                            <span className="font-medium">
                              {[
                                topics.length > 0 && topics.join(" or "),
                                type && typeLabel(type),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </p>
                          <button
                            onClick={() => {
                              clearTopics();
                              setType(null);
                            }}
                            aria-label="Clear filters"
                            className="shrink-0 cursor-pointer"
                          >
                            <CircleX className="size-4 text-dc-purple" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Mobile: filtered-results heading + count (Figma) */}
                    {filtersActive && resultCount > 0 && (
                      <div className="flex items-center justify-between gap-3 lg:hidden">
                        <h2 className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
                          Speakers
                        </h2>
                        <span className="text-[14px] font-medium leading-5 text-dc-muted">
                          {resultCount} result{resultCount === 1 ? "" : "s"}
                        </span>
                      </div>
                    )}

                    {resultCount === 0 ? (
                      <SpeakersEmptyState
                        query={search}
                        topicFiltersActive={activeFilterCount > 0}
                        interestedOnly={interestedOnly}
                        onReset={clearAll}
                      />
                    ) : (
                      <>
                        {keynoteSpeakers.length > 0 && (
                          <section
                            ref={(el) => {
                              letterRefs.current.set(KEYNOTE_SECTION, el);
                            }}
                            className="flex flex-col gap-4"
                          >
                            <h2 className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
                              Keynote speakers
                            </h2>
                            {renderGrid(keynoteSpeakers)}
                          </section>
                        )}
                        <div
                          className={cn(
                            "flex flex-col gap-6",
                            // Hairline divider under the keynote block (Figma)
                            keynoteSpeakers.length > 0 &&
                              "border-t border-dc-hairline pt-6"
                          )}
                        >
                          {letterGroups.map((group) => (
                            <section
                              key={group.letter}
                              ref={(el) => {
                                letterRefs.current.set(group.letter, el);
                              }}
                              className="flex flex-col gap-3"
                            >
                              <h3 className="text-[16px] font-bold leading-6 text-dc-fg2">
                                {group.letter}
                              </h3>
                              {renderGrid(group.speakers)}
                            </section>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Lavender A–Z scrollbar column (Figma): spans the whole
                      list; the cell stack pins under the pinned filter rows
                      (top set by the measure effect) and stretches to fill
                      the viewport while scrolled. Hidden alongside the empty
                      state — every cell would be disabled. */}
                  {resultCount > 0 && (
                    <div className="w-8 shrink-0 border-l border-dc-hairline lg:bg-dc-lavender lg:rounded-br-xl">
                      <div
                        ref={railStickyRef}
                        className={cn(
                          "sticky transition-[height] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
                          // Mobile: pinned to the right edge with its own
                          // lavender strip, so scroll position and result
                          // count can't change how the rail looks.
                          "max-lg:fixed max-lg:right-0 max-lg:bottom-0 max-lg:z-20 max-lg:w-8 max-lg:bg-dc-lavender max-lg:transition-none"
                        )}
                      >
                        <AzIndexRail
                          sections={sections}
                          activeSection={activeSection}
                          onJump={jumpToSection}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Desktop side column: speaker details. Always mounted; its width
              transitions 0 ↔ 376px (360 panel + 16 gap) so the main column
              shrinks on the same clock, while the panel itself slides in from
              the right with a fade — one 300ms ease-out pair. */}
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

      {/* Mobile topic-filter bottom sheet */}
      {!isDesktop && (
        <TopicSheet
          open={topicSheetOpen}
          onOpenChange={setTopicSheetOpen}
          options={topicOptions}
          selected={topics}
          onToggle={toggleTopic}
          onClear={clearTopics}
        />
      )}
    </main>
  );
}
