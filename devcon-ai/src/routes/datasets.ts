import { Router } from "express";
import { createServerClient } from "../lib/supabase.js";

export const datasetsRouter: Router = Router();

// PostgREST caps a single select at 1000 rows; page through to tally the whole
// corpus for the overview, with a safety cap so a runaway table can't hang.
const PAGE = 1000;
const MAX_PAGES = 100;

/**
 * GET /api/datasets — corpus overview for the inference debugger.
 * Returns the total document count and a per-dataset breakdown (each distinct
 * source_type / source_repo pair with its count), so callers can see what's
 * available before running a query.
 */
datasetsRouter.get("/", async (_req, res) => {
  try {
    const supabase = createServerClient();
    const counts = new Map<
      string,
      { source_type: string; source_repo: string | null; count: number }
    >();
    let total = 0;
    let truncated = false;

    for (let page = 0; page < MAX_PAGES; page++) {
      const from = page * PAGE;
      const { data, error } = await supabase
        .from("documents")
        .select("source_type, source_repo")
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;

      // The typed client infers `never` for string selects; narrow explicitly.
      const rows = data as unknown as {
        source_type: string;
        source_repo: string | null;
      }[];
      for (const row of rows) {
        total++;
        const key = `${row.source_type}|${row.source_repo ?? ""}`;
        const existing = counts.get(key);
        if (existing) existing.count++;
        else
          counts.set(key, {
            source_type: row.source_type,
            source_repo: row.source_repo,
            count: 1,
          });
      }

      if (data.length < PAGE) break;
      if (page === MAX_PAGES - 1) truncated = true;
    }

    res.json({
      total,
      truncated,
      datasets: [...counts.values()].sort((a, b) => b.count - a.count),
    });
  } catch (e) {
    console.error("[datasets] overview error:", e);
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Failed to load datasets" });
  }
});

/**
 * GET /api/datasets/documents — browse the corpus, paginated and filterable by
 * dataset (sourceType / sourceRepo) and a source_id substring (`q`). Returns
 * lightweight rows (no embeddings or full content) plus an exact total for the
 * current filter so the UI can paginate.
 */
datasetsRouter.get("/documents", async (req, res) => {
  try {
    const supabase = createServerClient();
    const sourceType =
      typeof req.query.sourceType === "string" ? req.query.sourceType : undefined;
    const sourceRepo =
      typeof req.query.sourceRepo === "string" ? req.query.sourceRepo : undefined;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    let query = supabase
      .from("documents")
      .select("source_id, source_type, source_repo, metadata, updated_at, content", {
        count: "exact",
      })
      .order("source_id", { ascending: true })
      .range(offset, offset + limit - 1);

    if (sourceType) query = query.eq("source_type", sourceType);
    if (sourceRepo) query = query.eq("source_repo", sourceRepo);
    // `.ilike` is parameterized — safe for the user-supplied substring.
    if (q) query = query.ilike("source_id", `%${q}%`);

    const { data, count, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as unknown as {
      source_id: string;
      source_type: string;
      source_repo: string | null;
      metadata: Record<string, unknown> | null;
      updated_at: string;
      content: string;
    }[];
    const documents = rows.map((row) => {
      const title = row.metadata?.["title"];
      return {
        source_id: row.source_id,
        source_type: row.source_type,
        source_repo: row.source_repo,
        title: typeof title === "string" ? title : null,
        updated_at: row.updated_at,
        content: row.content,
      };
    });

    res.json({ total: count ?? documents.length, limit, offset, documents });
  } catch (e) {
    console.error("[datasets] documents error:", e);
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Failed to load documents" });
  }
});
