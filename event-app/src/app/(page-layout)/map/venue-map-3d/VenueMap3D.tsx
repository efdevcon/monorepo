"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePaneActive, useTabReselect } from "@/components/paneContext";
import { isDesktopNow, useIsDesktop, useMediaQuery } from "@/hooks/useIsDesktop";
import { AreaCard } from "./AreaCard";
import { FindButton } from "./FindButton";
import { FindContent } from "./FindContent";
import { FindPanel } from "./FindPanel";
import { FindSheet } from "./FindSheet";
import { buildFindGroups, type FindEntry } from "./pois";
import { DebugPanel } from "./DebugPanel";
import { DebugCorner, DebugToggle } from "./DebugToggle";
import { FloorSlider } from "./FloorSlider";
import { ControlsLegend } from "./ControlsLegend";
import { useMapShortcuts } from "./useMapShortcuts";
import { areaOf, shapeKey } from "./planArea";
import { AREA_PARAM, parseAreaParam } from "./roomAreas";
import { DEFAULT_SETTINGS, type Area, type CameraFocus, type GroundBounds, type LevelId, type MapSettings, type PlanScene, type PlanShape } from "./types";
import planJson from "./plan.generated.json";

// three touches WebGL and DOMParser, so the scene only ever renders in the browser.
const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => <div className="p-8 text-dc-muted">Loading map…</div>,
});

const plan = planJson as unknown as PlanScene;

/** Deep-link zoom over the fitted floor: phones need the footprint pulled in, desktop only a nudge (Scott, 2026-09-12). */
const FOCUS_ZOOM_MOBILE = 2.2;
const FOCUS_ZOOM_DESKTOP = 1.35;

/** Ground-px rectangle around every polygon point of the shapes. */
function boundsOf(shapes: PlanShape[]): GroundBounds {
  const b: GroundBounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const shape of shapes)
    for (const poly of shape.polygons)
      for (const [x, z] of poly) {
        b.minX = Math.min(b.minX, x);
        b.maxX = Math.max(b.maxX, x);
        b.minZ = Math.min(b.minZ, z);
        b.maxZ = Math.max(b.maxZ, z);
      }
  return b;
}

/**
 * 3D venue map prototype for the Map tab: the three floors (G, L1, L2)
 * extruded from the top-down plan SVGs, stacked in 3D until a floor is picked
 * (tap it, or slide the floor selector bottom-right). Drag turns the floor
 * (horizontal only, clamped), right-drag pans, wheel zooms; on phones one
 * finger pans, two fingers turn and pinch-zoom. Double-tap zooms in on a
 * point, a tap on an area opens AreaCard, and re-tapping the Map tab resets
 * the view (useTabReselect). Find (bottom-left) lists every footprint by
 * category and floor and jumps to one — or to every "Toilets" on a floor at
 * once. Desktop: 1 / 2 / 3 open a floor, F opens Find, A or Esc close the
 * card or reset (useMapShortcuts).
 */
export function VenueMap3D() {
  const [selected, setSelected] = useState<Area | null>(null);
  // A found group ("Toilets · Level 1"): every member's selection key, highlighted alongside the selected one.
  const [highlighted, setHighlighted] = useState<ReadonlySet<string> | null>(null);
  const [focus, setFocus] = useState<CameraFocus | null>(null);
  // Any selection change (a tap, closing the card, a floor change) drops the found group.
  const select = useCallback((area: Area | null) => {
    setSelected(area);
    setHighlighted(null);
  }, []);
  const searchParams = useSearchParams();
  // Tuning panel + stats, toggled from the top-left button (not a URL param: the
  // app-wide dev panel owns `?debug` and carries it across every link).
  const [debug, setDebug] = useState(false);
  const [settings, setSettings] = useState<MapSettings>(DEFAULT_SETTINGS);
  const resetRef = useRef<() => void>(() => {});
  // Desktop: the area card sits beside the selected footprint. The scene writes the
  // footprint's screen position onto this element as CSS variables every rendered
  // frame (no React in the loop); the card positions itself from them from lg up.
  const cardAnchorRef = useRef<HTMLDivElement | null>(null);
  const active = usePaneActive();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const desktop = useIsDesktop();

  // Find: every tappable footprint by category and floor (the plan is static, so build it once).
  const findGroups = useMemo(() => buildFindGroups(plan), []);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const findInputRef = useRef<HTMLInputElement | null>(null);
  const closeFind = useCallback(() => {
    setFindOpen(false);
    setFindQuery("");
  }, []);

  // Map-tab re-tap, Esc, A, the "All" button: back to the stacked start view (the rig finishes the reset once the stack lands).
  const reset = useCallback(() => {
    select(null);
    setFocus(null);
    closeFind();
    setSettings((s) => (s.level === null ? s : { ...s, level: null }));
    resetRef.current();
  }, [select, closeFind]);
  useTabReselect(reset);

  /**
   * Show footprints (all on one floor): open that floor, select the one
   * nearest the group's centre, highlight the rest, and send the camera there
   * (a new `key` re-runs the camera even for the same target).
   */
  const showShapes = (shapes: PlanShape[], key: string) => {
    if (shapes.length === 0) return;
    const group = shapes.length > 1;
    const bounds = boundsOf(shapes);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minZ + bounds.maxZ) / 2;
    const primary = group
      ? shapes.reduce((best, s) => (Math.hypot(s.centroid[0] - cx, s.centroid[1] - cz) < Math.hypot(best.centroid[0] - cx, best.centroid[1] - cz) ? s : best))
      : shapes[0];
    setSettings((s) => ({ ...s, level: primary.level }));
    setSelected(areaOf(primary));
    setHighlighted(group ? new Set(shapes.map(shapeKey)) : null);
    const [x, z] = group ? [cx, cz] : primary.centroid;
    setFocus({ x, z, zoom: isDesktopNow() ? FOCUS_ZOOM_DESKTOP : FOCUS_ZOOM_MOBILE, key, bounds: group ? bounds : undefined });
  };

  // Deep link from the schedule ("Show on Map"): `?area=<level>/<layer id>` opens
  // that floor and highlights the footprint. Derived state during render
  // (guarded), same as AreaCard: keyed on the param and on the pane being
  // active, so a second visit with the same param re-highlights.
  const areaParam = searchParams.get(AREA_PARAM);
  const areaVisit = areaParam && active ? areaParam : null;
  // `n` counts visits so the camera focus re-runs for the same room (its effect is keyed on `focus.key`).
  const [handledVisit, setHandledVisit] = useState<{ area: string | null; n: number }>({ area: null, n: 0 });
  if (areaVisit !== handledVisit.area) {
    const n = handledVisit.n + 1;
    setHandledVisit({ area: areaVisit, n });
    const target = areaVisit ? parseAreaParam(areaVisit) : null;
    const shape = target && plan.levels.find((l) => l.id === target.level)?.shapes.find((s) => s.id === target.id);
    if (shape) showShapes([shape], `${areaVisit}#${n}`);
  }

  // Find pick: the same path as the deep link, keyed per pick so re-choosing the same row re-focuses.
  const pickFind = (entry: FindEntry) => {
    showShapes(entry.shapes, `find:${entry.key}#${Date.now()}`);
    closeFind();
  };
  // Floor taps in the stack and a clean tap on the slider's active stop: re-picking the shown floor returns to the stack.
  const setLevel = useCallback(
    (level: LevelId) => {
      select(null);
      setSettings((s) => ({ ...s, level: s.level === level ? null : level }));
    },
    [select]
  );
  // Slider, keyboard and Find's floor row: always land on that floor (no toggle back to the stack).
  const showLevel = useCallback(
    (level: LevelId) => {
      select(null);
      setSettings((s) => (s.level === level ? s : { ...s, level }));
    },
    [select]
  );
  const pickFloor = (level: LevelId) => {
    showLevel(level);
    closeFind();
  };
  // Find owns Escape while open (and the user may be typing "1" into its field).
  const openFind = useCallback(() => setFindOpen(true), []);
  const closeCard = useCallback(() => select(null), [select]);
  useMapShortcuts({ showLevel, reset, openFind, closeCard }, { enabled: !findOpen, hasCard: selected !== null });

  return (
    <div className="relative flex-1">
      <Scene
        plan={plan}
        settings={settings}
        selectedId={selected?.id ?? null}
        highlightedIds={highlighted}
        active={active}
        debug={debug}
        reducedMotion={reducedMotion}
        focus={focus}
        onSelect={select}
        onSelectLevel={setLevel}
        resetRef={resetRef}
        cardAnchorRef={cardAnchorRef}
      />
      <ControlsLegend stacked={settings.level === null} hidden={selected !== null || findOpen} />
      {/* Bottom controls: Find pill bottom-left, the floor slider bottom-right, on every breakpoint (Scott, 2026-09-17). */}
      <div className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--nav-clearance)+12px)] z-10 flex items-end justify-between lg:inset-x-6 lg:bottom-6">
        <FindButton open={findOpen} onClick={() => (findOpen ? closeFind() : openFind())} />
        <FloorSlider levels={plan.levels} value={settings.level} onSlide={showLevel} onToggle={setLevel} onAll={reset} />
      </div>
      {/* One shell per breakpoint so only one Escape handler is live; the sheet is lg:hidden anyway. */}
      {desktop ? (
        <FindPanel open={findOpen} onClose={closeFind} inputRef={findInputRef}>
          <FindContent groups={findGroups} query={findQuery} onQueryChange={setFindQuery} onPick={pickFind} onPickFloor={pickFloor} onClose={closeFind} inputRef={findInputRef} />
        </FindPanel>
      ) : (
        <FindSheet open={findOpen} onOpenChange={(open) => (open ? setFindOpen(true) : closeFind())}>
          <FindContent groups={findGroups} query={findQuery} onQueryChange={setFindQuery} onPick={pickFind} onPickFloor={pickFloor} onClose={closeFind} />
        </FindSheet>
      )}
      <AreaCard area={selected} onClose={() => select(null)} anchorRef={cardAnchorRef} />
      <DebugCorner panel={debug && <DebugPanel settings={settings} onChange={setSettings} />}>
        <DebugToggle pressed={debug} onToggle={() => setDebug((d) => !d)} />
      </DebugCorner>
    </div>
  );
}
