"use client";

import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { PX } from "./isoMath";
import { noRaycast } from "./interaction";
import type { PlanLevel } from "./types";

/** Blur spread around the slab, as a share of the floor's longer side (ground px → canvas px via `scale`). */
const SPREAD = 0.05;
/** Shadow drops a little towards the viewer (down the plan), like an elevated card. */
const OFFSET = 0.35;
const COLOR = "rgba(22, 11, 43, 0.45)";
const CANVAS_W = 1024;

/**
 * Drop shadow cast by a floor while it is hovered in the stack (Scott: the
 * floors didn't read as tappable). The slab outline (holes included) is drawn
 * blurred into a canvas once per floor and laid on a plane `dropY` world units
 * below the slab top — just above the next floor down, so the shadow lands on
 * it and peeks out below the hovered floor. Appears and disappears at once,
 * no transition.
 */
export function FloorShadow({ level, dropY, visible }: { level: PlanLevel; dropY: number; visible: boolean }) {
  const slab = level.shapes.find((s) => s.kind === "slab");
  const { texture, width, depth, cx, cz, y } = useMemo(() => {
    const b = level.bounds;
    const bw = b.maxX - b.minX;
    const bh = b.maxZ - b.minZ;
    const pad = SPREAD * Math.max(bw, bh);
    const scale = CANVAS_W / (bw + 2 * pad);
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = Math.ceil((bh + 2 * pad) * scale);
    const ctx = canvas.getContext("2d");
    if (ctx && slab) {
      ctx.fillStyle = COLOR;
      ctx.shadowColor = COLOR;
      ctx.shadowBlur = pad * scale * 0.6;
      ctx.shadowOffsetY = pad * scale * OFFSET;
      ctx.beginPath();
      for (const poly of slab.polygons) {
        poly.forEach(([x, z], i) => {
          const px = (x - b.minX + pad) * scale;
          const py = (z - b.minZ + pad) * scale;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
      }
      ctx.fill("evenodd");
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return {
      texture,
      width: (bw + 2 * pad) * PX,
      depth: (bh + 2 * pad) * PX,
      cx: ((b.minX + b.maxX) / 2) * PX,
      cz: ((b.minZ + b.maxZ) / 2) * PX,
      y: -dropY,
    };
  }, [level, slab, dropY]);
  useEffect(() => () => texture.dispose(), [texture]);

  if (!slab) return null;
  return (
    // Plane space is (X, −Z) after rotateX(−90°), same convention as PlanShapes; canvas rows run down the plan (+Z).
    <mesh position={[cx, y, cz]} rotation={[-Math.PI / 2, 0, 0]} visible={visible} raycast={noRaycast}>
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
