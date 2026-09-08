"use client";

import { useEffect } from "react";
import APP_CONFIG from "@/CONFIG";

/**
 * Set the tab title while a detail page is open and restore the app title on
 * close. The server can only set per-item titles when it renders the page;
 * when the service worker serves the precached shell (or the detail opens in
 * place) the title would otherwise stay generic. The restore is the app name,
 * not "whatever it was before": after a deep link the previous value is the
 * server-rendered per-item title, which would then stick to the list.
 */
export function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    if (!title) return;
    document.title = `${title} · ${APP_CONFIG.APP_NAME}`;
    return () => {
      document.title = APP_CONFIG.APP_NAME;
    };
  }, [title]);
}
