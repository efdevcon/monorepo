import { Router } from "express";
import { z } from "zod";
import {
  searchDocuments,
  searchAndExpandDocuments,
  formatExpandedDocumentsForContext,
} from "../lib/rag.js";

export const searchRouter: Router = Router();

const searchSchema = z.object({
  query: z.string().min(1),
  matchCount: z.number().int().positive().max(20).optional(),
  matchThreshold: z.number().min(0).max(1).optional(),
  sourceType: z.string().optional(),
  sourceRepo: z.string().optional(),
});

const expandedSchema = z.object({
  query: z.string().min(1),
  matchThreshold: z.number().min(0).max(1).optional(),
  maxDocuments: z.number().int().positive().max(20).optional(),
  sourceType: z.string().optional(),
  sourceRepo: z.string().optional(),
});

searchRouter.post("/", async (req, res) => {
  try {
    const { query, matchCount, matchThreshold, sourceType, sourceRepo } =
      searchSchema.parse(req.body);

    const results = await searchDocuments(query, {
      matchCount,
      matchThreshold,
      sourceType,
      sourceRepo,
    });

    res.json({
      results,
      query,
      count: results.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request", details: error.errors });
      return;
    }

    console.error("Search error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/search/expanded — the exact retrieval the chat flow runs *before*
 * the LLM: hybrid search + chunk expansion + the formatted context string,
 * with no model call. Lets the inference debugger test the RAG step in
 * isolation. Defaults mirror the chat route (threshold 0.2, 5 documents).
 */
searchRouter.post("/expanded", async (req, res) => {
  try {
    const { query, matchThreshold, maxDocuments, sourceType, sourceRepo } =
      expandedSchema.parse(req.body);

    const docs = await searchAndExpandDocuments(query, {
      matchThreshold: matchThreshold ?? 0.2,
      maxDocuments: maxDocuments ?? 5,
      sourceType,
      sourceRepo,
    });

    const context = formatExpandedDocumentsForContext(docs);

    res.json({
      query,
      count: docs.length,
      documents: docs.map((d) => ({
        id: d.filePath,
        source_id: d.filePath,
        source_repo: d.sourceRepo,
        source_type: d.sourceType,
        similarity: d.similarity,
        content_preview:
          d.content.slice(0, 300) + (d.content.length > 300 ? "..." : ""),
        content: d.content,
        metadata: d.metadata,
        title: d.title,
      })),
      context,
      contextLength: context.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request", details: error.errors });
      return;
    }

    console.error("Expanded search error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
