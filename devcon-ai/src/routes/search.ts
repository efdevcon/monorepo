import { Router } from "express";
import { z } from "zod";
import { searchDocuments } from "../lib/rag.js";

export const searchRouter: Router = Router();

const searchSchema = z.object({
  query: z.string().min(1),
  matchCount: z.number().int().positive().max(20).optional(),
  matchThreshold: z.number().min(0).max(1).optional(),
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
