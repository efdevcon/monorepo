import { Router } from "express";
import { z } from "zod";
import { searchDocuments } from "../lib/rag.js";

export const recommendRouter: Router = Router();

// Sessions live under this source_type (see scripts/sync-sessions.ts).
const SESSION_SOURCE_TYPE = "devcon-api";

const recommendSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(20).optional(),
  // Optional event filter (source_repo), e.g. "devcon-7".
  event: z.string().optional(),
});

interface SessionMeta {
  title?: string;
  session_id?: string;
  type?: string | null;
  track?: string | null;
  expertise?: string | null;
  speakers?: string[];
  tags?: string | null;
  slot_start?: number | string | null;
  slot_end?: number | string | null;
  room?: string | null;
  youtube_id?: string | null;
}

// Drop the leading "# Title" line so the preview is the session blurb itself.
function stripHeading(content: string): string {
  return content.replace(/^#\s+.*\n+/, "").trim();
}

/**
 * POST /api/recommend — given a free-text interest/query, return the sessions
 * most relevant to it.
 *
 * Sessions-only: runs the hybrid search scoped to source_type "devcon-api",
 * de-duplicates chunks to one entry per session, and returns them ranked by
 * relevance with the metadata a recommendation card needs (speakers, track,
 * time, room, link). This is the recommendation primitive behind a
 * session-discovery UI — distinct from /api/chat, which answers questions.
 */
recommendRouter.post("/", async (req, res) => {
  try {
    const { query, limit = 8, event } = recommendSchema.parse(req.body);

    // Over-fetch chunks so de-duping to unique sessions still leaves enough.
    const matchCount = Math.min(Math.max(limit * 3, 20), 60);
    const chunks = await searchDocuments(query, {
      sourceType: SESSION_SOURCE_TYPE,
      sourceRepo: event,
      matchCount,
      matchThreshold: 0.1,
    });

    // Collapse chunks to unique sessions, keeping the best-ranked chunk
    // (results are already ordered by relevance).
    const seen = new Set<string>();
    const sessions: Array<Record<string, unknown>> = [];

    for (const c of chunks) {
      const meta = (c.metadata || {}) as SessionMeta;
      const id =
        meta.session_id ||
        c.source_id.replace(/#chunk-\d+$/, "").replace(/^sessions\//, "");

      if (seen.has(id)) continue;
      seen.add(id);

      sessions.push({
        id,
        title: meta.title || id,
        preview: stripHeading(c.content).slice(0, 400),
        speakers: meta.speakers || [],
        track: meta.track ?? null,
        type: meta.type ?? null,
        expertise: meta.expertise ?? null,
        tags: meta.tags ?? null,
        slot_start: meta.slot_start ?? null,
        slot_end: meta.slot_end ?? null,
        room: meta.room ?? null,
        youtube_id: meta.youtube_id ?? null,
        event: c.source_repo,
        relevance: c.similarity,
        // Stable id a client can map to its own session route.
        source: `sessions/${id}`,
      });

      if (sessions.length >= limit) break;
    }

    res.json({ query, count: sessions.length, sessions });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request", details: error.errors });
      return;
    }

    console.error("Recommend error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
