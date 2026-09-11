"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePaneActive, useTabReselect } from "@/components/paneContext";
import { AreaCard } from "./AreaCard";
import { DebugPanel } from "./DebugPanel";
import { SourceToggle } from "./SourceToggle";
import { ViewToggle } from "./ViewToggle";
import { ControlsHelp } from "./ControlsHelp";
import { DEFAULT_SETTINGS, type Area, type MapSettings, type MapSource, type MapView, type PlanScene, type SceneData } from "./types";
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
 * 3D venue map prototype for the Map tab. Two sources: the isometric Figma
 * artwork un-projected onto a floor with real boxes for the stages and
 * classrooms (default), or everything extruded from the top-down plan SVG
 * (`?source=plan`); the SourceToggle under the header switches between them.
 * Drag / swipe turns the floor (horizontal only, clamped), pinch or wheel
 * zooms, double-tap zooms in on a point, a tap on an area opens AreaCard, and
 * re-tapping the Map tab resets the view (useTabReselect).
 */
export function VenueMap3D() {
  const [selected, setSelected] = useState<Area | null>(null);
  const searchParams = useSearchParams();
  const debug = searchParams.get("debug") !== null;
  // ?source=plan opens the geometry built from the top-down plan instead of the artwork.
  const [settings, setSettings] = useState<MapSettings>(() => ({
    ...DEFAULT_SETTINGS,
    source: searchParams.get("source") === "plan" ? "plan" : "iso",
  }));
  const resetRef = useRef<() => void>(() => {});
  const active = usePaneActive();

  // Map-tab re-tap: back to the 3D start view (the rig finishes the reset once the pitch change lands).
  const reset = useCallback(() => {
    setSelected(null);
    setSettings((s) => (s.view === "3d" ? s : { ...s, view: "3d" }));
    resetRef.current();
  }, []);
  useTabReselect(reset);

  // The top-down camera only makes sense on the redraw; the artwork always shows in 3D.
  const setSource = useCallback((source: MapSource) => {
    setSelected(null);
    setSettings((s) => ({ ...s, source, view: source === "plan" ? s.view : "3d" }));
  }, []);
  const setView = useCallback((view: MapView) => setSettings((s) => ({ ...s, view })), []);

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
        onSelect={setSelected}
        resetRef={resetRef}
      />
      <SourceToggle value={settings.source} onChange={setSource} />
      {settings.source === "plan" && <ViewToggle value={settings.view} onChange={setView} />}
      <ControlsHelp view={settings.view} pannable={settings.source === "plan"} hidden={selected !== null} />
      <AreaCard area={selected} onClose={() => setSelected(null)} />
      {debug && <DebugPanel settings={settings} onChange={setSettings} />}
    </div>
  );
}
