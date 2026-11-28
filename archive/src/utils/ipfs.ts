/**
 * IPFS helpers. Videos are played through our own service worker
 * (src/sw/ipfs-sw.ts) at `/ipfs/<cid>`, which fetches and hash-verifies the
 * content in the browser. The public gateway link is only for "open
 * elsewhere" — it is not verified.
 */

/** Path gateway; dweb.link redirects to the origin-isolated subdomain form (CIDv1). */
export const IPFS_PUBLIC_GATEWAY = "https://dweb.link";

export const ipfsGatewayUrl = (cid: string) => `${IPFS_PUBLIC_GATEWAY}/ipfs/${cid}`;

/** Same-origin path served by the IPFS service worker. */
export const ipfsVerifiedPath = (cid: string) => `/ipfs/${cid}`;

export const IPFS_SW_URL = "/ipfs-sw.js";

/** Root playlist of an HLS package published as an IPFS directory. */
export const HLS_MASTER_PLAYLIST = "master.m3u8";

export type IpfsVideoSource =
  | { kind: "hls"; url: string }
  | { kind: "file"; url: string }
  | { kind: "unavailable" };

/**
 * Works out how to play a CID (needs the service worker in control): an HLS
 * package if `<cid>/master.m3u8` exists, otherwise the CID as a single video
 * file. A gateway timeout (504) means nothing reachable has the content.
 */
export async function resolveIpfsVideo(cid: string): Promise<IpfsVideoSource> {
  const base = ipfsVerifiedPath(cid);
  const master = `${base}/${HLS_MASTER_PLAYLIST}`;

  try {
    const res = await fetch(master);
    if (res.ok) {
      const text = await res.text();
      if (text.trimStart().startsWith("#EXTM3U")) return { kind: "hls", url: master };
    }
    if (res.status >= 500) return { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }

  return { kind: "file", url: base };
}

let registration: Promise<boolean> | null = null;

/**
 * Registers the IPFS service worker and resolves once it controls this page
 * (only then are `/ipfs/` requests intercepted). Resolves false where service
 * workers are unavailable (old browsers, private modes, non-secure origins).
 */
export function ensureIpfsServiceWorker(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(false);
  }

  registration ??= (async () => {
    try {
      await navigator.serviceWorker.register(IPFS_SW_URL, { scope: "/" });
      if (navigator.serviceWorker.controller) return true;

      // First visit: the worker claims the page when it activates. After a hard
      // reload it is already active and won't activate again, so ask it to
      // claim this page explicitly.
      const claimed = new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
      });
      const takeControl = (async () => {
        const ready = await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) {
          ready.active?.postMessage("claim");
          await claimed;
        }
      })();
      await Promise.race([takeControl, new Promise((r) => setTimeout(r, 5_000))]);
      if (navigator.serviceWorker.controller) return true;
      registration = null;
      return false;
    } catch (err) {
      console.warn("IPFS service worker unavailable", err);
      registration = null;
      return false;
    }
  })();

  return registration;
}
