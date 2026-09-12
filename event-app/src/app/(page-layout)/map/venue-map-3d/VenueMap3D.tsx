"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePaneActive, useTabReselect } from "@/components/paneContext";
import { useMediaQuery } from "@/hooks/useIsDesktop";
import { AreaCard } from "./AreaCard";
import { DebugPanel } from "./DebugPanel";
import { DebugCorner, DebugToggle } from "./DebugToggle";
import { SourceToggle } from "./SourceToggle";
import { ViewToggle } from "./ViewToggle";
import { LevelToggle } from "./LevelToggle";
import { ControlsHelp } from "./ControlsHelp";
import { areaOf } from "./planArea";
import { AREA_PARAM, parseAreaParam } from "./roomAreas";
import { DEFAULT_SETTINGS, type Area, type LevelId, type MapSettings, type MapSource, type MapView, type PlanScene, type SceneData } from "./types";
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
    setSelected(null);
    setSettings((s) => (s.view === "3d" && s.level === null ? s : { ...s, view: "3d", level: null }));
    resetRef.current();
  }, []);
  useTabReselect(reset);

  // Deep link from the schedule ("Show on Map"): `?area=<level>/<layer id>` opens
  // that floor on the redraw and highlights the footprint. Derived state during
  // render (guarded), same as AreaCard: keyed on the param and on the pane being
  // active, so a second visit with the same param re-highlights.
  const areaParam = searchParams.get(AREA_PARAM);
  const areaVisit = areaParam && active ? areaParam : null;
  const [handledAreaVisit, setHandledAreaVisit] = useState<string | null>(null);
  if (areaVisit !== handledAreaVisit) {
    setHandledAreaVisit(areaVisit);
    const target = areaVisit ? parseAreaParam(areaVisit) : null;
    const shape = target && plan.levels.find((l) => l.id === target.level)?.shapes.find((s) => s.id === target.id);
    if (shape) {
      setSettings((s) => ({ ...s, source: "plan", level: shape.level }));
      setSelected(areaOf(shape));
    }
  }

  // The top-down camera only makes sense on the redraw; the artwork always shows in 3D.
  const setSource = useCallback((source: MapSource) => {
    setSelected(null);
    setSettings((s) => ({ ...s, source, view: source === "plan" ? s.view : "3d" }));
  }, []);
  // The flat view shows one floor: ground unless one was already chosen.
  const setView = useCallback(
    (view: MapView) => setSettings((s) => ({ ...s, view, level: view === "top" && s.level === null ? "G" : s.level })),
    []
  );
  // Pills and floor taps; re-tapping the active pill returns to the stack (3D only).
  const setLevel = useCallback((level: LevelId) => {
    setSelected(null);
    setSettings((s) => ({ ...s, level: s.level === level ? (s.view === "3d" ? null : level) : level }));
  }, []);

  return (
    <div className="relative flex-1">
      <Scene
        scene={scene}
        plan={plan}
        areas={areas}
        settings={settings}
        selectedId={selected?.id ?? null}
        active={active}
        debug={debug}
        reducedMotion={reducedMotion}
        onSelect={setSelected}
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
      <ControlsHelp view={settings.view} pannable={settings.source === "plan"} stacked={settings.source === "plan" && settings.level === null} hidden={selected !== null} />
      <AreaCard area={selected} onClose={() => setSelected(null)} />
      <DebugCorner>
        <DebugToggle pressed={debug} onToggle={() => setDebug((d) => !d)} />
        {debug && <DebugPanel settings={settings} onChange={setSettings} />}
      </DebugCorner>
    </div>
  );
}
