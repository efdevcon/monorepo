"use client";

import { useEffect } from "react";
import APP_CONFIG from "@/CONFIG";

/**
 * Set the tab title while a detail view is open and restore it on close. The
 * server can only set per-item titles when it renders the page; when the
 * service worker serves the precached shell (or a client navigation reuses a
 * cached payload) the title would otherwise stay generic.
 */
export function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · ${APP_CONFIG.APP_NAME}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
