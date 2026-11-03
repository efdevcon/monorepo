"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
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

/** The side panel's easing, cubic-bezier(0.32, 0.72, 0, 1), solved for x. */
function panelEase(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bez = (t: number, a: number, b: number) =>
    3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (bez(mid, 0.32, 0) < x) lo = mid;
    else hi = mid;
  }
  const t = (lo + hi) / 2;
  return bez(t, 0.72, 1);
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
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
 *
 * A move between places (slot → slot, dock ↔ float) is a FLIP flight: the
 * box takes its final size and position at once and a transform carries
 * the video from where it was, easing out over 300ms. Animating the box
 * itself would resize the iframe every frame, and YouTube's player then
 * holds the video centred at its old size until its throttled resize
 * runs, a visible snap at the end.
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
  const videoRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const playingRef = useRef(false);
  const draggingRef = useRef(false);
  /** Cancels a flight in progress (a drag takes over the box). */
  const cancelFlightRef = useRef<() => void>(() => {});
  const [mode, setMode] = useState<Mode>("docked");
  // The strip fades in once the flight into the float has landed.
  const [flying, setFlying] = useState(false);
  const [src] = useState(() => playerApiSrc(stream.src));
  // The placement effect keys on `src` alone: a restart on a session change
  // (the next talk in the same room, same stream) would lose a flight in
  // progress with its transform still applied.
  const streamRef = useRef(stream);
  streamRef.current = stream;

  useEffect(() => {
    if (!frameRef.current) return;
    return watchPlayback(frameRef.current, (playing) => {
      playingRef.current = playing;
    });
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const video = videoRef.current;
    if (!root || !video) return;
    let raf = 0;
    let lastMode: Mode | null = null;
    let lastSlot: HTMLElement | null = null;
    let lostAt: number | null = null;
    /** The flight in progress: where the video was, and when it set off. */
    let flight: { from: DOMRect; startedAt: number } | null = null;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const setBox = (box: Box) => {
      root.style.top = `${box.top}px`;
      root.style.left = `${box.left}px`;
      root.style.width = `${box.width}px`;
      root.style.height = `${box.height}px`;
    };

    // State set from a frame callback is default-lane work, which React
    // would commit in a task after this frame paints; the strip must mount
    // or leave in the same frame as the box takes its new size.
    const endFlight = () => {
      flight = null;
      root.style.transform = "";
      root.style.transformOrigin = "";
      flushSync(() => setFlying(false));
    };
    cancelFlightRef.current = endFlight;

    /** Start a flight from where the video is painted right now. */
    const takeOff = () => {
      if (reduceMotion) return;
      flight = { from: video.getBoundingClientRect(), startedAt: performance.now() };
      flushSync(() => setFlying(true));
    };

    /** Apply this frame's transform: the video box lerped from `from` to its final place. */
    const flyFrame = (box: Box, strip: number) => {
      if (!flight) return;
      const p = panelEase((performance.now() - flight.startedAt) / FLIGHT_MS);
      if (p >= 1) {
        endFlight();
        return;
      }
      const to = { top: box.top + strip, left: box.left, width: box.width };
      const scale = 1 + (flight.from.width / to.width - 1) * (1 - p);
      const tx = (flight.from.left - to.left) * (1 - p);
      const ty = (flight.from.top - to.top) * (1 - p);
      root.style.transformOrigin = `0 ${strip}px`;
      root.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    };

    const switchMode = (next: Mode) => {
      if (lastMode === next) return;
      const first = lastMode === null;
      lastMode = next;
      // The first placement runs inside the layout effect, where React
      // cannot flush (and the initial mode is already the state's default).
      if (first) setMode(next);
      else flushSync(() => setMode(next));
      if (!first) takeOff();
    };

    const place = () => {
      const target = visibleSlot();
      if (target) {
        const stream = streamRef.current;
        if (target.stream.src !== stream.src) {
          // Another session's stream is on screen: the dock remounts for it.
          setCurrentStream(target.stream);
          return;
        }
        if (target.stream.sessionId !== stream.sessionId) setCurrentStream(target.stream);
        lostAt = null;
        const { rect, inset } = target;
        // Panel → expanded page (or back): glide between the two slots.
        if (lastMode === "docked" && lastSlot && lastSlot !== target.el) takeOff();
        lastSlot = target.el;
        switchMode("docked");
        setBox(rect);
        flyFrame(rect, 0);
        // No clip in flight: the box is in the air, not in its scroller yet.
        root.style.clipPath =
          !flight && (inset.top || inset.right || inset.bottom || inset.left)
            ? `inset(${inset.top}px ${inset.right}px ${inset.bottom}px ${inset.left}px)`
            : "";
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
      switchMode("floating");
      const { left, top } = floatRect();
      const box = { top, left, width: FLOAT_W, height: FLOAT_H };
      setBox(box);
      root.style.clipPath = "";
      flyFrame(box, STRIP_H);
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!draggingRef.current) place();
    };
    place();
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      cancelFlightRef.current = () => {};
    };
  }, [stream.src]);

  // Drag by the strip. The listeners go on the window, so a press that
  // leaves the strip still gets its up (or a move with no button held,
  // which ends it too); nothing is left bound. Pointer capture starts only
  // once the press has travelled past the slop: capturing on the press
  // itself retargets the click to the strip and the title's click never
  // fires. While dragging the box follows the pointer directly (the frame
  // loop stands aside) and the drop point is remembered for the next float.
  const movedRef = useRef(false);
  const onStripPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    if (!root || e.button !== 0) return;
    const strip = e.currentTarget;
    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = { left: parseFloat(root.style.left) || 0, top: parseFloat(root.style.top) || 0 };
    movedRef.current = false;

    const onUp = () => {
      draggingRef.current = false;
      if (strip.hasPointerCapture(pointerId)) strip.releasePointerCapture(pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      if (ev.buttons === 0) {
        onUp();
        return;
      }
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!movedRef.current) {
        if (Math.hypot(dx, dy) < DRAG_SLOP_PX) return;
        movedRef.current = true;
        draggingRef.current = true;
        cancelFlightRef.current();
        strip.setPointerCapture(pointerId);
      }
      floatPos = clampFloat(origin.left + dx, origin.top + dy);
      root.style.left = `${floatPos.left}px`;
      root.style.top = `${floatPos.top}px`;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
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
        flying && "will-change-transform"
      )}
    >
      {/* Title strip, mini player only: drag handle; the title returns to
          the session. touch-action none so a pen or touch drag is ours. */}
      {floating && (
        <div
          onPointerDown={onStripPointerDown}
          className={cn(
            "flex shrink-0 cursor-grab touch-none select-none items-center gap-1 border-b border-dc-hairline bg-white pl-1.5 pr-1 transition-opacity duration-150 ease-out active:cursor-grabbing motion-reduce:transition-none",
            flying ? "opacity-0" : "opacity-100"
          )}
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
      <div ref={videoRef} className="min-h-0 flex-1 bg-black">
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
