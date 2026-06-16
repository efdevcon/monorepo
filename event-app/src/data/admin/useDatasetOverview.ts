"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/data/auth/supabase";

export interface DatasetStat {
  source_type: string;
  source_repo: string | null;
  count: number;
}

export interface DatasetOverview {
  total: number;
  truncated: boolean;
  datasets: DatasetStat[];
}

/** Attach the Supabase access token to an admin-API request. */
export async function adminFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

async function describeError(res: Response): Promise<string> {
  // Prefer the server's specific message (e.g. "Token rejected: jwt expired",
  // "No Authorization token reached the server", "Inference service unreachable").
  const body = await res.json().catch(() => null);
  if (body?.error) return body.error;
  if (res.status === 403) return "Forbidden — this tool requires an @ethereum.org account.";
  if (res.status === 401) return "Not signed in.";
  return `HTTP ${res.status}`;
}

/** Loads the RAG corpus overview (total docs + per-dataset counts). */
export function useDatasetOverview() {
  const [data, setData] = useState<DatasetOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/datasets");
      if (!res.ok) throw new Error(await describeError(res));
      setData((await res.json()) as DatasetOverview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load datasets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
