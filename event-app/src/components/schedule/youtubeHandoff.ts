"use client";

/**
 * Playback hand-off between two YouTube embeds of the same video.
 *
 * An iframe reloads whenever it is moved in the DOM, so the desktop side
 * panel and the expanded page (`/schedule/<id>`) cannot share one player:
 * each mounts its own `<iframe>` through SessionMedia. Before this the panel
 * kept playing behind display:none while the page mounted a second, paused
 * copy, and pressing play there gave an echo (reported 2026-11-03).
 *
 * Now every desktop player registers here, keyed by its embed URL, and
 * reports its state through the YouTube IFrame Player API (loaded lazily,
 * online only). A player mounting for a URL that is playing elsewhere, or
 * was playing within the last few seconds, starts with `autoplay=1` (and
 * `start=<seconds>` for a recording) so the stream carries on in the new
 * place; the old player unmounts in the same commit (SessionDetailsPanel's
 * `showMedia`). Audible autoplay needs the page to have been interacted
 * with, which the Expand / Back click guarantees.
 *
 * The API object is never `destroy()`ed: React removes the iframe itself,
 * and the API's destroy also removes it, so the two would race. A detached
 * player receives no more messages and is dropped from this map.
 */

type PlayerState = -1 | 0 | 1 | 2 | 3 | 5;

interface YTPlayer {
  getCurrentTime(): number;
  getPlayerState(): PlayerState;
}

interface YTNamespace {
  Player: new (
    el: HTMLIFrameElement,
    options: {
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: PlayerState; target: YTPlayer }) => void;
      };
    }
  ) => YTPlayer;
}

interface YTWindow extends Window {
  YT?: Partial<YTNamespace>;
  onYouTubeIframeAPIReady?: () => void;
}

const API_SRC = "https://www.youtube.com/iframe_api";
/** PLAYING, or BUFFERING after a play: the viewer wants sound. */
const ACTIVE_STATES: ReadonlySet<PlayerState> = new Set([1, 3]);
/** A snapshot from an unmounted player is good for this long. */
const SNAPSHOT_TTL_MS = 15_000;

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
      // Let a later mount try again (the first may have been offline).
      apiPromise = null;
      script.remove();
      reject(new Error("YouTube IFrame API failed to load"));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

interface Entry {
  /** Set once the API has attached; null again after unmount. */
  player: YTPlayer | null;
  playing: boolean;
  /** Last known position, kept for the snapshot after unmount. */
  time: number;
  /** When the snapshot was taken (unmount); live entries ignore it. */
  snapshotAt: number;
}

const entries = new Map<string, Entry>();

/**
 * Track the player in `iframe` under `key` (the embed URL without the
 * hand-off params). Returns the unregister function for the effect cleanup.
 */
export function registerYouTubePlayer(iframe: HTMLIFrameElement, key: string): () => void {
  const entry: Entry = { player: null, playing: false, time: 0, snapshotAt: 0 };
  entries.set(key, entry);
  let cancelled = false;

  loadApi()
    .then((YT) => {
      if (cancelled) return;
      entry.player = new YT.Player(iframe, {
        events: {
          onReady: (e) => {
            if (!cancelled) entry.player = e.target;
          },
          onStateChange: (e) => {
            entry.playing = ACTIVE_STATES.has(e.data);
            try {
              entry.time = e.target.getCurrentTime();
            } catch {
              /* not ready yet */
            }
          },
        },
      });
    })
    .catch(() => {
      /* No API: the next mount starts paused, as before. */
    });

  return () => {
    cancelled = true;
    // A newer player for the same URL (the one taking over) owns the key now.
    if (entries.get(key) !== entry) return;
    try {
      if (entry.player) entry.time = entry.player.getCurrentTime();
    } catch {
      /* ignore */
    }
    entry.player = null;
    entry.snapshotAt = Date.now();
  };
}

/**
 * The playback another player of `key` is in the middle of, or null when
 * none is playing. Read at render time by the mounting player, so a live
 * entry is still the old player (same commit) and a snapshot covers the
 * reverse order.
 */
export function playingHandoff(key: string): { time: number } | null {
  const entry = entries.get(key);
  if (!entry || !entry.playing) return null;
  if (entry.player) {
    try {
      return { time: entry.player.getCurrentTime() };
    } catch {
      return { time: entry.time };
    }
  }
  if (Date.now() - entry.snapshotAt > SNAPSHOT_TTL_MS) {
    entries.delete(key);
    return null;
  }
  return { time: entry.time };
}
