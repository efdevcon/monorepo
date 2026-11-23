"use client";

import React, { useEffect, useRef, useState } from "react";
import { Link } from "@/components/common/link";
import {
  ensureIpfsServiceWorker,
  ipfsGatewayUrl,
  resolveIpfsVideo,
} from "@/utils/ipfs";

export type IpfsPlayerStatus = "starting" | "loading" | "ready" | "error" | "unsupported";
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

const MESSAGES: Record<Status, string> = {
  starting: "Starting in-browser IPFS node…",
  loading: "Finding peers and verifying video from IPFS…",
  ready: "",
  error: "This video couldn't be retrieved from the IPFS network right now. It may not be pinned by any reachable peer.",
  unsupported: "Your browser can't run the verified IPFS player (service workers are unavailable).",
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let hls: { destroy(): void } | null = null;

    setStatus("starting");

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
        hls = instance;
        instance.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal && !cancelled) {
            console.warn("IPFS HLS playback error", data);
            setStatus("error");
          }
        });
        instance.loadSource(source.url);
        instance.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
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
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [cid]);

  const overlay = MESSAGES[status];
  const failed = status === "error" || status === "unsupported";

  return (
    <div className={`relative w-full h-full ${status === "ready" ? "" : "bg-black"}`}>
      <video
        ref={videoRef}
        controls
        preload="metadata"
        playsInline
        aria-label={title ? `${title} (IPFS)` : "IPFS video"}
        className={`block w-full h-full ${fit === "cover" ? "object-cover" : "object-contain"}`}
        onLoadedMetadata={(e) => {
          setFit(fitFor(e.currentTarget));
          setStatus("ready");
        }}
        // Fires when the intrinsic size changes, e.g. hls.js switching renditions.
        onResize={(e) => setFit(fitFor(e.currentTarget))}
        onError={(e) => {
          // Ignore the error fired by the cleanup's removeAttribute("src").
          if (e.currentTarget.getAttribute("src")) setStatus("error");
        }}
      />

      {overlay && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-6 text-center text-white">
          {!failed && (
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
          <p className="max-w-md text-sm">{overlay}</p>
          {failed && (
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
