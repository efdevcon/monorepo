"use client";

import React, { useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import { Link } from "@/components/common/link";
import {
  ensureIpfsServiceWorker,
  ipfsGatewayUrl,
  resolveIpfsVideo,
} from "@/utils/ipfs";

export type IpfsPlayerStatus = "starting" | "loading" | "ready" | "error" | "unsupported" | "incompatible";
type Status = IpfsPlayerStatus;

/**
 * Within this ratio difference the video fills its box (object-fit: cover,
 * cropping a pixel or two) instead of letterboxing with thin black bars;
 * clearly different shapes (e.g. old 4:3 recordings) stay fully visible.
 */
const COVER_TOLERANCE = 0.03;

function fitFor(video: HTMLVideoElement): "cover" | "contain" {
  const { videoWidth, videoHeight, clientWidth, clientHeight } = video;
  if (!videoWidth || !videoHeight || !clientWidth || !clientHeight) return "contain";
  const videoRatio = videoWidth / videoHeight;
  const boxRatio = clientWidth / clientHeight;
  return Math.abs(videoRatio / boxRatio - 1) <= COVER_TOLERANCE ? "cover" : "contain";
}

type QualityOption = { level: number; height: number };

function qualityOptions(levels: Hls["levels"]): QualityOption[] {
  const byHeight = new Map<number, QualityOption & { av1: boolean }>();
  levels.forEach((level, index) => {
    if (!level.height) return;
    const av1 = (level.videoCodec ?? "").startsWith("av01");
    const current = byHeight.get(level.height);
    if (!current || (av1 && !current.av1)) {
      byHeight.set(level.height, { level: index, height: level.height, av1 });
    }
  });
  return [...byHeight.values()].sort((a, b) => b.height - a.height);
}

const MESSAGES: Record<Status, string> = {
  starting: "Starting in-browser IPFS node…",
  loading: "Finding peers and verifying video from IPFS…",
  ready: "",
  error: "This video couldn't be retrieved from the IPFS network right now. It may not be pinned by any reachable peer.",
  unsupported: "Your browser can't run the verified IPFS player (service workers are unavailable).",
  incompatible: "Your browser can't play this video's format. Try the YouTube tab, or a newer browser.",
};

/**
 * Plays an IPFS video through the IPFS service worker: every request goes to
 * `/ipfs/<cid>/…` on our own origin, and the worker serves it via Helia's
 * verified-fetch — each block is checked against the CID before playback.
 *
 * The CID is either a single video file, or an HLS package (a directory with
 * master.m3u8 at its root), which plays through hls.js — or natively where
 * Media Source Extensions are missing (older iOS).
 */
export const IpfsPlayer = ({
  cid,
  title,
  onStatusChange,
}: {
  cid: string;
  title?: string;
  /** Lets the page show the playback state elsewhere (e.g. "Verified from IPFS"). */
  onStatusChange?: (status: IpfsPlayerStatus) => void;
}) => {
  const [status, setStatus] = useState<Status>("starting");

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);
  const [fit, setFit] = useState<"cover" | "contain">("contain");
  const videoRef = useRef<HTMLVideoElement>(null);
  const nativeHlsRef = useRef(false);
  const hlsRef = useRef<Hls | null>(null);
  const [qualities, setQualities] = useState<QualityOption[]>([]);
  const [quality, setQuality] = useState(-1);
  const [playingHeight, setPlayingHeight] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const wake = () => {
    setActive(true);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setActive(false), 3000);
  };

  useEffect(() => () => clearTimeout(idleTimer.current), []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    nativeHlsRef.current = false;

    setStatus("starting");
    setQualities([]);
    setQuality(-1);
    setPlayingHeight(null);

    (async () => {
      if (!(await ensureIpfsServiceWorker())) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (cancelled) return;
      setStatus("loading");

      const source = await resolveIpfsVideo(cid);
      if (cancelled) return;

      if (source.kind === "unavailable") return setStatus("error");

      if (source.kind === "file") {
        video.src = source.url;
        return;
      }

      const { default: Hls } = await import("hls.js");
      if (cancelled) return;

      if (Hls.isSupported()) {
        const instance = new Hls();
        hlsRef.current = instance;
        instance.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!cancelled) setQualities(qualityOptions(instance.levels));
        });
        instance.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          if (!cancelled) setPlayingHeight(instance.levels[data.level]?.height ?? null);
        });
        instance.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal && !cancelled) {
            console.warn("IPFS HLS playback error", data);
            const incompatible =
              data.details === Hls.ErrorDetails.MANIFEST_INCOMPATIBLE_CODECS_ERROR ||
              data.details === Hls.ErrorDetails.BUFFER_INCOMPATIBLE_CODECS_ERROR;
            setStatus(incompatible ? "incompatible" : "error");
          }
        });
        instance.loadSource(source.url);
        instance.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        nativeHlsRef.current = true;
        video.src = source.url;
      } else {
        setStatus("unsupported");
      }
    })().catch((err) => {
      console.warn("IPFS player failed", err);
      if (!cancelled) setStatus("error");
    });

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeAttribute("src");
      video.load();
    };
  }, [cid]);

  const overlay = MESSAGES[status];
  const failed = status === "error" || status === "unsupported" || status === "incompatible";

  const chooseQuality = (level: number) => {
    setQuality(level);
    if (hlsRef.current) hlsRef.current.nextLevel = level;
  };

  return (
    <div
      className={`relative w-full h-full ${status === "ready" ? "" : "bg-black"}`}
      onPointerMove={wake}
      onPointerDown={wake}
    >
      <video
        ref={videoRef}
        controls={status === "ready"}
        preload="metadata"
        playsInline
        aria-label={title ? `${title} (IPFS)` : "IPFS video"}
        className={`block w-full h-full ${fit === "cover" ? "object-cover" : "object-contain"}`}
        onPlay={() => {
          setPlaying(true);
          wake();
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => {
          setFit(fitFor(e.currentTarget));
          setStatus("ready");
        }}
        // Fires when the intrinsic size changes, e.g. hls.js switching renditions.
        onResize={(e) => setFit(fitFor(e.currentTarget))}
        onError={(e) => {
          // Ignore the error fired by the cleanup's removeAttribute("src").
          if (!e.currentTarget.getAttribute("src")) return;
          const unplayable =
            nativeHlsRef.current &&
            e.currentTarget.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED;
          setStatus(unplayable ? "incompatible" : "error");
        }}
      />

      {status === "ready" && qualities.length > 1 && (
        <select
          aria-label="Video quality"
          value={quality}
          onChange={(e) => chooseQuality(Number(e.target.value))}
          onFocus={() => {
            setActive(true);
            clearTimeout(idleTimer.current);
          }}
          onBlur={wake}
          className={`absolute right-2 top-2 h-[40px] cursor-pointer rounded bg-black/60 px-3 text-[14px] text-white outline-none transition-opacity duration-300 hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white sm:h-auto sm:px-2 sm:py-1 sm:text-xs ${
            !playing || active ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <option value={-1}>Auto{playingHeight ? ` (${playingHeight}p)` : ""}</option>
          {qualities.map((q) => (
            <option key={q.level} value={q.level}>
              {q.height}p
            </option>
          ))}
        </select>
      )}

      {overlay && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-6 text-center text-white">
          {!failed && (
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
          <p className="max-w-md text-sm">{overlay}</p>
          {failed && status !== "incompatible" && (
            <Link
              href={ipfsGatewayUrl(cid)}
              className="pointer-events-auto text-xs underline opacity-80"
            >
              Try a public gateway (unverified) 🡥
            </Link>
          )}
        </div>
      )}
    </div>
  );
};
