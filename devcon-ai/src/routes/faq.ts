import { Router } from "express";
import { z } from "zod";
import {
  searchAndExpandDocuments,
  formatExpandedDocumentsForContext,
} from "../lib/rag.js";
import { getChatProvider, type ChatMessage } from "../lib/providers/index.js";

export const faqRouter: Router = Router();

// CMS / website content lives under this source_type (see scripts/sync-documents.ts).
const CONTENT_SOURCE_TYPE = "github";

const faqSchema = z.object({
  query: z.string().min(1),
  // How many content passages to retrieve as grounding for the answer.
  limit: z.number().int().positive().max(20).optional(),
  // Optional repo filter (source_repo), e.g. "devcon" or "devconnect".
  repo: z.string().optional(),
});

const FAQ_SYSTEM_PROMPT = `You are Deva, answering questions about Devcon using ONLY the provided context from the official Devcon website & docs.

- Distill the context into a clear, direct, concise answer — synthesize across passages, don't just quote them.
- If the context does not contain the answer, say you don't have that information. Never invent facts.
- Format with markdown when it helps (short lists, bold key terms).
- Align with Ethereum's CROPS values — Censorship Resistance, Open-source, Privacy, Security — and never endorse censorship, proprietary lock-in, surveillance, or insecure practices.`;

/**
 * POST /api/faq — given a question, answer it from the official Devcon/Devconnect
 * website & docs.
 *
 * Content-only: hybrid search + chunk expansion scoped to source_type "github",
 * then a single LLM pass that distills the retrieved passages into a concise
 * answer (no agentic loop — that's /api/chat). Returns the distilled answer plus
 * the grounding passages. Sessions never enter here; use /api/recommend for talks.
 */
faqRouter.post("/", async (req, res) => {
  try {
    const { query, limit = 5, repo } = faqSchema.parse(req.body);

    const docs = await searchAndExpandDocuments(query, {
      sourceType: CONTENT_SOURCE_TYPE,
      sourceRepo: repo,
      maxDocuments: limit,
      matchThreshold: 0.15,
    });

    const sources = docs.map((d) => ({
      id: d.filePath.replace(/#\d+$/, ""),
      title: d.title,
      preview: d.content.slice(0, 300) + (d.content.length > 300 ? "..." : ""),
      repo: d.sourceRepo,
      relevance: d.similarity,
      source: d.filePath.replace(/#\d+$/, ""),
    }));

    // Distill the retrieved passages into a single concise answer.
    let answer: string;
    if (docs.length === 0) {
      answer = "I don't have information about that in the Devcon docs.";
    } else {
      const context = formatExpandedDocumentsForContext(docs);
      const provider = getChatProvider();
      const messages: ChatMessage[] = [
        { role: "system", content: FAQ_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Question: ${query}\n\n---\nContext:\n${context}`,
        },
      ];
      const completion = await provider.createCompletion({
        messages,
        maxTokens: 1024,
      });
      answer =
        completion.message?.content?.trim() ||
        "I don't have information about that in the Devcon docs.";
    }

    res.json({ query, answer, count: sources.length, sources });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request", details: error.errors });
      return;
    }

    console.error("FAQ error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
