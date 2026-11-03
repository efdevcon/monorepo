"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import cn from "classnames";
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
const FLOAT_MARGIN = 16;
/** Matches the side panel's slide (Schedule.tsx), so a dock into it lands with it. */
const FLIGHT_MS = 300;

type Mode = "docked" | "floating";

/**
 * The one desktop video player (see dock.ts). Mounted once in the
 * page layout, outside every pane, with no transformed ancestor (a fixed
 * box under a transform would pin to that ancestor instead of the window).
 * Renders nothing until a slot is on screen; after that the iframe lives
 * here, positioned every frame over the visible slot, clipped to what the
 * slot's scroll containers show of it, or floating bottom-right while no
 * slot is visible and the video is playing. A stream that was not playing
 * when its slot went away is dropped rather than floated.
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
  const [mode, setMode] = useState<Mode>("docked");
  // A CSS transition only during a dock ↔ float flight: while tracking a
  // slot the box must follow it at once (scrolling, the panel's own slide).
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
    let flightTimer: ReturnType<typeof setTimeout> | undefined;

    const place = () => {
      const target = visibleSlot();
      if (target) {
        if (target.stream.src !== stream.src) {
          // Another session's stream is on screen: the dock remounts for it.
          setCurrentStream(target.stream);
          return;
        }
        if (target.stream.sessionId !== stream.sessionId) setCurrentStream(target.stream);
        const { rect, inset } = target;
        root.style.top = `${rect.top}px`;
        root.style.left = `${rect.left}px`;
        root.style.width = `${rect.width}px`;
        root.style.height = `${rect.height}px`;
        root.style.clipPath =
          inset.top || inset.right || inset.bottom || inset.left
            ? `inset(${inset.top}px ${inset.right}px ${inset.bottom}px ${inset.left}px)`
            : "";
        switchMode("docked");
        return;
      }
      if (lastMode !== "floating" && !playingRef.current) {
        // Left the session without playing: nothing to carry along.
        setCurrentStream(null);
        return;
      }
      root.style.top = `${window.innerHeight - FLOAT_MARGIN - STRIP_H - FLOAT_VIDEO_H}px`;
      root.style.left = `${window.innerWidth - FLOAT_MARGIN - FLOAT_W}px`;
      root.style.width = `${FLOAT_W}px`;
      root.style.height = `${STRIP_H + FLOAT_VIDEO_H}px`;
      root.style.clipPath = "";
      switchMode("floating");
    };

    const switchMode = (next: Mode) => {
      if (lastMode === next) return;
      const first = lastMode === null;
      lastMode = next;
      setMode(next);
      if (first) return;
      setFlying(true);
      clearTimeout(flightTimer);
      flightTimer = setTimeout(() => setFlying(false), FLIGHT_MS);
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      place();
    };
    place();
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(flightTimer);
    };
  }, [stream.src, stream.sessionId]);

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
      {/* Title strip, mini player only: the title returns to the session. */}
      {floating && (
        <div
          className="flex shrink-0 items-center gap-2 border-b border-dc-hairline bg-white pl-3 pr-1"
          style={{ height: STRIP_H }}
        >
          <button
            type="button"
            onClick={() => openDetail("session", stream.sessionId)}
            className="min-w-0 flex-1 cursor-pointer truncate text-left text-[13px] font-semibold leading-none text-dc-fg2 hover:underline"
          >
            {stream.title}
          </button>
          <CloseButton onClick={() => setCurrentStream(null)} aria-label="Close player" />
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
