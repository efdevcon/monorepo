"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
import { INITIAL_AZIMUTH, POLAR_ANGLE } from "./isoMath";
import { CameraRig } from "./CameraRig";
import { Slab } from "./Slab";
import { Blocks } from "./Blocks";
import { Props } from "./Props";
import { PlanShapes } from "./PlanShapes";
import { PlanIcons } from "./PlanIcons";
import type { Area, CameraPose, MapSettings, PlanScene, SceneData } from "./types";

type SceneProps = {
  scene: SceneData;
  plan: PlanScene;
  areas: Area[];
  settings: MapSettings;
  selectedId: string | null;
  active: boolean;
  debug: boolean;
  onSelect: (area: Area | null) => void;
  resetRef: MutableRefObject<() => void>;
};

/** The R3F canvas: floor artwork, 3D blocks, upright props and the camera rig. Client-only (three needs WebGL). */
export default function Scene({ scene, plan, areas, settings, selectedId, active, debug, onSelect, resetRef }: SceneProps) {
  const poseRef = useRef<CameraPose>({ azimuth: INITIAL_AZIMUTH, polar: POLAR_ANGLE });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // ?debug: expose the hovered target for hit-testing scripts.
  useEffect(() => {
    if (debug) (window as unknown as { __mapHover?: string | null }).__mapHover = hoveredId;
  }, [debug, hoveredId]);
  const areaById = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);
  const areaByProp = useMemo(
    () => new Map(areas.filter((a) => a.prop).map((a) => [a.prop as string, a])),
    [areas]
  );
  const ortho = settings.projection === "ortho";
  const usePlan = settings.source === "plan";
  const lit = usePlan || settings.lit;
  const groundBounds = usePlan ? plan.bounds : scene.bounds;
  const fit = usePlan ? plan.fit : { width: scene.viewBox[2], height: scene.viewBox[3] };
  const pannable = usePlan;
  const cursor = hoveredId ? "pointer" : "grab";

  return (
    <Canvas
      key={`${settings.projection}-${settings.source}`}
      orthographic={ortho}
      camera={ortho ? { zoom: 50, near: 0.1, far: 500, position: [35, 35, 35] } : { fov: 25, near: 0.1, far: 500, position: [35, 35, 35] }}
      frameloop={active ? "demand" : "never"}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={() => onSelect(null)}
      style={{ touchAction: "none", cursor }}
    >
      <ambientLight intensity={lit ? 1.6 : 0} />
      <directionalLight position={[6, 12, 8]} intensity={lit ? 1.4 : 0} />
      <CameraRig groundBounds={groundBounds} fit={fit} settings={settings} pannable={pannable} poseRef={poseRef} resetRef={resetRef} />
      {usePlan ? (
        <>
          <PlanShapes shapes={plan.shapes} selectedId={selectedId} hoveredId={hoveredId} onSelect={onSelect} setHovered={setHoveredId} />
          {settings.showProps && (
            <Suspense fallback={null}>
              <PlanIcons shapes={plan.shapes} onSelect={onSelect} setHovered={setHoveredId} />
            </Suspense>
          )}
        </>
      ) : (
        <>
          <Slab scene={scene} />
          {settings.showBlocks && (
            <Blocks blocks={scene.blocks} areaById={areaById} selectedId={selectedId} hoveredId={hoveredId} lit={settings.lit} onSelect={onSelect} setHovered={setHoveredId} />
          )}
          {settings.showProps && (
            <Props props={scene.props} areaByProp={areaByProp} poseRef={poseRef} hoveredId={hoveredId} onSelect={onSelect} setHovered={setHoveredId} />
          )}
        </>
      )}
      {debug && <Stats />}
    </Canvas>
  );
}
