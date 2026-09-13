"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePaneActive, useTabReselect } from "@/components/paneContext";
import { isDesktopNow, useMediaQuery } from "@/hooks/useIsDesktop";
import { AreaCard } from "./AreaCard";
import { DebugPanel } from "./DebugPanel";
import { DebugCorner, DebugToggle } from "./DebugToggle";
import { SourceToggle } from "./SourceToggle";
import { ViewToggle } from "./ViewToggle";
import { LevelToggle } from "./LevelToggle";
import { ControlsLegend } from "./ControlsLegend";
import { useMapShortcuts } from "./useMapShortcuts";
import { areaOf, shapeKey } from "./planArea";
import { AREA_PARAM, parseAreaParam } from "./roomAreas";
import {
  DEFAULT_SETTINGS,
  type Area,
  type CameraFocus,
  type GroundBounds,
  type LevelId,
  type MapSettings,
  type MapSource,
  type MapView,
  type PlanScene,
  type PlanShape,
  type SceneData,
} from "./types";
import sceneJson from "./scene.generated.json";
import planJson from "./plan.generated.json";
import areasJson from "./areas.json";

// three touches WebGL and DOMParser, so the scene only ever renders in the browser.
const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => <div className="p-8 text-dc-muted">Loading map…</div>,
});

const scene = sceneJson as unknown as SceneData;
const plan = planJson as unknown as PlanScene;
const areas = areasJson as Area[];

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
 * 3D venue map prototype for the Map tab. Default source: the three floors
 * (G, L1, L2) extruded from the top-down plan SVGs, stacked in 3D until a
 * floor is picked (tap it, or a G/L1/L2 pill); the flat view shows one floor
 * at a time. `?source=iso` opens the isometric-artwork import, kept only to
 * show that importing in that style doesn't work. Drag / swipe turns the
 * floor (horizontal only, clamped), pinch or wheel zooms, double-tap zooms in
 * on a point, a tap on an area opens AreaCard, and re-tapping the Map tab
 * resets the view (useTabReselect).
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
  const [settings, setSettings] = useState<MapSettings>(() => ({
    ...DEFAULT_SETTINGS,
    source: searchParams.get("source") === "iso" ? "iso" : "plan",
  }));
  const resetRef = useRef<() => void>(() => {});
  const active = usePaneActive();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  // Map-tab re-tap: back to the stacked 3D start view (the rig finishes the reset once the pitch change lands).
  const reset = useCallback(() => {
    select(null);
    setFocus(null);
    setSettings((s) => (s.view === "3d" && s.level === null ? s : { ...s, view: "3d", level: null }));
    resetRef.current();
  }, [select]);
  useTabReselect(reset);

  /**
   * Show footprints (all on one floor): open that floor on the redraw, select
   * the one nearest the group's centre, highlight the rest, and send the camera
   * there (a new `key` re-runs the camera even for the same target).
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
    setSettings((s) => ({ ...s, source: "plan", level: primary.level }));
    setSelected(areaOf(primary));
    setHighlighted(group ? new Set(shapes.map(shapeKey)) : null);
    const [x, z] = group ? [cx, cz] : primary.centroid;
    setFocus({ x, z, zoom: isDesktopNow() ? FOCUS_ZOOM_DESKTOP : FOCUS_ZOOM_MOBILE, key, bounds: group ? bounds : undefined });
  };

  // Deep link from the schedule ("Show on Map"): `?area=<level>/<layer id>` opens
  // that floor on the redraw and highlights the footprint. Derived state during
  // render (guarded), same as AreaCard: keyed on the param and on the pane being
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

  // The top-down camera only makes sense on the redraw; the artwork always shows in 3D.
  const setSource = useCallback(
    (source: MapSource) => {
      select(null);
      setSettings((s) => ({ ...s, source, view: source === "plan" ? s.view : "3d" }));
    },
    [select]
  );
  // The flat view shows one floor: ground unless one was already chosen.
  const setView = useCallback(
    (view: MapView) => setSettings((s) => ({ ...s, view, level: view === "top" && s.level === null ? "G" : s.level })),
    []
  );
  // Pills and floor taps; re-tapping the active pill returns to the stack (3D only).
  const setLevel = useCallback(
    (level: LevelId) => {
      select(null);
      setSettings((s) => ({ ...s, level: s.level === level ? (s.view === "3d" ? null : level) : level }));
    },
    [select]
  );
  // Keyboard: G / 1 / 2 always land on that floor (no toggle back to the stack); Esc is the tab re-tap reset.
  const showLevel = useCallback(
    (level: LevelId) => {
      select(null);
      setSettings((s) => (s.level === level ? s : { ...s, level }));
    },
    [select]
  );
  useMapShortcuts({ showLevel, reset }, { enabled: settings.source === "plan" });

  return (
    <div className="relative flex-1">
      <Scene
        scene={scene}
        plan={plan}
        areas={areas}
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
      />
      <SourceToggle value={settings.source} onChange={setSource} />
      {settings.source === "plan" && (
        <>
          <ViewToggle value={settings.view} onChange={setView} />
          <LevelToggle levels={plan.levels} value={settings.level} onChange={setLevel} />
        </>
      )}
      <ControlsLegend view={settings.view} pannable={settings.source === "plan"} stacked={settings.source === "plan" && settings.level === null} hidden={selected !== null} />
      <AreaCard area={selected} onClose={() => select(null)} />
      <DebugCorner panel={debug && <DebugPanel settings={settings} onChange={setSettings} />}>
        <DebugToggle pressed={debug} onToggle={() => setDebug((d) => !d)} />
      </DebugCorner>
    </div>
  );
}
