"use client";

import { usePaneActive } from "@/components/paneContext";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CircleX, ListFilter, Search, Star } from "lucide-react";
import cn from "classnames";
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
import { InterestedPill } from "@/components/ActionPills";
import { SearchInput } from "@/components/SearchInput";
import { useInterestedSpeakers } from "@/data/interested/useInterestedSpeakers";
import {
  useIsDesktop,
  isDesktopNow,
  headerOffsetNow,
  safeTopNow,
} from "@/hooks/useIsDesktop";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDetailParam } from "@/routing/detailParam";
import {
  DetailLayer,
  DetailNotFound,
  HeaderActionsPortal,
} from "@/components/DetailLayer";
import { ShareButton } from "@/components/ShareButton";
import { RenderOnApproach } from "@/components/RenderOnApproach";
import { useSpeakersData, type DecoratedSpeaker } from "./useSpeakersData";
import { useSpeakersState } from "./useSpeakersState";
import { SpeakerCard } from "./SpeakerCard";
import { SpeakerDetailsContent } from "./SpeakerDetailsContent";
import { TopicPills } from "./TopicPills";
import { TypeTabs, typeLabel } from "./TypeTabs";
import { TopicSheet } from "./TopicSheet";
import { SpeakersFilterStatusBar } from "./SpeakersFilterStatusBar";
import { SpeakersEmptyState } from "./SpeakersEmptyState";
import { AzIndexRail, FEATURED_SECTION } from "./AzIndexRail";
import { SpeakerDetailsPanel } from "./SpeakerDetailsPanel";

/** Desktop side-panel slot: 360px panel + 16px gap, animated 0 ↔ this. */
const PANEL_SLOT_W = 376;

/** Pinned side-panel edge gap: the aside pins at 81px + --safe-top, 16px
 *  below the 65px desktop header; the bottom keeps the same 16px to the
 *  viewport edge so both ends of the panel match. Keep the aside's sticky
 *  top equal to 65 + this, or the two ends drift apart. */
const PANEL_EDGE_GAP = 16;

/**
 * Page-specific app-header buttons, portaled into AppHeader's target (mobile):
 * the search and interested circles and the topic-filter button with its
 * active count bubble. The star stays filled (matching InterestedPill); the
 * lavender circle fill carries the active state — on the search button it
 * signals both "drawer open" and "query applied with the drawer closed".
 */
function HeaderActions({
  searchOpen,
  searchActive,
  onToggleSearch,
  interestedOnly,
  onToggleInterested,
  filterCount,
  onOpenFilters,
}: {
  searchOpen: boolean;
  searchActive: boolean;
  onToggleSearch: () => void;
  interestedOnly: boolean;
  onToggleInterested: () => void;
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
            aria-label="Search speakers"
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
            onClick={onToggleInterested}
            aria-label="Show interested speakers"
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
 * list sectioned Featured → # → A–Z, with the letter rail always present on
 * the right (featured mic cell on top). Filters/search keep the sections and
 * rail, just built from the filtered set (absent letters disable in the
 * rail). Speaker details open in a 360px right column; mobile navigates to
 * a full-screen layer over the list instead. All data derives from the cached speakers ×
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
    featuredSpeakers,
    letterGroups,
    letters,
  } = useSpeakersState(decorated, interestedIds);

  const isDesktop = useIsDesktop();
  // False while another tab pane is showing: header portals and window
  // measurements belong to the visible pane only (see TabPanes).
  const paneActive = usePaneActive();
  const { id: detailId, open: openDetail, close: closeDetail } =
    useDetailParam("speaker");
  const selectedSpeakerId = detailId;
  const [topicSheetOpen, setTopicSheetOpen] = useState(false);
  // Closing the drawer clears the query too (see useHeaderSearch).
  const headerSearch = useHeaderSearch(() => setSearch(""));
  const letterRefs = useRef(new Map<string, HTMLElement | null>());
  const mainCardRef = useRef<HTMLDivElement | null>(null);
  const stickyRowsRef = useRef<HTMLDivElement | null>(null);
  const railStickyRef = useRef<HTMLDivElement | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);
  const [rowsStuck, setRowsStuck] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const clearTopics = useCallback(() => {
    // toggleTopic uses functional updates, so successive calls compose.
    topics.forEach((t) => toggleTopic(t));
  }, [topics, toggleTopic]);

  // Selection lives in the URL (?speaker=<id>) on every viewport: desktop
  // renders it in the side panel, mobile in a full-screen layer over the list.
  // Card callbacks read the URL directly so they stay referentially stable
  // (memoized cards would otherwise re-render on every selection).
  const selectSpeaker = useCallback(
    (id: string | null) => {
      if (id) openDetail(id);
      else closeDetail();
    },
    [openDetail, closeDetail]
  );
  // Clicking the already-selected card closes the panel.
  const onOpenCard = useCallback(
    (id: string) => {
      const current = new URLSearchParams(window.location.search).get("speaker");
      selectSpeaker(id === current ? null : id);
    },
    [selectSpeaker]
  );

  // The sheet only exists below lg; a stale open flag would otherwise pop it
  // open uninvited when the viewport narrows back.
  useEffect(() => {
    if (isDesktop) setTopicSheetOpen(false);
  }, [isDesktop]);

  const selectedSpeaker = useMemo(
    () => (selectedSpeakerId ? (byId.get(selectedSpeakerId) ?? null) : null),
    [byId, selectedSpeakerId]
  );
  useDocumentTitle(selectedSpeaker?.speaker.name ?? null);

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

  // Rail/spy section order: the featured section leads when present, then the
  // letter groups (# first, then A–Z) — all derived from the filtered set.
  const sections = useMemo(
    () =>
      featuredSpeakers.length > 0 ? [FEATURED_SECTION, ...letters] : letters,
    [featuredSpeakers.length, letters]
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
    if (!paneActive) return;
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
        // 26 letters + the featured cell + the optional "#" cell.
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
        // Resting size: 141px natural offset (nav + page title) + edge gap,
        // plus the status-bar inset the sticky top gained (iPad PWA).
        const defaultRest = viewportH - 141 - safeTopNow() - PANEL_EDGE_GAP;
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
  }, [sidePanelOpen, sections, paneActive]);

  const filtersActive =
    activeFilterCount > 0 || interestedOnly || search.trim().length > 0;

  // Cards render as their letter group approaches the viewport (a placeholder
  // of about the right height holds the place until then), so mounting the
  // page costs a screenful of cards instead of all 700+.
  const renderGrid = (speakers: DecoratedSpeaker[]) => (
    <RenderOnApproach
      estimatedHeight={Math.max(
        0,
        (isDesktop && !sidePanelOpen
          ? Math.ceil(speakers.length / 2)
          : speakers.length) *
          92 -
          12
      )}
    >
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
    </RenderOnApproach>
  );

  return (
    <main className="expand font-heading text-dc-fg">
      {/* The detail layer owns the header on mobile (back arrow + share). */}
      {!(detailId && !isDesktop) && (
        <HeaderActions
          searchOpen={headerSearch.searchOpen}
          searchActive={headerSearch.searchOpen}
          onToggleSearch={headerSearch.toggleSearch}
          interestedOnly={interestedOnly}
          onToggleInterested={() => setInterestedOnly((v) => !v)}
          filterCount={topics.length}
          onOpenFilters={() => setTopicSheetOpen(true)}
        />
      )}
      <HeaderSearchDrawer
        open={headerSearch.searchOpen}
        onClose={headerSearch.closeSearch}
        value={search}
        onChange={setSearch}
        placeholder="Find a speaker"
        inputRef={headerSearch.inputRef}
        drawerRef={headerSearch.drawerRef}
      />

      {/* Mobile: speaker details as a layer over the (still mounted) list. */}
      {!isDesktop && detailId && (
        <DetailLayer label="Speaker details">
          {selectedSpeaker ? (
            <>
              <HeaderActionsPortal>
                <ShareButton
                  kind="speaker"
                  id={selectedSpeaker.speaker.id}
                  title={selectedSpeaker.speaker.name}
                />
              </HeaderActionsPortal>
              <SpeakerDetailsContent
                decorated={selectedSpeaker}
                className="min-h-full"
              />
            </>
          ) : (
            <DetailNotFound label="Speaker not found" onBack={closeDetail} />
          )}
        </DetailLayer>
      )}

      <div
        className={cn(
          "lg:mx-auto lg:w-full lg:max-w-[1312px] lg:px-8 lg:pb-16 xl:px-0",
          // Under the detail layer: keep layout + scroll position, stop the
          // sticky rows and the A-Z rail from painting through, block input.
          !isDesktop && detailId && "invisible"
        )}
        inert={(!isDesktop && !!detailId) || undefined}
      >
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
            {/* Header rows, sticky under the app header: the desktop search +
                topic toolbar (Figma "Top Bar") and the format tabs. Mobile
                filters topics via the header button + bottom sheet instead. */}
            <div
              ref={stickyRowsRef}
              // z-[21]: one above the fixed A–Z rail (z-20), which is later in
              // DOM order and would otherwise paint its lavender strip over
              // the tab bar's right fade whenever the two touch.
              className="sticky top-[calc(3.5rem+var(--safe-top))] z-[21] border-b border-dc-hairline lg:top-[calc(65px+var(--safe-top))]"
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
                        {featuredSpeakers.length > 0 && (
                          <section
                            ref={(el) => {
                              letterRefs.current.set(FEATURED_SECTION, el);
                            }}
                            className="flex flex-col gap-4"
                          >
                            <h2 className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
                              Featured speakers
                            </h2>
                            {renderGrid(featuredSpeakers)}
                          </section>
                        )}
                        <div
                          className={cn(
                            "flex flex-col gap-6",
                            // Hairline divider under the featured block (Figma)
                            featuredSpeakers.length > 0 &&
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
