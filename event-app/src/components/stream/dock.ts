"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { headerOffsetNow } from "@/hooks/useIsDesktop";

/**
 * One desktop video player for the whole app (StreamDock.tsx).
 *
 * An iframe reloads whenever it is moved in the DOM, so the side panel and
 * the expanded page cannot pass a playing YouTube embed between them, and a
 * pane hidden on a tab switch kept its embed playing unseen. Instead the
 * views render an empty *slot* (SessionMedia on desktop) and register it
 * here; the dock owns the single iframe, fixed-positioned over whichever
 * registered slot is on screen, and floats it to the bottom-right corner
 * as a mini player while none is (another tab, a closed panel). Expand and
 * Back therefore keep the very same player, visuals and all.
 *
 * Slots are kept in registration order; the newest visible one wins (the
 * expanded page registers after the panel it covers). The visible stream
 * is always the current one: opening another session with a stream in the
 * panel swaps the player to it.
 */

export interface DockStream {
  /** Embed URL without the player-API params (the dock adds them). */
  src: string;
  sessionId: string;
  title: string;
  /** A live stream (rejoins at the edge on reload) rather than a recording. */
  live: boolean;
}

interface Slot {
  el: HTMLElement;
  stream: DockStream;
  /** Ancestors that clip the slot (overflow not visible), cached at claim. */
  clips: HTMLElement[];
}

const slots: Slot[] = [];
let current: DockStream | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeStream(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCurrentStream(): DockStream | null {
  return current;
}

/** The dock's own switch: the visible slot's stream, or none (closed). */
export function setCurrentStream(stream: DockStream | null): void {
  if (stream === current) return;
  if (stream && current && stream.src === current.src && stream.sessionId === current.sessionId) return;
  current = stream;
  emit();
}

export function hasSlots(): boolean {
  return slots.length > 0;
}

function clippingAncestors(el: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.overflowX !== "visible" || style.overflowY !== "visible") out.push(node);
  }
  return out;
}

/** Register `el` as the place the current stream should be rendered. */
export function claimSlot(el: HTMLElement, stream: DockStream): () => void {
  const slot: Slot = { el, stream, clips: clippingAncestors(el) };
  slots.push(slot);
  return () => {
    const i = slots.indexOf(slot);
    if (i >= 0) slots.splice(i, 1);
  };
}

/**
 * Mount-time registration for a slot element; `stream` null registers
 * nothing. A layout effect, so the slot exists before the first paint of
 * the view that holds it: the expanded page's slot must be known the moment
 * the panel's goes hidden, or the dock sees a frame with no slot at all.
 */
export function useStreamSlot(
  ref: React.RefObject<HTMLElement | null>,
  stream: DockStream | null
): void {
  const key = stream ? `${stream.src}\n${stream.sessionId}\n${stream.title}\n${stream.live}` : null;
  useLayoutEffect(() => {
    if (!ref.current || !stream) return;
    return claimSlot(ref.current, stream);
    // `key` captures every field of `stream`, which callers build inline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, key]);
}

export interface DockTarget {
  el: HTMLElement;
  stream: DockStream;
  /** The slot's border box (viewport coordinates). */
  rect: DOMRect;
  /** How much of each edge the clipping ancestors hide, in px. */
  inset: { top: number; right: number; bottom: number; left: number };
}

/**
 * The newest registered slot with any visible area: inside a display:none
 * pane the rect is empty, inside a closed (width 0) or scrolled panel the
 * clip swallows it. Read every frame by the dock. The sticky app header
 * is not an overflow ancestor of anything, so the viewport is cut at its
 * bottom edge too: the dock paints above the header (a short window
 * scrolls the expanded page under it) and would otherwise cover it.
 */
export function visibleSlot(): DockTarget | null {
  const viewportTop = headerOffsetNow();
  for (let i = slots.length - 1; i >= 0; i--) {
    const slot = slots[i];
    const rect = slot.el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    let top = Math.max(rect.top, viewportTop);
    let left = Math.max(rect.left, 0);
    let right = Math.min(rect.right, window.innerWidth);
    let bottom = Math.min(rect.bottom, window.innerHeight);
    for (const clip of slot.clips) {
      const c = clip.getBoundingClientRect();
      // Padding box: inside the borders.
      top = Math.max(top, c.top + clip.clientTop);
      left = Math.max(left, c.left + clip.clientLeft);
      right = Math.min(right, c.left + clip.clientLeft + clip.clientWidth);
      bottom = Math.min(bottom, c.top + clip.clientTop + clip.clientHeight);
    }
    if (right - left <= 0 || bottom - top <= 0) continue;
    return {
      el: slot.el,
      stream: slot.stream,
      rect,
      inset: {
        top: top - rect.top,
        left: left - rect.left,
        right: rect.right - right,
        bottom: rect.bottom - bottom,
      },
    };
  }
  return null;
}

export function useCurrentStream(): DockStream | null {
  return useSyncExternalStore(subscribeStream, getCurrentStream, () => null);
}

// ---------------------------------------------------------------------------
// YouTube IFrame Player API: the dock only needs "is it playing", to decide
// whether a stream whose slot just went away floats or is dropped.

type PlayerState = -1 | 0 | 1 | 2 | 3 | 5;

interface YTNamespace {
  Player: new (
    el: HTMLIFrameElement,
    options: { events?: { onStateChange?: (e: { data: PlayerState }) => void } }
  ) => unknown;
}

interface YTWindow extends Window {
  YT?: Partial<YTNamespace>;
  onYouTubeIframeAPIReady?: () => void;
}

const API_SRC = "https://www.youtube.com/iframe_api";
/** PLAYING, or BUFFERING after a play: the viewer wants the stream. */
const ACTIVE_STATES: ReadonlySet<PlayerState> = new Set([1, 3]);

let apiPromise: Promise<YTNamespace> | null = null;

function loadApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const w = window as YTWindow;
    if (w.YT?.Player) {
      resolve(w.YT as YTNamespace);
      return;
    }
    const previous = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(w.YT as YTNamespace);
    };
    const script = document.createElement("script");
    script.src = API_SRC;
    script.async = true;
    script.onerror = () => {
      // Let a later mount try again (this one may have been offline).
      apiPromise = null;
      script.remove();
      reject(new Error("YouTube IFrame API failed to load"));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

const YOUTUBE_EMBED = "https://www.youtube.com/embed/";

/**
 * Only YouTube embeds dock: the play state comes from the Player API, and
 * a StreamEth frame has none, so it would never float and the API would be
 * aimed at a frame that does not speak it. Those keep their own iframe.
 */
export function isDockable(src: string | null): src is string {
  return !!src && src.startsWith(YOUTUBE_EMBED);
}

/** The embed URL with the params the Player API needs to talk to it. */
export function playerApiSrc(src: string): string {
  const url = new URL(src);
  url.searchParams.set("enablejsapi", "1");
  url.searchParams.set("origin", window.location.origin);
  return url.toString();
}

/**
 * Report the iframe's play state through `onChange`. The player object is
 * never `destroy()`ed: React removes the iframe itself and the API's destroy
 * removes it too, so the two would race; a detached player just goes quiet.
 */
export function watchPlayback(
  iframe: HTMLIFrameElement,
  onChange: (playing: boolean) => void
): () => void {
  let cancelled = false;
  loadApi()
    .then((YT) => {
      if (cancelled) return;
      new YT.Player(iframe, {
        events: {
          onStateChange: (e) => {
            if (!cancelled) onChange(ACTIVE_STATES.has(e.data));
          },
        },
      });
    })
    .catch(() => {
      /* No API: the stream is dropped when its slot goes, as before. */
    });
  return () => {
    cancelled = true;
  };
}
