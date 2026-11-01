"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalyticsReport, WindowDays } from "@/app/api/admin/analytics/report";
import { adminFetch } from "./useDatasetOverview";

/** The page re-reads Matomo this often while it stays open and visible. */
export const AUTO_REFRESH_MS = 120_000;

/**
 * The EF analytics report (/api/admin/analytics) for one window, loaded on
 * mount and whenever the window changes, re-read every two minutes while the
 * tab is visible, and on demand. Admin pattern (useDatasetOverview): plain
 * state, not the Dexie SWR cache, since this is team-only live data that
 * should never sit in the shared offline store.
 */
export function useAnalyticsReport(days: WindowDays) {
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // When the current report was received (a stored timestamp, not "now").
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/analytics?days=${days}`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? (res.status === 401 ? "Not signed in." : `HTTP ${res.status}`));
      }
      setReport(json.data as AnalyticsReport);
      setUpdatedAt(Date.now());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the report");
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, [days]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  return { report, error, loading, updatedAt, refresh };
}
