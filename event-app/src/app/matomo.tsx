"use client";

import { trackAppRouter } from "@socialgouv/matomo-next";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useUser } from "@/data/auth/useUser";
import { useInterested } from "@/data/interested/useInterested";
import { INSTALL_PARAM } from "@/data/install/installVersion";
import { isStandalone } from "@/utils/platform";
import {
  DIMENSION,
  MATOMO_SITE_ID,
  MATOMO_URL,
  PUSH_OPEN_HASH,
  analyticsEnabled,
  setDimension,
  starsBand,
  trackEvent,
} from "@/data/analytics/track";

/**
 * Page views and visit dimensions for Matomo (events: `data/analytics/track.ts`).
 *
 * One page view per pathname + query change. The tracked URL is built from
 * those two only, never `location.hash`, which matters here because the
 * install bridge lands on `/ticket#access_token=…`. Heatmaps and session
 * recording stay off: the ticket page renders QR secrets. Offline, the
 * tracker script simply fails to load and the queued calls go nowhere;
 * nothing in the app waits on it.
 *
 * Also: page views made offline are counted and reported as one event when
 * the connection returns (Matomo cannot see them otherwise), a push-opened
 * page reports itself (the worker marks the URL with a hash), and the
 * `appinstalled` event closes the install funnel.
 *
 * Must be rendered inside a Suspense boundary (useSearchParams) and inside
 * the user and data providers (dimensions).
 */
export function MatomoAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { ids } = useInterested();
  const signedIn = !!user;
  const stars = starsBand(ids.size);
  const offlineViews = useRef(0);

  useEffect(() => {
    if (!analyticsEnabled()) return;
    const onInstalled = () => trackEvent("install", "installed");
    const onOnline = () => {
      if (offlineViews.current === 0) return;
      trackEvent("offline", "used", undefined, offlineViews.current);
      offlineViews.current = 0;
    };
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  // Dimensions are pushed whenever a value changes and ride on every later
  // hit (page view or event). Declared before the page-view effect so the
  // first view already carries them. Visit scope keeps the last value.
  useEffect(() => {
    setDimension(DIMENSION.displayMode, isStandalone() ? "installed" : "browser");
    setDimension(DIMENSION.signedIn, signedIn ? "yes" : "no");
    setDimension(DIMENSION.stars, stars);
  }, [signedIn, stars]);

  useEffect(() => {
    if (!analyticsEnabled()) return;
    if (!navigator.onLine) offlineViews.current += 1;
    if (window.location.hash === PUSH_OPEN_HASH) {
      trackEvent("announcements", "push-open", pathname);
      window.history.replaceState(
        window.history.state,
        "",
        pathname + window.location.search
      );
    }
    // An icon launch carries `?install=N` (data/install/installVersion.ts);
    // tracked as the plain page, the display-mode dimension already says
    // "installed".
    const tracked = new URLSearchParams(searchParams.toString());
    tracked.delete(INSTALL_PARAM);
    trackAppRouter({
      url: MATOMO_URL,
      siteId: MATOMO_SITE_ID,
      pathname,
      searchParams: tracked,
      enableHeartBeatTimer: true,
    });
  }, [pathname, searchParams]);

  return null;
}
