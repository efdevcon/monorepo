"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import cn from "classnames";
import { useSearchParams } from "next/navigation";
import { Search, TextSearch } from "lucide-react";
import { usePaneActive, useTabReselect } from "@/components/paneContext";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { useHideFeedbackFab } from "@/data/feedback/feedbackState";
import { useIsTeam } from "@/data/release/releaseGates";
import { APP_CHROME_OFF_ATTR, isDesktopNow, useIsDesktop, useIsPhoneLandscape, useMediaQuery } from "@/hooks/useIsDesktop";
import { FOCUS_ZOOM_DESKTOP, FOCUS_ZOOM_MOBILE } from "./camera/constants";
import { LEVELS, type LevelId } from "./data/levels";
import type { AreaId } from "./data/areas";
import { AREA_LIST, areaOf, compositeOf, type AreaKey } from "./data/resolve";
import { AREA_PARAM, parseAreaParam } from "./data/roomAreas";
import { buildFloorLegend, FIND_GROUPS, primaryOf, type FindEntry, type LegendEntry } from "./find/catalogue";
import { FindContent } from "./find/FindContent";
import { SearchContent } from "./search/SearchContent";
import { initialState, reduce, SINGLE_FLOOR } from "./state/mapStore";
import { AreaCard } from "./ui/AreaCard";
import { ControlPill } from "./ui/ControlPill";
import { DebugCorner, DebugPanel, DebugToggle } from "./ui/Debug";
import { FloorSlider } from "./ui/FloorSlider";
import { MapPanel } from "./ui/MapPanel";
import { MapSheet } from "./ui/MapSheet";
import { ControlsLegend, FloorLegend } from "./ui/TopStrip";
import { useMapShortcuts } from "./ui/useMapShortcuts";

// three touches WebGL, so the scene only ever renders in the browser.
const Scene = dynamic(() => import("./Scene"), { ssr: false, loading: () => <div className="p-8 text-dc-muted">Loading map…</div> });

/**
 * The venue map (JWCC plans): the floors extruded from the top-down SVGs
 * and rendered in 3D. Drag turns the floor (horizontal only, clamped),
 * right-drag pans, wheel zooms; on phones one finger pans, two fingers turn
 * and pinch-zoom. Double-tap zooms in on a point, a tap on a place opens
 * AreaCard, re-tapping the Map tab resets the view. Find (bottom-left) lists
 * every place by category, Search beside it finds them by name; the top
 * strip explains the controls while the floors are stacked and the open
 * floor's colours otherwise. State lives in one reducer (state/mapStore.ts);
 * the camera reacts to it (camera/CameraRig.tsx).
 */
export function VenueMap() {
  const [state, dispatch] = useReducer(reduce, initialState);
  const { floor, selected, group, groupName, focus, resetSeq, panel, query, debug, tuning } = state;
  const active = usePaneActive();
  const desktop = useIsDesktop();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const team = useIsTeam();
  const cardAnchorRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const stacked = floor === null;
  const selectedArea = selected ? areaOf(selected) : null;
  const groupSet = useMemo(() => (group ? new Set<AreaKey>(group) : null), [group]);
  // Phones: the card lands on the floating feedback button's corner; hide the button while the card is open.
  useHideFeedbackFab(selected !== null && !desktop && active);
  // A phone in landscape drops the bottom tab bar while the map shows, as the schedule does (<html data-app-chrome-off>, Nav.tsx):
  // the short viewport goes to the floor; the bar is back on rotating upright or leaving the tab (Scott, 2026-10-26).
  const phoneLandscape = useIsPhoneLandscape();
  const chromeOff = phoneLandscape && !desktop && active;
  useLayoutEffect(() => {
    if (!chromeOff) return;
    const root = document.documentElement;
    root.toggleAttribute(APP_CHROME_OFF_ATTR, true);
    return () => root.removeAttribute(APP_CHROME_OFF_ATTR);
  }, [chromeOff]);

  // Phone legend: shown until the first gesture, back whenever the stack returns. Derived in render.
  const [legendGestured, setLegendGestured] = useState(false);
  const [legendStacked, setLegendStacked] = useState(stacked);
  if (stacked !== legendStacked) {
    setLegendStacked(stacked);
    if (stacked) setLegendGestured(false);
  }
  const onInteract = useCallback(() => setLegendGestured(true), []);

  /** Show footprints (all on one floor): open the floor, select the one nearest the group's centre, highlight the rest, send the camera. */
  const showAreas = useCallback((keys: AreaKey[]) => {
    const areas = keys.map(areaOf).filter((a): a is NonNullable<typeof a> => a !== null);
    if (!areas.length) return;
    const composite = compositeOf(areas.map((a) => a.key));
    dispatch({ type: "showAreas", keys: areas.map((a) => a.key), primary: primaryOf(areas), zoom: isDesktopNow() ? FOCUS_ZOOM_DESKTOP : FOCUS_ZOOM_MOBILE, name: composite?.name });
  }, []);

  // Deep link from the schedule ("Show on Map"): `?area=<level>/<id>[,…]`, re-run on every visit of the pane.
  const areaParam = useSearchParams().get(AREA_PARAM);
  const visit = areaParam && active ? areaParam : null;
  useEffect(() => {
    if (!visit) return;
    const target = parseAreaParam(visit);
    if (target) showAreas(target.keys);
  }, [visit, showAreas]);

  const reset = useCallback(() => dispatch({ type: "reset" }), []);
  useTabReselect(reset);
  const closePanel = useCallback(() => dispatch({ type: "closePanel" }), []);
  const openFind = useCallback(() => dispatch({ type: "openPanel", panel: "find" }), []);
  const openSearch = useCallback(() => dispatch({ type: "openPanel", panel: "search" }), []);
  const closeCard = useCallback(() => dispatch({ type: "select", key: null }), []);
  const showLevel = useCallback((level: LevelId) => dispatch({ type: "openFloor", level }), []);
  const toggleLevel = useCallback((level: LevelId) => dispatch({ type: "toggleFloor", level }), []);
  const pickEntry = (entry: Pick<FindEntry, "areas"> | LegendEntry) => showAreas(entry.areas.map((a) => a.key));
  // A description's place link: that place's footprints on the open card's floor, or wherever they are.
  const showAreaById = useCallback(
    (areaId: AreaId) => {
      const all = AREA_LIST.filter((a) => a.areaId === areaId);
      const here = selectedArea ? all.filter((a) => a.level === selectedArea.level) : [];
      showAreas((here.length ? here : all).map((a) => a.key));
    },
    [selectedArea, showAreas]
  );
  useMapShortcuts({ showLevel, reset, openFind, openSearch, closeCard }, { enabled: panel === null, hasCard: selected !== null });

  const legend = useMemo(() => (floor ? buildFloorLegend(floor) : []), [floor]);
  const levelName = LEVELS.find((l) => l.id === floor)?.name ?? "";
  const stripHidden = selected !== null || panel !== null;

  return (
    // min-w-0 / min-h-0: the canvas keeps its last intrinsic size, and a flex item's default
    // `min-width: auto` would stop this root shrinking below it when the window narrows.
    <div className="relative min-h-0 min-w-0 flex-1">
      <Scene
        floor={floor}
        selected={selected}
        group={groupSet}
        focus={focus}
        resetSeq={resetSeq}
        tuning={tuning}
        active={active}
        debug={debug}
        reducedMotion={reducedMotion}
        desktop={desktop}
        onTapArea={(key) => dispatch({ type: "select", key })}
        onTapFloor={toggleLevel}
        onTapBackground={closeCard}
        onInteract={onInteract}
        cardAnchorRef={cardAnchorRef}
      />
      {/* Top strip: the controls while stacked, the open floor's legend otherwise (floors with nothing to explain show the controls). */}
      {stacked || legend.length === 0 ? <ControlsLegend hidden={stripHidden} dismissed={legendGestured} /> : <FloorLegend levelName={levelName} entries={legend} hidden={stripHidden} onPick={pickEntry} />}
      {/* Phones have no header bar on /map, so the header's offline marker moves to the map's top-right corner. */}
      <div className="pointer-events-none fixed right-4 top-[calc(var(--safe-top)+12px)] z-10 phone-landscape:right-[max(16px,var(--safe-right))] lg:hidden">
        <OfflineIndicator />
      </div>
      {/* Bottom controls: Find + Search pills bottom-left, the floor slider bottom-right; on phones the card covers them, so they fade out and go inert. */}
      <div
        inert={(selected !== null && !desktop) || undefined}
        className={cn(
          "pointer-events-none fixed inset-x-4 bottom-[calc(var(--nav-clearance)+12px)] z-10 flex items-end justify-between transition-opacity duration-150 ease-out motion-reduce:transition-none lg:inset-x-6 lg:bottom-6",
          // Landscape with the bar gone: the pills clear the notch and the home indicator.
          "phone-landscape:left-[max(16px,var(--safe-left))] phone-landscape:right-[max(16px,var(--safe-right))] phone-landscape:bottom-[calc(var(--nav-clearance)+max(12px,var(--safe-bottom)))]",
          selected !== null && "max-lg:opacity-0"
        )}
      >
        <div className="flex items-center gap-2">
          <ControlPill icon={TextSearch} label="Find" trigger="find" open={panel === "find"} onClick={() => (panel === "find" ? closePanel() : openFind())} />
          <ControlPill icon={Search} label="Search" trigger="search" open={panel === "search"} onClick={() => (panel === "search" ? closePanel() : openSearch())} />
        </div>
        {!SINGLE_FLOOR && <FloorSlider value={floor} onSlide={showLevel} onToggle={toggleLevel} onAll={reset} />}
      </div>
      {/* One shell per breakpoint so only one Escape handler is live per panel. */}
      {desktop ? (
        <>
          <MapPanel id="map-find-panel" label="Find a place" open={panel === "find"} onClose={closePanel}>
            <FindContent groups={FIND_GROUPS} onPick={pickEntry} onClose={closePanel} />
          </MapPanel>
          <MapPanel id="map-search-panel" label="Search the map" open={panel === "search"} onClose={closePanel} inputRef={searchInputRef}>
            <SearchContent groups={FIND_GROUPS} query={query} onQueryChange={(q) => dispatch({ type: "setQuery", query: q })} onPick={pickEntry} onPickFloor={showLevel} onClose={closePanel} inputRef={searchInputRef} floorTags={!SINGLE_FLOOR} />
          </MapPanel>
        </>
      ) : (
        <>
          <MapSheet label="Find a place" open={panel === "find"} onOpenChange={(open) => (open ? openFind() : closePanel())}>
            <FindContent groups={FIND_GROUPS} onPick={pickEntry} onClose={closePanel} />
          </MapSheet>
          <MapSheet label="Search the map" open={panel === "search"} onOpenChange={(open) => (open ? openSearch() : closePanel())}>
            <SearchContent groups={FIND_GROUPS} query={query} onQueryChange={(q) => dispatch({ type: "setQuery", query: q })} onPick={pickEntry} onPickFloor={showLevel} onClose={closePanel} floorTags={!SINGLE_FLOOR} />
          </MapSheet>
        </>
      )}
      <AreaCard area={selectedArea} group={group !== null} groupName={groupName} groupAreas={group} onClose={closeCard} onShowArea={showAreaById} anchorRef={cardAnchorRef} />
      {team && (
        <DebugCorner panel={debug && <DebugPanel tuning={tuning} floor={floor} onTune={(t) => dispatch({ type: "tune", tuning: t })} onFloor={(level) => (level ? showLevel(level) : dispatch({ type: "showStack" }))} />}>
          <DebugToggle pressed={debug} onToggle={() => dispatch({ type: "toggleDebug" })} />
        </DebugCorner>
      )}
    </div>
  );
}
