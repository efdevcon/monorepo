"use client";

import { trackAppRouter } from "@socialgouv/matomo-next";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const MATOMO_URL = "https://ethereumfoundation.matomo.cloud";
const MATOMO_SITE_ID = "24"; // archive.devcon.org

export function MatomoAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;

    trackAppRouter({
      url: MATOMO_URL,
      siteId: MATOMO_SITE_ID,
      pathname,
      searchParams,
      enableHeartBeatTimer: true,
    });
  }, [pathname, searchParams]);

  return null;
}
