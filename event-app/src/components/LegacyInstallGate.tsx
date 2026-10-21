"use client";

import { useEffect, useState } from "react";
import { PrimaryButton, PrimaryLinkButton, SecondaryButton } from "@/components/Buttons";
import { INTRO_COVER_ID } from "@/components/introCover";
import { knownInstallVersion } from "@/data/install/deviceInstallVersion";
import { readPref, writePref } from "@/data/prefs";
import { isIOS, isStandalone } from "@/utils/platform";

/**
 * Installs that should not run this app any more (docs/app-domain-migration.md)
 * get a "this app has moved" screen instead, on every launch, pointing to
 * app.devcon.org:
 *
 * 1. Installs of the old Devcon 7 app. app.devcon.org was the old app; once
 *    it serves this one, a phone that had the old app on its Home Screen opens
 *    this app under the old name and icon, with the old app's storage (caches,
 *    settings, push subscription) around it. iOS never renames an installed
 *    app and Chrome on Android rebuilds one only on its own schedule, so both
 *    get a clean re-install. The tell is the launch URL: every icon of this
 *    app starts at `/?install=N` (src/data/install/installVersion.ts), the
 *    old app's at a bare `/`; and the old app's leftovers (its localStorage
 *    key or caches) confirm the old app was here. The leftovers alone would
 *    not do on Android, where an installed app shares Chrome's storage and a
 *    fresh install on a phone that once browsed the old app would match too.
 * 2. Installs of this app from its pre-launch host, devcon-event-app.netlify.app.
 *    After the swap that host answers with a redirect (Netlify, while it is
 *    still this site's address) or with the retired-host site
 *    (event-app-retired/, whose worker switches every install off on its next
 *    launch, however old its copy of the app). Both answer the manifest with a
 *    redirect: a same-origin HEAD (the service worker only routes GET, so it
 *    reaches the network) that comes back as one says the host is retired;
 *    remembered on the device so an offline launch still knows. A browser tab
 *    there is simply sent to the same page on app.devcon.org.
 */

/** Off switch for swap day: false lets both kinds of install run the app. */
const LEGACY_INSTALL_GATE_ENABLED = true;

const NEW_APP_ORIGIN = "https://app.devcon.org";
const NEW_APP_URL = `${NEW_APP_ORIGIN}/`;

/** The old app's persisted store (devcon-app/src/store/app-store.ts). */
const OLD_APP_STORAGE_KEY = "devcon-app-storage";
/**
 * Caches only the old app created (devcon-app/runtime-cache.js, next-pwa's
 * Workbox precache). This app's worker uses Serwist's own names
 * (serwist-precache-*, pages, next-static, static-images...), none of these.
 */
const OLD_APP_CACHES = new Set(["devcon-api-version", "devcon-api-sessions", "devcon-api-speakers", "next-data"]);

/** This app's pre-launch host, retired once app.devcon.org is primary. */
const RETIRED_HOST = "devcon-event-app.netlify.app";
const RETIRED_HOST_PREF = "legacy.retiredHost";

async function isOldAppInstall(): Promise<boolean> {
  if (!isStandalone()) return false;
  // Launched from (or has launched from) an icon of this app: never the old one.
  if ((await knownInstallVersion()) !== null) return false;
  try {
    if (localStorage.getItem(OLD_APP_STORAGE_KEY) !== null) return true;
  } catch {
    // Storage blocked: fall through to the caches.
  }
  try {
    const names = await caches.keys();
    return names.some((name) => name.startsWith("workbox-precache") || OLD_APP_CACHES.has(name));
  } catch {
    return false;
  }
}

/** True once this host answers with a redirect (Netlify sending it to the primary domain). */
async function hostIsRetired(): Promise<boolean> {
  if ((await readPref<boolean>(RETIRED_HOST_PREF)) === true) return true;
  try {
    const res = await fetch("/manifest.webmanifest", { method: "HEAD", cache: "no-store", redirect: "manual" });
    if (res.type !== "opaqueredirect") return false;
    void writePref(RETIRED_HOST_PREF, true);
    return true;
  } catch {
    // Offline or blocked: can't tell, and nothing remembered yet.
    return false;
  }
}

export function LegacyInstallGate({ children }: { children: React.ReactNode }) {
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    if (!LEGACY_INSTALL_GATE_ENABLED) return;
    let cancelled = false;
    const onRetiredHost = window.location.hostname === RETIRED_HOST;
    void (onRetiredHost ? hostIsRetired() : isOldAppInstall()).then((gate) => {
      if (cancelled || !gate) return;
      if (onRetiredHost && !isStandalone()) {
        // A tab: no install to replace, just carry on at the new address.
        const { pathname, search, hash } = window.location;
        window.location.replace(`${NEW_APP_ORIGIN}${pathname}${search}${hash}`);
        return;
      }
      setMoved(true);
      // The first-launch cover (layout.tsx) waits for the intro splash, which
      // never mounts here.
      document.getElementById(INTRO_COVER_ID)?.remove();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Rendered as usual until the check says otherwise, so the server and the
  // first client render match; the app is then unmounted, not covered.
  return moved ? <MovedPlaceholder /> : children;
}

function MovedPlaceholder() {
  const [copied, setCopied] = useState(false);
  const ios = isIOS();
  // iOS: a Home Screen app opens other sites in a browser sheet that has no
  // Add to Home Screen; `x-safari-https://` hands the URL to Safari itself
  // (same lever as the install hop in InstallAppButton.tsx). Must run inside
  // the tap.
  const openInSafari = () => {
    window.location.href = NEW_APP_URL.replace(/^https:\/\//, "x-safari-https://");
  };
  // Android: an installed app opens other sites in an in-app browser tab,
  // which has no Install, and Chrome routes its own schemes and intent URLs
  // there too. The system share sheet is the one hand-off it leaves alone:
  // picking Chrome there opens a real Chrome tab.
  const android = /Android/.test(navigator.userAgent) && typeof navigator.share === "function";
  const openInChrome = () => {
    void navigator.share({ title: "Devcon 8 App", url: NEW_APP_URL }).catch(() => undefined);
  };
  const copy = () => {
    void navigator.clipboard
      ?.writeText(NEW_APP_URL)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => undefined);
  };

  return (
    <main className="fixed inset-0 z-[100] flex items-center justify-center bg-white px-6 font-heading text-dc-fg">
      <div className="flex max-w-sm flex-col items-center gap-5 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/login/devcon-8-logo.svg" alt="Devcon 8" className="h-16 w-auto" />
        <h1 className="text-[24px] font-bold leading-tight tracking-[-0.5px]">This app has moved</h1>
        <p className="text-[16px] leading-6 text-dc-fg2">
          {ios
            ? "Add the new Devcon app to your Home Screen: open app.devcon.org in Safari, tap Share, then Add to Home Screen."
            : "Install the new Devcon app: open app.devcon.org in your browser, then Install app or Add to Home Screen."}{" "}
          Then delete this icon, it won&apos;t work any more.
        </p>
        {ios && (
          <p className="text-[14px] leading-5 text-dc-muted">
            If a browser sheet opens instead of Safari, tap its Safari button.
          </p>
        )}
        {android && <p className="text-[14px] leading-5 text-dc-muted">Pick Chrome in the sheet that opens.</p>}
        <div className="flex w-full flex-col gap-3">
          {ios ? (
            <PrimaryButton type="button" onClick={openInSafari}>
              Open in Safari
            </PrimaryButton>
          ) : android ? (
            <PrimaryButton type="button" onClick={openInChrome}>
              Open in Chrome
            </PrimaryButton>
          ) : (
            <PrimaryLinkButton href={NEW_APP_URL} target="_blank" rel="noopener noreferrer">
              Open app.devcon.org
            </PrimaryLinkButton>
          )}
          <SecondaryButton type="button" onClick={copy}>
            {copied ? "Copied" : "Copy link"}
          </SecondaryButton>
        </div>
      </div>
    </main>
  );
}
