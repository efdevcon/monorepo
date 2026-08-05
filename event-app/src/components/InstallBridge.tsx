"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@/data/auth/useUser";
import { supabase } from "@/data/auth/supabase";
import { isStandalone } from "./InstallAppButton";

/**
 * Keeps the page's manifest <link> pointing at a personalized manifest while
 * signed in, so that installing the PWA carries the session into the
 * installed app's first launch. iOS isolates a home-screen web app's
 * storage from the Safari tab it was installed from, so without this, a
 * session established by clicking an email link is lost the moment someone
 * taps the newly-installed icon. See /api/manifest-bridge + /api/auth/bridge
 * for the mechanism.
 *
 * Points at a real, independently-fetchable URL (/api/manifest-bridge?bridge=…)
 * rather than a blob: URL — a blob: URL only resolves within this page's own
 * JS realm, and iOS's own manifest-fetching for "Add to Home Screen" may not
 * be able to use it at all. Mount once at the app root. Renders nothing.
 */
export function InstallBridge() {
  const { user, hasInitialized } = useUser();
  const mintedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasInitialized || !user?.email || isStandalone()) return;
    if (mintedForRef.current === user.email) return; // already minted this session

    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) return;

    let cancelled = false;

    (async () => {
      try {
        const accessToken = (await supabase?.auth.getSession())?.data.session
          ?.access_token;
        if (!accessToken || cancelled) return;

        const res = await fetch("/api/manifest-bridge", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok || cancelled) return;

        const { bridgeToken } = await res.json();
        if (!bridgeToken || cancelled) return;

        link.href = `/api/manifest-bridge?bridge=${encodeURIComponent(bridgeToken)}`;
        mintedForRef.current = user.email!;
      } catch {
        // Fail silently — the default manifest stays in place, so installing
        // still works exactly as it does today, just without the bridge.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasInitialized, user?.email]);

  return null;
}
