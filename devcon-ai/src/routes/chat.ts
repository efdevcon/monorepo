import { Router } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { searchDocuments, formatDocumentsForContext } from "../lib/rag.js";
import type { MatchedDocument } from "../lib/types.js";

export const chatRouter: Router = Router();

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const chatSchema = z.object({
  message: z.string().min(1),
  history: z.array(messageSchema).optional().default([]),
  sourceType: z.string().optional(),
  sourceRepo: z.string().optional(),
});

const SYSTEM_PROMPT = `You are Deva, a helpful AI assistant for Devcon and the Ethereum Foundation ecosystem.

IMPORTANT: You have a search_knowledge_base tool. ALWAYS use it before saying you don't know something.

If the initial search results don't contain what the user is asking about:
1. Look for potential typos in the user's query and search with corrected spelling
2. Try searching for related terms or synonyms
3. Search for specific keywords from the question

Examples of when to use the search tool:
- User asks about "tabelcloth" → search for "tablecloth" (corrected spelling)
- User asks about "devcon tickets" but results don't help → search "ticket price" or "ticket sale"
- Initial results seem irrelevant → search with more specific terms

Only say "I don't have information about that" AFTER trying at least one search with alternative terms.

When answering:
- Be friendly and concise
- Use the provided context
- Format with markdown when helpful`;

const SEARCH_TOOL: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "search_knowledge_base",
    description: "Search the knowledge base for information about Devcon, Devconnect, Ethereum Foundation, etc. Use this to find specific information or when initial context is insufficient. Try alternative spellings or search terms if the first search doesn't help.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query. Be specific. Try corrected spellings if you suspect typos.",
        },
        reason: {
          type: "string",
          description: "Brief reason for this search (e.g., 'checking alternative spelling', 'looking for more specific info')",
        },
      },
      required: ["query"],
    },
  },
};

chatRouter.post("/", async (req, res) => {
  try {
    const { message, history, sourceType, sourceRepo } = chatSchema.parse(req.body);

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Initial search
    const initialDocs = await searchDocuments(message, {
      matchCount: 10,
      matchThreshold: 0.2,
      sourceType,
      sourceRepo,
    });

    console.log(`Initial search found ${initialDocs.length} documents for: "${message}"`);

    // Track all documents found
    const allDocuments: Map<string, MatchedDocument> = new Map();
    for (const doc of initialDocs) {
      allDocuments.set(doc.id, doc);
    }

    // Send initial sources
    res.write(`data: ${JSON.stringify({
      type: "sources",
      documents: initialDocs.map(d => ({
        id: d.id,
        source_id: d.source_id,
        source_repo: d.source_repo,
        similarity: d.similarity,
        content_preview: d.content.slice(0, 200) + (d.content.length > 200 ? '...' : ''),
        metadata: d.metadata,
      }))
    })}\n\n`);

    // Build initial context
    const initialContext = formatDocumentsForContext(initialDocs);

    // Build messages
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      {
        role: "user",
        content: `${message}\n\n---\nInitial search results:\n${initialContext}`,
      },
    ];

    // Agentic loop - let AI search multiple times if needed
    const MAX_TOOL_CALLS = 3;
    let toolCallCount = 0;

    while (toolCallCount < MAX_TOOL_CALLS) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        tools: [SEARCH_TOOL],
        tool_choice: toolCallCount === 0 ? "auto" : "auto", // Let AI decide
        max_tokens: 2048,
      });

      const responseMessage = response.choices[0]?.message;
      if (!responseMessage) break;

      // Check if AI wants to use a tool
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        toolCallCount++;
        messages.push(responseMessage);

        for (const toolCall of responseMessage.tool_calls) {
          if (toolCall.function.name === "search_knowledge_base") {
            const args = JSON.parse(toolCall.function.arguments);
            console.log(`Tool call #${toolCallCount}: search for "${args.query}" (${args.reason || 'no reason'})`);

            // Notify frontend about the search
            res.write(`data: ${JSON.stringify({
              type: "tool_call",
              tool: "search",
              query: args.query,
              reason: args.reason,
            })}\n\n`);

            // Execute search
            const newDocs = await searchDocuments(args.query, {
              matchCount: 5,
              matchThreshold: 0.15,
              sourceType,
              sourceRepo,
            });

            // Add new documents to collection
            for (const doc of newDocs) {
              if (!allDocuments.has(doc.id)) {
                allDocuments.set(doc.id, doc);
              }
            }

            // Send new sources
            if (newDocs.length > 0) {
              res.write(`data: ${JSON.stringify({
                type: "sources",
                documents: newDocs.map(d => ({
                  id: d.id,
                  source_id: d.source_id,
                  source_repo: d.source_repo,
                  similarity: d.similarity,
                  content_preview: d.content.slice(0, 200) + (d.content.length > 200 ? '...' : ''),
                  metadata: d.metadata,
                }))
              })}\n\n`);
            }

            // Add tool result to messages
            const toolResult = newDocs.length > 0
              ? formatDocumentsForContext(newDocs)
              : "No results found for this search.";

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: toolResult,
            });
          }
        }
      } else {
        // AI is ready to respond - stream the response
        const finalStream = await openai.chat.completions.create({
          model: "gpt-4o",
          messages,
          max_tokens: 2048,
          stream: true,
        });

        for await (const chunk of finalStream) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) {
            res.write(`data: ${JSON.stringify({ type: "text", text })}\n\n`);
          }
        }
        break;
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request", details: error.errors });
      return;
    }

    console.error("Chat error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
