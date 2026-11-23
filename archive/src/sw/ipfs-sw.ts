/// <reference lib="webworker" />

/**
 * IPFS service worker: answers same-origin `/ipfs/<cid>[/path]` requests with
 * @helia/verified-fetch, so a plain <video src="/ipfs/<cid>"> streams content
 * that is fetched from the IPFS network (libp2p peers, trustless gateways) and
 * hash-verified block by block in the browser — no gateway has to be trusted.
 *
 * Range requests pass straight through, so the video element can seek.
 * Every other request is left alone (no respondWith → normal network).
 *
 * Bundled to public/ipfs-sw.js by scripts/build-sw.mjs (not by Next).
 */

import { createVerifiedFetch, type VerifiedFetch } from "@helia/verified-fetch";

declare const self: ServiceWorkerGlobalScope;

/** Give up if the first bytes (root block + headers) don't arrive in time. */
const FIRST_BYTE_TIMEOUT_MS = 90_000;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

let verifiedFetchPromise: Promise<VerifiedFetch> | null = null;

function getVerifiedFetch() {
  verifiedFetchPromise ??= createVerifiedFetch(
    {
      gateways: ["https://trustless-gateway.link"],
      routers: ["https://delegated-ipfs.dev"],
    },
    { contentTypeParser: sniffVideoType }
  ).catch((err) => {
    verifiedFetchPromise = null; 
    throw err;
  });
  return verifiedFetchPromise;
}

const TYPES_BY_EXTENSION: Record<string, string> = {
  m3u8: "application/vnd.apple.mpegurl",
  m4s: "video/iso.segment",
  mp4: "video/mp4",
  m4a: "audio/mp4",
  webm: "video/webm",
  ts: "video/mp2t",
};

function sniffVideoType(bytes: Uint8Array, fileName?: string): string | undefined {
  const extension = fileName?.split(".").pop()?.toLowerCase();
  if (extension && TYPES_BY_EXTENSION[extension]) return TYPES_BY_EXTENSION[extension];

  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end));

  if (bytes.length >= 12 && ascii(4, 8) === "ftyp") {
    return ascii(8, 12) === "qt  " ? "video/quicktime" : "video/mp4";
  }
  if (bytes.length >= 8 && ["styp", "moof"].includes(ascii(4, 8))) {
    return "video/iso.segment"; // fMP4 media segment
  }
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return "video/webm";
  }
  if (bytes.length >= 7 && ascii(0, 7) === "#EXTM3U") {
    return "application/vnd.apple.mpegurl";
  }
  if (bytes.length >= 1 && bytes[0] === 0x47) {
    return "video/mp2t"; 
  }
  return undefined;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith("/ipfs/")) return;
  if (request.method !== "GET" && request.method !== "HEAD") return;

  event.respondWith(handleIpfs(request, url));
});

async function handleIpfs(request: Request, url: URL): Promise<Response> {
  const resource = `ipfs://${url.pathname.slice("/ipfs/".length).replace(/\/$/, "")}${url.search}`;

  const abort = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    abort.abort();
  }, FIRST_BYTE_TIMEOUT_MS);
  request.signal.addEventListener("abort", () => abort.abort(), { once: true });

  try {
    const verifiedFetch = await getVerifiedFetch();

    const headers = new Headers();
    const range = request.headers.get("range");
    if (range) headers.set("range", range);

    const response = await verifiedFetch(resource, {
      method: request.method,
      headers,
      signal: abort.signal,
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = timedOut ? 504 : 502;
    return new Response(`IPFS fetch failed: ${message}`, {
      status,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  } finally {
    clearTimeout(timer);
  }
}
