"use client";

import { useCallback, useEffect, useState } from "react";
import cn from "classnames";
import {
  ChevronDown,
  Database,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  adminFetch,
  type DatasetOverview as Overview,
  type DatasetStat,
} from "@/data/admin/useDatasetOverview";

const datasetKey = (d: DatasetStat) => `${d.source_type}|${d.source_repo ?? ""}`;
const datasetLabel = (d: DatasetStat) => d.source_repo || d.source_type;

/**
 * Pre-query corpus view: total document count and a card per dataset
 * (source_type / source_repo) with its size. Each card can scope the next
 * query to that dataset and expand to browse its documents.
 */
export function DatasetOverview({
  data,
  loading,
  error,
  activeRepo,
  onPick,
  onRefresh,
}: {
  data: Overview | null;
  loading: boolean;
  error: string | null;
  activeRepo: string;
  onPick: (repo: string) => void;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="mb-4 rounded-xl border border-[#E1E4EA] p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Database className="h-4 w-4 text-[#7D52F4]" />
          Corpus
          {data && (
            <span className="font-normal text-gray-400">
              {data.total.toLocaleString()} docs · {data.datasets.length} datasets
            </span>
          )}
        </h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Refresh corpus"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      ) : loading && !data ? (
        <p className="mt-2 text-sm text-gray-400">Loading corpus…</p>
      ) : data && data.datasets.length === 0 ? (
        <p className="mt-2 text-sm text-gray-400">No documents indexed.</p>
      ) : data ? (
        <>
          {data.truncated && (
            <p className="mt-2 text-xs text-amber-600">
              Showing a partial count — corpus exceeds the overview limit.
            </p>
          )}
          <div className="mt-3 space-y-2">
            {data.datasets.map((d) => {
              const key = datasetKey(d);
              const isOpen = expanded === key;
              const isActive = activeRepo && d.source_repo === activeRepo;
              return (
                <div
                  key={key}
                  className={cn(
                    "rounded-lg border",
                    isActive ? "border-[#7D52F4]" : "border-[#E1E4EA]"
                  )}
                >
                  <div className="flex items-center gap-2 p-2.5">
                    <button
                      onClick={() => setExpanded(isOpen ? null : key)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-gray-400 transition-transform",
                          isOpen && "rotate-180"
                        )}
                      />
                      <span className="truncate text-sm font-medium">
                        {datasetLabel(d)}
                      </span>
                      <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                        {d.source_type}
                      </span>
                    </button>
                    <span className="shrink-0 text-xs tabular-nums text-gray-500">
                      {d.count.toLocaleString()}
                    </span>
                    {d.source_repo && (
                      <button
                        onClick={() =>
                          onPick(isActive ? "" : (d.source_repo as string))
                        }
                        className={cn(
                          "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                          isActive
                            ? "border-[#7D52F4] bg-[#f3eeff] text-[#7D52F4]"
                            : "border-[#E1E4EA] text-gray-500 hover:bg-gray-50"
                        )}
                      >
                        {isActive ? "Scoped" : "Scope query"}
                      </button>
                    )}
                  </div>
                  {isOpen && (
                    <DatasetBrowser
                      sourceType={d.source_type}
                      sourceRepo={d.source_repo}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

interface BrowseDoc {
  source_id: string;
  source_type: string;
  source_repo: string | null;
  title: string | null;
  updated_at: string;
  content: string;
}

const PAGE_SIZE = 50;

/** Lazily browses the documents in one dataset, with search + load-more. */
function DatasetBrowser({
  sourceType,
  sourceRepo,
}: {
  sourceType: string;
  sourceRepo: string | null;
}) {
  const [q, setQ] = useState("");
  const [docs, setDocs] = useState<BrowseDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDoc, setOpenDoc] = useState<string | null>(null);

  const load = useCallback(
    async (offset: number, search: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          sourceType,
          limit: String(PAGE_SIZE),
          offset: String(offset),
        });
        if (sourceRepo) params.set("sourceRepo", sourceRepo);
        if (search) params.set("q", search);
        const res = await adminFetch(`/api/admin/datasets/documents?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setTotal(json.total ?? 0);
        setDocs((prev) =>
          offset === 0 ? json.documents : [...prev, ...json.documents]
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load documents");
      } finally {
        setLoading(false);
      }
    },
    [sourceType, sourceRepo]
  );

  // Reload from the top whenever the (debounced) search term changes.
  useEffect(() => {
    const t = setTimeout(() => load(0, q.trim()), 250);
    return () => clearTimeout(t);
  }, [q, load]);

  return (
    <div className="border-t border-[#E1E4EA] p-2.5">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter by source id…"
        className="mb-2 w-full rounded-lg border border-[#E1E4EA] px-3 py-1.5 text-xs outline-none focus:border-[#7D52F4]"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <ul className="max-h-80 space-y-1 overflow-y-auto">
        {docs.map((d, i) => {
          const key = `${d.source_id}-${i}`;
          const isOpen = openDoc === key;
          return (
            <li key={key} className="rounded text-xs">
              <button
                onClick={() => setOpenDoc(isOpen ? null : key)}
                className="flex w-full items-start gap-1.5 rounded px-1.5 py-1 text-left hover:bg-gray-50"
              >
                <FileText className="mt-0.5 h-3 w-3 shrink-0 text-gray-300" />
                <div className="min-w-0 flex-1">
                  {d.title && (
                    <p className="truncate font-medium text-gray-700">
                      {d.title}
                    </p>
                  )}
                  <p className="truncate text-gray-400">{d.source_id}</p>
                </div>
                <ChevronDown
                  className={cn(
                    "mt-0.5 h-3 w-3 shrink-0 text-gray-300 transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
              {isOpen && (
                <pre className="mx-1.5 mb-1 mt-0.5 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-2.5 text-[11px] leading-relaxed text-gray-600">
                  {d.content || "(empty)"}
                </pre>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-400">
        <span>
          {docs.length} / {total.toLocaleString()}
        </span>
        {docs.length < total && (
          <button
            onClick={() => load(docs.length, q.trim())}
            disabled={loading}
            className="text-[#7D52F4] hover:underline disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}
