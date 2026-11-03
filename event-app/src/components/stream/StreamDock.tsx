"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import cn from "classnames";
import { GripVertical } from "lucide-react";
import { CloseButton } from "@/components/Buttons";
import { useOnline } from "@/hooks/useOnline";
import { useIsDesktopSync } from "@/hooks/useIsDesktop";
import { openDetail } from "@/routing/detailRoute";
import {
  getCurrentStream,
  hasSlots,
  playerApiSrc,
  setCurrentStream,
  useCurrentStream,
  visibleSlot,
  watchPlayback,
  type DockStream,
} from "./dock";

/** Mini player: 320px wide 16:9 video under a 36px title strip, 16px off the corner. */
const FLOAT_W = 320;
const FLOAT_VIDEO_H = 180;
const STRIP_H = 36;
const FLOAT_H = STRIP_H + FLOAT_VIDEO_H;
const FLOAT_MARGIN = 16;
/** Matches the side panel's slide (Schedule.tsx), so a dock into it lands with it. */
const FLIGHT_MS = 300;
/**
 * How long a vanished slot is given to be replaced before the player
 * floats. Expand swaps the panel's slot for the page's across a commit and
 * a paint, and without this the player set off for the corner in between.
 */
const GRACE_MS = 150;
/** Pointer travel below which a press on the strip is a click, not a drag. */
const DRAG_SLOP_PX = 4;

type Mode = "docked" | "floating";

/**
 * Where the mini player was last dragged to, kept across floats for the
 * session; null is the default bottom-right corner.
 */
let floatPos: { left: number; top: number } | null = null;

function clampFloat(left: number, top: number) {
  return {
    left: Math.min(Math.max(left, FLOAT_MARGIN), window.innerWidth - FLOAT_W - FLOAT_MARGIN),
    top: Math.min(Math.max(top, FLOAT_MARGIN), window.innerHeight - FLOAT_H - FLOAT_MARGIN),
  };
}

function floatRect() {
  return clampFloat(
    floatPos?.left ?? window.innerWidth - FLOAT_MARGIN - FLOAT_W,
    floatPos?.top ?? window.innerHeight - FLOAT_MARGIN - FLOAT_H
  );
}

/**
 * The one desktop video player (see dock.ts). Mounted once in the
 * page layout, outside every pane, with no transformed ancestor (a fixed
 * box under a transform would pin to that ancestor instead of the window).
 * Renders nothing until a slot is on screen; after that the iframe lives
 * here, positioned every frame over the visible slot, clipped to what the
 * slot's scroll containers show of it, or floating while no slot is
 * visible and the video is playing: bottom-right, or wherever its strip
 * was last dragged. A stream that was not playing when its slot went away
 * is dropped rather than floated.
 */
export function StreamDock() {
  const desktop = useIsDesktopSync();
  const online = useOnline();
  const stream = useCurrentStream();

  // Keep the current stream in step with the slots even while no player is
  // mounted: a slot that comes on screen (tab back, panel reopened) wants
  // the player, with the embed cued, as if it had rendered its own.
  useEffect(() => {
    if (!desktop) return;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (getCurrentStream() || !hasSlots()) return;
      const target = visibleSlot();
      if (target) setCurrentStream(target.stream);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [desktop]);

  if (!desktop || !online || !stream) return null;
  return <DockPlayer key={stream.src} stream={stream} />;
}

function DockPlayer({ stream }: { stream: DockStream }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const playingRef = useRef(false);
  const draggingRef = useRef(false);
  const [mode, setMode] = useState<Mode>("docked");
  // A CSS transition only during a flight (dock ↔ float, or slot → slot):
  // while tracking a slot the box must follow it at once (scrolling, the
  // panel's own slide), and a drag must stick to the pointer.
  const [flying, setFlying] = useState(false);
  const [src] = useState(() => playerApiSrc(stream.src));

  useEffect(() => {
    if (!frameRef.current) return;
    return watchPlayback(frameRef.current, (playing) => {
      playingRef.current = playing;
    });
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    let lastMode: Mode | null = null;
    let lastSlot: HTMLElement | null = null;
    let lostAt: number | null = null;
    let flightTimer: ReturnType<typeof setTimeout> | undefined;

    const setBox = (top: number, left: number, width: number, height: number) => {
      root.style.top = `${top}px`;
      root.style.left = `${left}px`;
      root.style.width = `${width}px`;
      root.style.height = `${height}px`;
    };

    const fly = () => {
      setFlying(true);
      clearTimeout(flightTimer);
      flightTimer = setTimeout(() => setFlying(false), FLIGHT_MS);
    };

    const switchMode = (next: Mode) => {
      if (lastMode === next) return;
      const first = lastMode === null;
      lastMode = next;
      setMode(next);
      if (!first) fly();
    };

    const place = () => {
      const target = visibleSlot();
      if (target) {
        if (target.stream.src !== stream.src) {
          // Another session's stream is on screen: the dock remounts for it.
          setCurrentStream(target.stream);
          return;
        }
        if (target.stream.sessionId !== stream.sessionId) setCurrentStream(target.stream);
        lostAt = null;
        const { rect, inset } = target;
        // Panel → expanded page (or back): glide between the two slots.
        if (lastMode === "docked" && lastSlot && lastSlot !== target.el) fly();
        lastSlot = target.el;
        setBox(rect.top, rect.left, rect.width, rect.height);
        root.style.clipPath =
          inset.top || inset.right || inset.bottom || inset.left
            ? `inset(${inset.top}px ${inset.right}px ${inset.bottom}px ${inset.left}px)`
            : "";
        switchMode("docked");
        return;
      }
      if (lastMode === "docked") {
        // Hold still for a moment: the slot may be about to reappear elsewhere.
        lostAt ??= performance.now();
        if (performance.now() - lostAt < GRACE_MS) return;
      }
      if (lastMode !== "floating" && !playingRef.current) {
        // Left the session without playing: nothing to carry along.
        setCurrentStream(null);
        return;
      }
      lastSlot = null;
      const { left, top } = floatRect();
      setBox(top, left, FLOAT_W, FLOAT_H);
      root.style.clipPath = "";
      switchMode("floating");
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!draggingRef.current) place();
    };
    place();
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(flightTimer);
    };
  }, [stream.src, stream.sessionId]);

  // Drag by the strip. The pointer is captured, the box follows it directly
  // (the frame loop stands aside), and the drop point is remembered for the
  // next float. A press that barely moves is left to the title's click.
  const movedRef = useRef(false);
  const onStripPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    if (!root || e.button !== 0) return;
    const strip = e.currentTarget;
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = { left: parseFloat(root.style.left) || 0, top: parseFloat(root.style.top) || 0 };
    movedRef.current = false;
    strip.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!movedRef.current && Math.hypot(dx, dy) < DRAG_SLOP_PX) return;
      movedRef.current = true;
      draggingRef.current = true;
      setFlying(false);
      floatPos = clampFloat(origin.left + dx, origin.top + dy);
      root.style.left = `${floatPos.left}px`;
      root.style.top = `${floatPos.top}px`;
    };
    const onUp = () => {
      draggingRef.current = false;
      strip.releasePointerCapture(e.pointerId);
      strip.removeEventListener("pointermove", onMove);
      strip.removeEventListener("pointerup", onUp);
      strip.removeEventListener("pointercancel", onUp);
    };
    strip.addEventListener("pointermove", onMove);
    strip.addEventListener("pointerup", onUp);
    strip.addEventListener("pointercancel", onUp);
  };

  const floating = mode === "floating";
  return (
    <div
      ref={rootRef}
      role="region"
      aria-label={floating ? `Now playing: ${stream.title}` : "Video"}
      className={cn(
        "fixed z-40 flex flex-col overflow-hidden rounded-xl",
        floating
          ? "border border-dc-hairline bg-white shadow-[0_8px_24px_rgba(22,11,43,0.16)]"
          : "bg-black",
        flying &&
          "transition-[top,left,width,height] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
      )}
    >
      {/* Title strip, mini player only: drag handle; the title returns to
          the session. touch-action none so a pen or touch drag is ours. */}
      {floating && (
        <div
          onPointerDown={onStripPointerDown}
          className="flex shrink-0 cursor-grab touch-none select-none items-center gap-1 border-b border-dc-hairline bg-white pl-1.5 pr-1 active:cursor-grabbing"
          style={{ height: STRIP_H }}
        >
          <GripVertical className="size-4 shrink-0 text-dc-muted" aria-hidden />
          <button
            type="button"
            onClick={() => {
              if (!movedRef.current) openDetail("session", stream.sessionId);
            }}
            className="min-w-0 flex-1 cursor-pointer truncate text-left text-[13px] font-semibold leading-none text-dc-fg2 hover:underline"
          >
            {stream.title}
          </button>
          <CloseButton
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setCurrentStream(null)}
            aria-label="Close player"
          />
        </div>
      )}
      <div className="min-h-0 flex-1 bg-black">
        <iframe
          ref={frameRef}
          src={src}
          title={stream.title}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
