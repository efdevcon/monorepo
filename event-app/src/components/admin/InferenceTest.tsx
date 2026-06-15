"use client";

import { useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import cn from "classnames";
import {
  Database,
  FileText,
  Loader2,
  Play,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";
import { supabase } from "@/data/auth/supabase";
import {
  type InferenceRound,
  type InferenceRun,
  type InferenceSource,
} from "@/data/cache/cache-db";
import { useInferenceHistory } from "@/data/admin/useInferenceHistory";
import { useDatasetOverview } from "@/data/admin/useDatasetOverview";
import { DatasetOverview } from "./DatasetOverview";

/** Live, in-progress view of a run (superset of the persisted InferenceRun). */
interface RunView {
  id?: string;
  timestamp?: number;
  query: string;
  sourceRepo?: string;
  toolCalls: { query: string; reason?: string }[];
  rounds: InferenceRound[];
  context: string;
  answer: string;
  error?: string;
}

const EMPTY_RUN: RunView = {
  query: "",
  toolCalls: [],
  rounds: [],
  context: "",
  answer: "",
};

const estimateTokens = (chars: number) => Math.round(chars / 4);

function timeLabel(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Aggregate a round's documents by source_repo, e.g. "devcon ×3, devcon-7 ×2". */
function pulledFrom(documents: InferenceSource[]): { repo: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const d of documents) {
    const repo = d.source_repo || "unknown";
    counts.set(repo, (counts.get(repo) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([repo, count]) => ({ repo, count }))
    .sort((a, b) => b.count - a.count);
}

export function InferenceTest() {
  const [query, setQuery] = useState("");
  const [sourceRepo, setSourceRepo] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<RunView>(EMPTY_RUN);
  const { runs, addRun, removeRun, clear } = useInferenceHistory();
  const overview = useDatasetOverview();
  const abortRef = useRef<AbortController | null>(null);

  // Scope chips: the real source_repos from the corpus overview, plus any seen
  // in saved runs (so chips still work if the overview fails to load).
  const datasets = useMemo(() => {
    const seen = new Set<string>();
    for (const d of overview.data?.datasets ?? []) {
      if (d.source_repo) seen.add(d.source_repo);
    }
    for (const r of runs) {
      for (const round of r.rounds) {
        for (const doc of round.documents) {
          if (doc.source_repo) seen.add(doc.source_repo);
        }
      }
    }
    return [...seen].sort().map((repo) => ({ repo, label: repo }));
  }, [overview.data, runs]);

  const handleRun = async () => {
    const q = query.trim();
    if (running || !q) return;

    setRunning(true);
    const live: RunView = { ...EMPTY_RUN, query: q, sourceRepo: sourceRepo || undefined };
    setRun(live);

    // Mutable accumulators; we re-emit a fresh object into state on each event
    // so the visualization streams in as the SSE arrives.
    const toolCalls: { query: string; reason?: string }[] = [];
    const rounds: InferenceRound[] = [];
    let pendingLabel = "Initial retrieval";
    let context = "";
    let answer = "";
    const push = () =>
      setRun({ ...live, toolCalls: [...toolCalls], rounds: [...rounds], context, answer });

    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch("/api/admin/inference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: q,
          history: [],
          ...(sourceRepo ? { sourceRepo } : {}),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const detail =
          res.status === 403
            ? "Forbidden — this tool requires an @ethereum.org account."
            : `HTTP ${res.status}`;
        throw new Error(detail);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // keep any partial line for the next chunk

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let data: any;
          try {
            data = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (data.type === "sources") {
            rounds.push({ label: pendingLabel, documents: data.documents || [] });
            pendingLabel = "Follow-up retrieval";
            push();
          } else if (data.type === "tool_call") {
            toolCalls.push({ query: data.query, reason: data.reason });
            pendingLabel = `Search: “${data.query}”`;
            push();
          } else if (data.type === "debug_context") {
            context = data.context || "";
            push();
          } else if (data.type === "text") {
            answer += data.text;
            push();
          }
        }
      }

      const saved: InferenceRun = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        query: q,
        sourceRepo: sourceRepo || undefined,
        toolCalls,
        rounds,
        context,
        answer,
      };
      await addRun(saved);
      setRun({ ...saved });
    } catch (e: any) {
      const error = e?.name === "AbortError" ? "Cancelled." : e?.message || "Run failed.";
      setRun({ ...live, toolCalls, rounds, context, answer, error });
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  const loadRun = (r: InferenceRun) => {
    setRun({ ...r });
    setQuery(r.query);
    setSourceRepo(r.sourceRepo ?? "");
  };

  const lastRound = run.rounds[run.rounds.length - 1];

  return (
    <main className="py-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold">Inference debugger</h1>
        <p className="mt-1 text-sm text-gray-500">
          Run a query through the RAG pipeline and inspect what it retrieved, the
          context handed to the model, and the answer. Runs are saved locally
          (this browser only).
        </p>
      </header>

      {/* Corpus overview — what's available, pre-query */}
      <DatasetOverview
        data={overview.data}
        loading={overview.loading}
        error={overview.error}
        activeRepo={sourceRepo}
        onPick={setSourceRepo}
        onRefresh={overview.refresh}
      />

      {/* Controls */}
      <div className="mb-4 rounded-xl border border-[#E1E4EA] p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRun()}
              placeholder="Ask the knowledge base…"
              className="w-full rounded-xl border border-[#E1E4EA] py-2.5 pl-9 pr-3 outline-none focus:border-[#7D52F4]"
            />
          </div>
          <button
            onClick={handleRun}
            disabled={running || !query.trim()}
            className={cn(
              "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-medium text-white transition-colors",
              running || !query.trim()
                ? "bg-gray-300"
                : "bg-[#7D52F4] hover:bg-[#6A3FD1]"
            )}
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run
          </button>
        </div>

        {/* Dataset scope */}
        <div className="mt-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <Database className="h-3.5 w-3.5" /> Dataset
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[{ repo: "", label: "All datasets" }, ...datasets].map((d) => (
              <button
                key={d.repo || "all"}
                onClick={() => setSourceRepo(d.repo)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  sourceRepo === d.repo
                    ? "border-[#7D52F4] bg-[#f3eeff] text-[#7D52F4]"
                    : "border-[#E1E4EA] text-gray-600 hover:bg-gray-50"
                )}
              >
                {d.label}
                {d.repo && (
                  <span className="ml-1 font-normal text-gray-400">{d.repo}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Current run */}
        <section className="min-w-0">
          {run.error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {run.error}
            </div>
          )}

          {run.rounds.length === 0 && !run.answer && !run.error ? (
            <p className="py-16 text-center text-sm text-gray-400">
              {running ? "Running…" : "Run a query to see the retrieval pipeline."}
            </p>
          ) : (
            <div className="space-y-4">
              {/* Tool calls */}
              {run.toolCalls.length > 0 && (
                <div className="rounded-xl border border-[#E1E4EA] p-4">
                  <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                    <Wrench className="h-4 w-4 text-[#7D52F4]" />
                    Model searches ({run.toolCalls.length})
                  </h2>
                  <ul className="space-y-1.5">
                    {run.toolCalls.map((tc, i) => (
                      <li key={i} className="text-sm">
                        <span className="font-medium">“{tc.query}”</span>
                        {tc.reason && (
                          <span className="text-gray-500"> — {tc.reason}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Retrieval rounds */}
              {run.rounds.map((round, i) => (
                <RetrievalRound key={i} round={round} />
              ))}

              {/* Aggregate: which datasets the final round pulled from */}
              {lastRound && lastRound.documents.length > 0 && (
                <div className="rounded-xl border border-[#E1E4EA] p-4">
                  <h2 className="mb-2 text-sm font-semibold">Pulled from</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {pulledFrom(lastRound.documents).map((p) => (
                      <span
                        key={p.repo}
                        className="rounded-full bg-[#f3eeff] px-2.5 py-1 text-xs font-medium text-[#7D52F4]"
                      >
                        {p.repo} ×{p.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Full context */}
              {run.context && <ContextBlock context={run.context} />}

              {/* Answer */}
              {(run.answer || running) && (
                <div className="rounded-xl border border-[#E1E4EA] p-4">
                  <h2 className="mb-2 text-sm font-semibold">Answer</h2>
                  <div className="prose prose-sm max-w-none">
                    <Markdown>{run.answer || "…"}</Markdown>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* History */}
        <aside className="min-w-0">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              History ({runs.length})
            </h2>
            {runs.length > 0 && (
              <button
                onClick={clear}
                className="text-xs text-gray-400 underline hover:text-red-500"
              >
                Clear all
              </button>
            )}
          </div>
          {runs.length === 0 ? (
            <p className="text-xs text-gray-400">No runs yet.</p>
          ) : (
            <ul className="space-y-2">
              {runs.map((r) => {
                const docCount = r.rounds.reduce(
                  (n, round) => n + round.documents.length,
                  0
                );
                return (
                  <li key={r.id}>
                    <div
                      className={cn(
                        "group flex items-start gap-2 rounded-lg border p-2.5 text-left transition-colors",
                        run.id === r.id
                          ? "border-[#7D52F4] bg-[#f3eeff]"
                          : "border-[#E1E4EA] hover:bg-gray-50"
                      )}
                    >
                      <button
                        onClick={() => loadRun(r)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-medium">{r.query}</p>
                        <p className="mt-0.5 text-[11px] text-gray-400">
                          {timeLabel(r.timestamp)} · {docCount} docs
                          {r.sourceRepo ? ` · ${r.sourceRepo}` : ""}
                        </p>
                      </button>
                      <button
                        onClick={() => removeRun(r.id)}
                        aria-label="Delete run"
                        className="shrink-0 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </main>
  );
}

/** One retrieval round: its documents ranked by similarity. */
function RetrievalRound({ round }: { round: InferenceRound }) {
  return (
    <div className="rounded-xl border border-[#E1E4EA] p-4">
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        <Search className="h-4 w-4 text-[#7D52F4]" />
        {round.label}{" "}
        <span className="font-normal text-gray-400">
          ({round.documents.length})
        </span>
      </h2>
      {round.documents.length === 0 ? (
        <p className="text-sm text-gray-400">No documents retrieved.</p>
      ) : (
        <ol className="space-y-2">
          {round.documents.map((d, i) => (
            <li key={`${d.source_id}-${i}`} className="rounded-lg bg-gray-50 p-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">
                  [{i + 1}]
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-700">
                  {d.source_id}
                </span>
                {d.source_repo && (
                  <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                    {d.source_repo}
                  </span>
                )}
              </div>
              {/* Similarity bar */}
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-[#7D52F4]"
                    style={{
                      width: `${Math.max(0, Math.min(1, d.similarity)) * 100}%`,
                    }}
                  />
                </div>
                <span className="shrink-0 text-[11px] tabular-nums text-gray-500">
                  {(d.similarity * 100).toFixed(1)}%
                </span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs text-gray-500">
                {d.content_preview}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Collapsible full-context viewer with char/token estimate. */
function ContextBlock({ context }: { context: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-[#E1E4EA] p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 text-sm font-semibold"
      >
        <FileText className="h-4 w-4 text-[#7D52F4]" />
        Context sent to model
        <span className="ml-1 font-normal text-gray-400">
          {context.length.toLocaleString()} chars · ~
          {estimateTokens(context.length).toLocaleString()} tokens
        </span>
        <span className="ml-auto text-xs text-gray-400">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open && (
        <pre className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 text-[11px] text-gray-600">
          {context}
        </pre>
      )}
    </div>
  );
}
