"use client";

import { useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
import { INITIAL_AZIMUTH } from "./isoMath";
import { CameraRig } from "./CameraRig";
import { Slab } from "./Slab";
import { Blocks } from "./Blocks";
import { Props } from "./Props";
import type { Area, MapSettings, SceneData } from "./types";

type SceneProps = {
  scene: SceneData;
  areas: Area[];
  settings: MapSettings;
  selectedId: string | null;
  active: boolean;
  debug: boolean;
  onSelect: (area: Area | null) => void;
  resetRef: MutableRefObject<() => void>;
};

/** The R3F canvas: floor artwork, 3D blocks, upright props and the camera rig. Client-only (three needs WebGL). */
export default function Scene({ scene, areas, settings, selectedId, active, debug, onSelect, resetRef }: SceneProps) {
  const azimuthRef = useRef(INITIAL_AZIMUTH);
  const [hover, setHover] = useState(false);
  const areaById = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);
  const areaByProp = useMemo(
    () => new Map(areas.filter((a) => a.prop).map((a) => [a.prop as string, a])),
    [areas]
  );
  const ortho = settings.projection === "ortho";

  return (
    <Canvas
      key={settings.projection}
      orthographic={ortho}
      camera={ortho ? { zoom: 50, near: 0.1, far: 500, position: [35, 35, 35] } : { fov: 25, near: 0.1, far: 500, position: [35, 35, 35] }}
      frameloop={active ? "demand" : "never"}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={() => onSelect(null)}
      style={{ touchAction: "none", cursor: hover ? "pointer" : "grab" }}
    >
      <ambientLight intensity={settings.lit ? 1.6 : 0} />
      <directionalLight position={[6, 12, 8]} intensity={settings.lit ? 1.4 : 0} />
      <CameraRig viewBox={scene.viewBox} settings={settings} azimuthRef={azimuthRef} resetRef={resetRef} />
      <Slab scene={scene} />
      {settings.showBlocks && (
        <Blocks blocks={scene.blocks} areaById={areaById} selectedId={selectedId} lit={settings.lit} onSelect={onSelect} setHover={setHover} />
      )}
      {settings.showProps && (
        <Props props={scene.props} areaByProp={areaByProp} azimuthRef={azimuthRef} onSelect={onSelect} setHover={setHover} />
      )}
      {debug && <Stats />}
    </Canvas>
  );
}
