"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CircleX, ListFilter, Star, UserRoundSearch, X } from "lucide-react";
import cn from "classnames";
import { HEADER_ACTIONS_ID } from "@/components/AppHeader";
import { ghostPill, InterestedPill } from "@/components/ActionPills";
import { SearchInput } from "@/components/SearchInput";
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
import { AzIndexRail } from "./AzIndexRail";
import { SpeakerDetailsPanel } from "./SpeakerDetailsPanel";

/** Desktop side-panel slot: 360px panel + 16px gap, animated 0 ↔ this. */
const PANEL_SLOT_W = 376;

/** Circular 32px glass icon button used in the app header (Figma). */
const headerCircle =
  "flex size-8 cursor-pointer items-center justify-center rounded-full border border-dc-hairline bg-white transition-opacity";

/**
 * Page-specific app-header buttons, portaled into AppHeader's target (mobile):
 * scroll-revealed interested + A–Z circles, and the topic-filter button with
 * its active count bubble (hidden in A–Z mode, where topic filters reset).
 */
function HeaderActions({
  revealed,
  interestedOnly,
  onToggleInterested,
  azMode,
  onToggleAz,
  filterCount,
  onOpenFilters,
}: {
  revealed: boolean;
  interestedOnly: boolean;
  onToggleInterested: () => void;
  azMode: boolean;
  onToggleAz: () => void;
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
            onClick={onToggleInterested}
            aria-label="Show interested speakers"
            aria-pressed={interestedOnly}
            className={cn(
              headerCircle,
              !revealed && "pointer-events-none opacity-0"
            )}
          >
            <Star
              className="size-4 text-dc-purple"
              fill={interestedOnly ? "currentColor" : "none"}
            />
          </button>
          <button
            onClick={onToggleAz}
            aria-label="Toggle A–Z index"
            aria-pressed={azMode}
            className={cn(
              headerCircle,
              azMode && "bg-dc-lavender",
              !revealed && "pointer-events-none opacity-0"
            )}
          >
            <UserRoundSearch className="size-4 text-dc-purple" />
          </button>
          {!azMode && (
            <button
              onClick={onOpenFilters}
              aria-label="Filter by topic"
              className={cn(headerCircle, "relative")}
            >
              <ListFilter className="size-4 text-dc-purple" />
              {filterCount > 0 && (
                <span className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-dc-purple text-[10px] font-medium leading-none text-white">
                  {filterCount}
                </span>
              )}
            </button>
          )}
        </>,
        target
      )}
    </>
  );
}

/** "A–Z index" toggle (Figma): ghost purple button ↔ lavender close pill. */
function AzToggle({
  open,
  onToggle,
  className,
}: {
  open: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={open}
      className={cn(ghostPill, open && "bg-dc-lavender", className)}
    >
      {open ? (
        <>
          <X className="size-4" />
          Close A–Z index
        </>
      ) : (
        <>
          <UserRoundSearch className="size-4" />
          A–Z index
        </>
      )}
    </button>
  );
}

/**
 * Redesigned speakers view (Figma "PWA / Speakers"). Desktop: white panel
 * (search + A–Z toggle toolbar, topic pills, format tabs) over a dc-panel
 * list — "Keynote speakers" on top, "All speakers" alphabetical below, a flat
 * grid once any filter applies, and an A–Z index mode with a letter rail.
 * Speaker details open in a 360px right column; mobile navigates to
 * /speakers/[id] instead. All data derives from the cached speakers ×
 * sessions join (offline-safe).
 */
export function Speakers() {
  const {
    decorated,
    byId,
    topicOptions,
    allTopicOptions,
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
    azMode,
    setAzMode,
    clearAll,
    activeFilterCount,
    filtered,
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
  const letterRefs = useRef(new Map<string, HTMLElement | null>());
  const mainCardRef = useRef<HTMLDivElement | null>(null);
  const stickyRowsRef = useRef<HTMLDivElement | null>(null);
  const railStickyRef = useRef<HTMLDivElement | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);
  const [rowsStuck, setRowsStuck] = useState(false);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  // Reveal the header's star/A–Z circles once the search block scrolls away.
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

  // While a click-jump's smooth scroll is in flight, the scroll-spy would
  // walk the pill letter-by-letter through everything it passes. Instead the
  // pill goes straight to the clicked letter and the spy stays muted until it
  // agrees (or a fallback timeout fires — e.g. the user interrupts the scroll,
  // or the target section can't reach the spy line near the page bottom).
  const spyTargetRef = useRef<string | null>(null);
  const spyTimeoutRef = useRef(0);

  const jumpToLetter = useCallback((letter: string) => {
    spyTargetRef.current = letter;
    setActiveLetter(letter);
    window.clearTimeout(spyTimeoutRef.current);
    spyTimeoutRef.current = window.setTimeout(() => {
      spyTargetRef.current = null;
    }, 1500);
    letterRefs.current
      .get(letter)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      const rowsTop = stickyRowsRef.current?.getBoundingClientRect().top;

      const rail = railStickyRef.current;
      const railTop = rail?.getBoundingClientRect().top ?? 0;
      const colBottom =
        rail?.parentElement?.getBoundingClientRect().bottom ?? Infinity;

      // Scroll-spy read: the letter of the topmost section in view. Sections
      // render in group order, so take the last one above the spy line.
      let spyLetter: string | null = null;
      if (rail) {
        for (const group of letterGroups) {
          const el = letterRefs.current.get(group.letter);
          if (!el) continue;
          if (el.getBoundingClientRect().top <= headerOffset + 100)
            spyLetter = group.letter;
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
      setRowsStuck(rowsTop !== undefined && rowsTop <= headerOffset + 1);

      if (rail) {
        // Compact = the natural letter stack (24px cells + 8px paddings).
        const compact = (letters.includes("#") ? 27 : 26) * 24 + 16;
        const stuck = railTop <= headerOffset + 1;
        // visualViewport catches browser-chrome overlays innerHeight misses.
        // Space is measured from the rail's live top, so the compact stack
        // also caps to what actually fits below its resting position — on
        // viewports too short for it, the cells flex-shrink evenly instead
        // of letting the tail letters clip. Mobile reserves room for the
        // floating bottom nav pill (24px offset + ~52px pill + safe-area
        // headroom); desktop just keeps an 8px edge inset.
        const bottomInset = isDesktopNow() ? 8 : 96;
        const avail = Math.min(viewportH, colBottom) - railTop - bottomInset;
        rail.style.height = `${Math.max(
          200,
          stuck ? avail : Math.min(compact, avail)
        )}px`;

        const resolved = spyLetter ?? letterGroups[0]?.letter ?? null;
        if (spyTargetRef.current) {
          // Jump in flight: resume the spy once the scroll has arrived.
          if (resolved === spyTargetRef.current) {
            spyTargetRef.current = null;
            window.clearTimeout(spyTimeoutRef.current);
          }
        } else {
          setActiveLetter(resolved);
        }
      }

      if (aside && asideTop !== null) {
        // Resting size: 141px natural offset (nav + page title) + 32px gap.
        const defaultRest = viewportH - 173;
        // Sticky growth target: keep a 32px gap to the viewport bottom…
        const gapTarget = viewportH - asideTop - 32;
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
  }, [azMode, sidePanelOpen, letters, letterGroups]);

  const filtersActive =
    activeFilterCount > 0 || interestedOnly || search.trim().length > 0;
  // The Keynote/All split is the browse view; any filter collapses it into
  // one flat result grid (Figma "Filters applied").
  const showSections = !filtersActive;

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
        interestedOnly={interestedOnly}
        onToggleInterested={() => setInterestedOnly((v) => !v)}
        azMode={azMode}
        onToggleAz={() => setAzMode(!azMode)}
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
              className="flex flex-col gap-3 border-b border-dc-hairline px-4 py-3 lg:hidden"
            >
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Find a speaker"
              />
              <div className="flex items-center justify-between">
                <AzToggle open={azMode} onToggle={() => setAzMode(!azMode)} />
                <InterestedPill
                  active={interestedOnly}
                  onToggle={() => setInterestedOnly((v) => !v)}
                />
              </div>
            </div>

            {/* Desktop: search + A–Z toggle toolbar */}
            <div className="hidden items-center justify-between gap-3 border-b border-dc-hairline bg-white px-4 py-3 lg:flex lg:rounded-t-xl">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Find a speaker"
                className="w-[348px]"
              />
              <div className="flex items-center gap-3">
                {azMode && (
                  <InterestedPill
                    active={interestedOnly}
                    onToggle={() => setInterestedOnly((v) => !v)}
                  />
                )}
                <AzToggle open={azMode} onToggle={() => setAzMode(!azMode)} />
              </div>
            </div>

            {/* Filter rows (hidden in A–Z mode), sticky under the app header */}
            {!azMode && (
              <div
                ref={stickyRowsRef}
                className="sticky top-14 z-20 border-b border-dc-hairline lg:top-[65px]"
              >
                {/* Desktop only — mobile filters topics via the header
                    button + bottom sheet instead (Figma) */}
                <div className="hidden lg:block">
                  <TopicPills
                    options={topicOptions}
                    selected={topics}
                    onToggle={toggleTopic}
                    onClear={clearTopics}
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
            )}

            {/* Content area: brand-neutrals/50 surface on desktop (Figma).
                In A–Z mode the list carries its own padding so the lavender
                rail column can sit flush against the card's right edge. */}
            <div
              className={cn(
                "lg:rounded-b-xl lg:bg-dc-panel",
                !(azMode && !isLoading && !isError && resultCount > 0) &&
                  "px-4 py-6"
              )}
            >
              {!azMode && (
                <>
                  {/* Desktop: removable chips row */}
                  <div className="mb-4 hidden empty:hidden lg:block">
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
                      style — "Filter: Topic (2), Talks" (Figma) */}
                  {(topics.length > 0 || type !== null) && (
                    <div className="mb-4 lg:hidden">
                      <div className="flex h-9 min-w-0 items-center justify-between gap-2 rounded-[4px] border border-dc-purple bg-dc-lavender px-2 py-1">
                        <p className="min-w-0 truncate text-[12px] leading-none text-dc-purple">
                          <span className="font-bold">Filter:</span>{" "}
                          <span className="font-medium">
                            {[
                              topics.length > 0 && `Topic (${topics.length})`,
                              type && typeLabel(type),
                            ]
                              .filter(Boolean)
                              .join(", ")}
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

                  {/* Mobile: flat-results heading + count (Figma) */}
                  {!showSections && resultCount > 0 && (
                    <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
                      <h2 className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
                        Speakers
                      </h2>
                      <span className="text-[14px] font-medium leading-5 text-dc-muted">
                        {resultCount} result{resultCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  )}
                </>
              )}

              {isLoading ? (
                <p className="py-12 text-center text-dc-muted">
                  Loading speakers…
                </p>
              ) : isError ? (
                <p className="py-12 text-center text-dc-red">
                  {(error as Error | undefined)?.message ??
                    "Failed to load speakers."}
                </p>
              ) : resultCount === 0 ? (
                <SpeakersEmptyState
                  query={search}
                  filtersActive={activeFilterCount > 0 || interestedOnly}
                  onReset={clearAll}
                />
              ) : azMode ? (
                <div className="flex items-stretch">
                  <div className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-6">
                    <h2 className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
                      Speakers
                    </h2>
                    {letterGroups.map((group) => (
                      <section
                        key={group.letter}
                        ref={(el) => {
                          letterRefs.current.set(group.letter, el);
                        }}
                        className="flex scroll-mt-16 flex-col gap-3 lg:scroll-mt-[81px]"
                      >
                        <h3 className="text-[16px] font-bold leading-6 text-dc-fg2">
                          {group.letter}
                        </h3>
                        {renderGrid(group.speakers)}
                      </section>
                    ))}
                  </div>
                  {/* Lavender A–Z scrollbar column (Figma): spans the whole
                      list; the letter stack pins under the header and
                      stretches to fill the viewport while scrolled. */}
                  <div className="w-8 shrink-0 border-l border-dc-hairline bg-dc-lavender lg:rounded-br-xl">
                    <div
                      ref={railStickyRef}
                      className="sticky top-14 transition-[height] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none lg:top-[65px]"
                    >
                      <AzIndexRail
                        letters={letters}
                        activeLetter={activeLetter}
                        onJump={jumpToLetter}
                      />
                    </div>
                  </div>
                </div>
              ) : showSections ? (
                <div className="flex flex-col gap-6">
                  {keynoteSpeakers.length > 0 && (
                    <section className="flex flex-col gap-4">
                      <h2 className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
                        Keynote speakers
                      </h2>
                      {renderGrid(keynoteSpeakers)}
                    </section>
                  )}
                  <section
                    className={cn(
                      "flex flex-col gap-4",
                      // Hairline divider between the two sections (Figma)
                      keynoteSpeakers.length > 0 &&
                        "border-t border-dc-hairline pt-6"
                    )}
                  >
                    <h2 className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
                      All speakers
                    </h2>
                    {renderGrid(filtered)}
                  </section>
                </div>
              ) : (
                renderGrid(filtered)
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
              "sticky top-20 hidden shrink-0 overflow-hidden lg:block",
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
          options={allTopicOptions}
          selected={topics}
          onToggle={toggleTopic}
          onClear={clearTopics}
        />
      )}
    </main>
  );
}
