"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
import { POLAR_ANGLE, START_AZIMUTH } from "./isoMath";
import { CameraRig } from "./CameraRig";
import { LevelStack } from "./LevelStack";
import type { Area, CameraFocus, CameraPose, LevelId, MapSettings, PlanScene } from "./types";

type SceneProps = {
  plan: PlanScene;
  settings: MapSettings;
  selectedId: string | null;
  /** Found group: highlighted like a hover, icons bobbing. */
  highlightedIds?: ReadonlySet<string> | null;
  active: boolean;
  debug: boolean;
  reducedMotion: boolean;
  focus: CameraFocus | null;
  onSelect: (area: Area | null) => void;
  onSelectLevel: (level: LevelId) => void;
  resetRef: MutableRefObject<() => void>;
  /** Element that receives the selected footprint's screen position as CSS variables (LevelStack). */
  cardAnchorRef: MutableRefObject<HTMLDivElement | null>;
};

/** The R3F canvas: the stacked plan floors and the camera rig. Client-only (three needs WebGL). */
export default function Scene({ plan, settings, selectedId, highlightedIds = null, active, debug, reducedMotion, focus, onSelect, onSelectLevel, resetRef, cardAnchorRef }: SceneProps) {
  const poseRef = useRef<CameraPose>({ azimuth: START_AZIMUTH, polar: POLAR_ANGLE });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // Debug: expose the hovered target for hit-testing scripts.
  useEffect(() => {
    if (debug) (window as unknown as { __mapHover?: string | null }).__mapHover = hoveredId;
  }, [debug, hoveredId]);
  const ortho = settings.projection === "ortho";
  const cursor = hoveredId ? "pointer" : "grab";
  // Every floor stacked: the camera fits the whole pile.
  const stack = settings.level === null ? { count: plan.levels.length, gap: settings.levelGap } : null;

  return (
    <Canvas
      key={settings.projection}
      orthographic={ortho}
      camera={ortho ? { zoom: 50, near: 0.1, far: 500, position: [35, 35, 35] } : { fov: 25, near: 0.1, far: 500, position: [35, 35, 35] }}
      frameloop={active ? "demand" : "never"}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={() => onSelect(null)}
      style={{ touchAction: "none", cursor }}
    >
      <ambientLight intensity={1.6} />
      <directionalLight position={[6, 12, 8]} intensity={1.4} />
      <CameraRig groundBounds={plan.bounds} settings={settings} stack={stack} reducedMotion={reducedMotion} focus={focus} debug={debug} poseRef={poseRef} resetRef={resetRef} />
      <LevelStack
        levels={plan.levels}
        level={settings.level}
        gap={settings.levelGap}
        bounds={plan.bounds}
        showIcons={settings.showIcons}
        reducedMotion={reducedMotion}
        selectedId={selectedId}
        hoveredId={hoveredId}
        highlightedIds={highlightedIds}
        onSelect={onSelect}
        onSelectLevel={onSelectLevel}
        setHovered={setHoveredId}
        cardAnchorRef={cardAnchorRef}
      />
      {debug && <Stats />}
    </Canvas>
  );
}
