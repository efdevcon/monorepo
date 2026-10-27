"use client";

import { useRef, type MutableRefObject } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
import { CameraRig } from "./camera/CameraRig";
import { TWEEN_MS } from "./camera/constants";
import type { CameraRigController } from "./camera/rig";
import type { LevelId } from "./data/levels";
import { stackSpan } from "./floors/placement";
import type { AreaKey } from "./data/resolve";
import { FloorStack } from "./floors/FloorStack";
import { usePointer } from "./interaction/usePointer";
import type { Focus, Tuning } from "./state/mapStore";

export type SceneProps = {
  floor: LevelId | null;
  selected: AreaKey | null;
  group: ReadonlySet<AreaKey> | null;
  focus: Focus | null;
  resetSeq: number;
  tuning: Tuning;
  active: boolean;
  debug: boolean;
  reducedMotion: boolean;
  desktop: boolean;
  onTapArea: (key: AreaKey) => void;
  onTapFloor: (level: LevelId) => void;
  onTapBackground: () => void;
  onInteract: () => void;
  cardAnchorRef: MutableRefObject<HTMLDivElement | null>;
};

/** The R3F canvas: floors, camera rig and the pointer owner. Client-only (three needs WebGL). */
export default function Scene(props: SceneProps) {
  const { floor, selected, group, focus, resetSeq, tuning, active, debug, reducedMotion, desktop, cardAnchorRef } = props;
  const rigRef = useRef<CameraRigController | null>(null);
  const ortho = tuning.projection === "ortho";
  const stack = floor === null ? { span: stackSpan(tuning.levelGap) } : null;
  return (
    <Canvas
      key={tuning.projection}
      orthographic={ortho}
      camera={ortho ? { zoom: 4, near: 1, far: 4000, position: [500, 500, 500] } : { fov: 25, near: 1, far: 4000, position: [500, 500, 500] }}
      frameloop={active ? "demand" : "never"}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ touchAction: "none" }}
    >
      <ambientLight intensity={1.6} />
      <directionalLight position={[60, 120, 80]} intensity={1.4} />
      <CameraRig stack={stack} floor={floor} desktop={desktop} reducedMotion={reducedMotion} rotateLeftDeg={tuning.rotateLeftDeg} rotateRightDeg={tuning.rotateRightDeg} focus={focus} resetSeq={resetSeq} debug={debug} onInteract={props.onInteract} rigRef={rigRef} />
      <FloorStack floor={floor} gap={tuning.levelGap} showIcons={tuning.showIcons} supporterLogos={tuning.supporterLogos} reducedMotion={reducedMotion} selected={selected} group={group} desktop={desktop} onOpenFloor={props.onTapFloor} cardAnchorRef={cardAnchorRef} />
      <PointerOwner {...props} rigRef={rigRef} />
      {debug && <Stats />}
    </Canvas>
  );
}

/** Mounted after CameraRig so the cursor effect lands after the controls connect. */
function PointerOwner({ onTapArea, onTapFloor, onTapBackground, tuning, reducedMotion, debug, rigRef }: SceneProps & { rigRef: MutableRefObject<CameraRigController | null> }) {
  const invalidate = useThree((s) => s.invalidate);
  usePointer(
    {
      onTapArea,
      onTapFloor,
      onTapBackground,
      onDoubleTap: (x, y) => {
        rigRef.current?.zoomAt(x, y, tuning.zoomStep, reducedMotion ? 0 : TWEEN_MS);
        invalidate();
      },
    },
    debug
  );
  return null;
}
