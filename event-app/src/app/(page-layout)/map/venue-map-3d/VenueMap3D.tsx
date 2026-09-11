"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePaneActive, useTabReselect } from "@/components/paneContext";
import { AreaCard } from "./AreaCard";
import { DebugPanel } from "./DebugPanel";
import { DEFAULT_SETTINGS, type Area, type MapSettings, type PlanScene, type SceneData } from "./types";
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
 * (`?source=plan`, also in the ?debug panel).
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

  const reset = useCallback(() => {
    setSelected(null);
    resetRef.current();
  }, []);
  useTabReselect(reset);

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
      <AreaCard area={selected} onClose={() => setSelected(null)} />
      {debug && <DebugPanel settings={settings} onChange={setSettings} />}
    </div>
  );
}
