/// <reference lib="webworker" />

/**
 * IPFS service worker: answers same-origin `/ipfs/<cid>[/path]` requests with
 * @helia/verified-fetch, so a plain <video src="/ipfs/<cid>"> streams content
 * that is hash-verified block by block in the browser — no server has to be
 * trusted, whoever sent the bytes.
 *
 * Two stages:
 *   1. Devcon gateways only (trustless gateway protocol, HTTP). Fast path
 *      while at least one of our nodes is up and has the video.
 *   2. Fallback when stage 1 fails (we don't have it / our nodes are down):
 *      routers (ours, which also know about community mirrors, plus
 *      delegated-ipfs.dev), direct libp2p connections to providers, and
 *      trustless-gateway.link.
 * A root CID that failed stage 1 skips it for a while, so the segments of an
 * HLS video don't each wait for the stage 1 timeout.
 *
 * Range requests pass straight through, so the video element can seek.
 * Every other request is left alone (no respondWith → normal network).
 *
 * Bundled to public/ipfs-sw.js by scripts/build-sw.mjs (not by Next), which
 * also injects DEVCON_IPFS_CONFIG from the environment.
 */

import { createVerifiedFetch, type VerifiedFetch } from "@helia/verified-fetch";
import { createHeliaLight } from "helia";
import { withHTTP } from "@helia/http";
import { fallbackRouter } from "@helia/fallback-router";

declare const self: ServiceWorkerGlobalScope;

/** Injected at build time (scripts/build-sw.mjs). */
declare const DEVCON_IPFS_CONFIG: {
  /** Our trustless gateways (stage 1), e.g. https://ipfs-1.devcon.org */
  gateways: string[];
  /** Our /routing/v1 endpoints (stage 2, alongside public routers). */
  routers: string[];
};

const OWN_GATEWAYS = DEVCON_IPFS_CONFIG.gateways;
const OWN_ROUTERS = DEVCON_IPFS_CONFIG.routers;
const PUBLIC_ROUTERS = ["https://delegated-ipfs.dev"];
const PUBLIC_GATEWAYS = ["https://trustless-gateway.link"];

/** Stage 1 gets this long for first bytes before we fall back. */
const OWN_FIRST_BYTE_TIMEOUT_MS = 10_000;
/** Stage 2 gets this long for first bytes before giving up. */
const NETWORK_FIRST_BYTE_TIMEOUT_MS = 90_000;
/** How long a root CID that failed stage 1 goes straight to stage 2. */
const SKIP_OWN_FOR_MS = 5 * 60_000;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

const fetchOptions = { contentTypeParser: sniffVideoType };

let ownFetchPromise: Promise<VerifiedFetch> | null = null;
let networkFetchPromise: Promise<VerifiedFetch> | null = null;

/**
 * Lists our gateways as providers of every CID. Registered as a regular
 * router, not via `recursiveGateways`: Helia only consults fallback routers
 * after the regular ones finish, and with no regular router that never
 * happens, so the request would hang.
 */
function ownGatewaysRouter() {
  const gateways = fallbackRouter({ gateways: OWN_GATEWAYS, shuffle: true });
  return {
    name: "devcon-gateways",
    async *findProviders(...args: Parameters<NonNullable<typeof gateways.findProviders>>) {
      for await (const provider of gateways.findProviders!(...args)) {
        yield { ...provider, fallback: false, router: "devcon-gateways" };
      }
    },
  };
}

/** Stage 1: HTTP-only Helia whose only block source is our gateways. */
function getOwnFetch() {
  ownFetchPromise ??= (async () => {
    const helia = withHTTP(createHeliaLight(), {
      delegatedRouters: [],
      recursiveGateways: [],
    });
    helia.addRouter(ownGatewaysRouter() as Parameters<typeof helia.addRouter>[0]);
    await helia.start();
    return createVerifiedFetch(helia, fetchOptions);
  })().catch((err) => {
    ownFetchPromise = null;
    throw err;
  });
  return ownFetchPromise;
}

/** Stage 2: full Helia (libp2p + bitswap, routers, public trustless gateway). */
function getNetworkFetch() {
  networkFetchPromise ??= createVerifiedFetch(
    {
      gateways: PUBLIC_GATEWAYS,
      routers: [...OWN_ROUTERS, ...PUBLIC_ROUTERS],
    },
    fetchOptions
  ).catch((err) => {
    networkFetchPromise = null;
    throw err;
  });
  return networkFetchPromise;
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

/** Root CID → time until which stage 1 is skipped for it. */
const skipOwnUntil = new Map<string, number>();

class FirstByteTimeout extends Error {}

async function handleIpfs(request: Request, url: URL): Promise<Response> {
  const path = url.pathname.slice("/ipfs/".length).replace(/\/$/, "");
  const root = path.split("/")[0];
  const resource = `ipfs://${path}${url.search}`;

  try {
    const useOwn =
      OWN_GATEWAYS.length > 0 && (skipOwnUntil.get(root) ?? 0) < Date.now();

    if (useOwn) {
      try {
        const response = await attempt(getOwnFetch, resource, request, OWN_FIRST_BYTE_TIMEOUT_MS);
        // < 500 is a verified answer (incl. 404 "no such path"); 5xx means
        // our nodes couldn't get the blocks.
        if (response.status < 500) return withSource(response, "devcon");
        response.body?.cancel().catch(() => {});
      } catch (err) {
        if (request.signal.aborted) throw err;
      }
      skipOwnUntil.set(root, Date.now() + SKIP_OWN_FOR_MS);
    }

    const response = await attempt(getNetworkFetch, resource, request, NETWORK_FIRST_BYTE_TIMEOUT_MS);
    return withSource(response, "network");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`IPFS fetch failed: ${message}`, {
      status: err instanceof FirstByteTimeout ? 504 : 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

/**
 * One verified-fetch call, aborted when the page cancels the request (e.g.
 * seeking) or when no response arrives within `timeoutMs`.
 */
async function attempt(
  getFetch: () => Promise<VerifiedFetch>,
  resource: string,
  request: Request,
  timeoutMs: number
): Promise<Response> {
  const abort = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    abort.abort();
  }, timeoutMs);
  request.signal.addEventListener("abort", () => abort.abort(), { once: true });

  try {
    const verifiedFetch = await getFetch();

    const headers = new Headers();
    const range = request.headers.get("range");
    if (range) headers.set("range", range);

    return await verifiedFetch(resource, {
      method: request.method,
      headers,
      signal: abort.signal,
    });
  } catch (err) {
    if (timedOut) throw new FirstByteTimeout(`no response within ${timeoutMs / 1000}s`);
    throw err;
  } finally {
    // The abort listener stays: cancelling mid-stream (seeking) should stop the fetch too.
    clearTimeout(timer);
  }
}

/** Tags which stage served a response (visible in DevTools → Network). */
function withSource(response: Response, source: "devcon" | "network"): Response {
  const headers = new Headers(response.headers);
  headers.set("x-ipfs-source", source);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
