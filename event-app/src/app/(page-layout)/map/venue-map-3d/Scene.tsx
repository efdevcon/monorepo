"use client";

import { useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
import { INITIAL_AZIMUTH, groundFromScreen, PX } from "./isoMath";
import { CameraRig } from "./CameraRig";
import { Slab } from "./Slab";
import { Blocks } from "./Blocks";
import { Props } from "./Props";
import { PlanShapes } from "./PlanShapes";
import type { Area, GroundBounds, MapSettings, PlanScene, SceneData } from "./types";

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
/** Ground rectangle (ground px) covered by the isometric artwork's viewBox. */
function isoGroundBounds(viewBox: number[]): GroundBounds {
  const [, , w, h] = viewBox;
  const corners = [groundFromScreen(0, 0), groundFromScreen(w, 0), groundFromScreen(0, h), groundFromScreen(w, h)].map(
    ([x, z]) => [x / PX, z / PX]
  );
  return {
    minX: Math.min(...corners.map((c) => c[0])),
    maxX: Math.max(...corners.map((c) => c[0])),
    minZ: Math.min(...corners.map((c) => c[1])),
    maxZ: Math.max(...corners.map((c) => c[1])),
  };
}

export default function Scene({ scene, plan, areas, settings, selectedId, active, debug, onSelect, resetRef }: SceneProps) {
  const azimuthRef = useRef(INITIAL_AZIMUTH);
  const [hover, setHover] = useState(false);
  const areaById = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);
  const areaByProp = useMemo(
    () => new Map(areas.filter((a) => a.prop).map((a) => [a.prop as string, a])),
    [areas]
  );
  const ortho = settings.projection === "ortho";
  const usePlan = settings.source === "plan";
  const lit = usePlan || settings.lit;
  const groundBounds = useMemo(
    () => (usePlan ? plan.bounds : isoGroundBounds(scene.viewBox)),
    [usePlan, plan.bounds, scene.viewBox]
  );
  const fit = usePlan ? plan.fit : { width: scene.viewBox[2], height: scene.viewBox[3] };

  return (
    <Canvas
      key={`${settings.projection}-${settings.source}`}
      orthographic={ortho}
      camera={ortho ? { zoom: 50, near: 0.1, far: 500, position: [35, 35, 35] } : { fov: 25, near: 0.1, far: 500, position: [35, 35, 35] }}
      frameloop={active ? "demand" : "never"}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={() => onSelect(null)}
      style={{ touchAction: "none", cursor: hover ? "pointer" : "grab" }}
    >
      <ambientLight intensity={lit ? 1.6 : 0} />
      <directionalLight position={[6, 12, 8]} intensity={lit ? 1.4 : 0} />
      <CameraRig groundBounds={groundBounds} fit={fit} settings={settings} azimuthRef={azimuthRef} resetRef={resetRef} />
      {usePlan ? (
        <PlanShapes shapes={plan.shapes} selectedId={selectedId} onSelect={onSelect} setHover={setHover} />
      ) : (
        <>
          <Slab scene={scene} />
          {settings.showBlocks && (
            <Blocks blocks={scene.blocks} areaById={areaById} selectedId={selectedId} lit={settings.lit} onSelect={onSelect} setHover={setHover} />
          )}
          {settings.showProps && (
            <Props props={scene.props} areaByProp={areaByProp} azimuthRef={azimuthRef} onSelect={onSelect} setHover={setHover} />
          )}
        </>
      )}
      {debug && <Stats />}
    </Canvas>
  );
}
