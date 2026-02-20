import { Router } from "express";
import { z } from "zod";
import {
  searchDocuments,
  searchAndExpandDocuments,
  formatDocumentsForContext,
  formatExpandedDocumentsForContext,
} from "../lib/rag.js";
import type { MatchedDocument } from "../lib/types.js";
import {
  getChatProvider,
  type ChatMessage,
  type ToolDefinition,
} from "../lib/providers/index.js";

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

// System prompt for models with tool calling support (OpenAI)
const SYSTEM_PROMPT_WITH_TOOLS = `You are Deva, a helpful AI assistant for Devcon and the Ethereum Foundation ecosystem.

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

// System prompt for models WITHOUT tool calling (HuggingFace, etc.)
const SYSTEM_PROMPT_NO_TOOLS = `You are Deva, a helpful AI assistant for Devcon and the Ethereum Foundation ecosystem.

You will be provided with search results from a knowledge base. Answer the user's question based ONLY on the provided context.

Rules:
- Answer based on the provided search results only
- If the search results don't contain relevant information, say "I don't have information about that in my knowledge base"
- Do NOT make up information or pretend to search
- Do NOT write out fake function calls or searches
- Be friendly and concise
- Format with markdown when helpful`;

const SEARCH_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "search_knowledge_base",
    description:
      "Search the knowledge base for information about Devcon, Devconnect, Ethereum Foundation, etc. Use this to find specific information or when initial context is insufficient. Try alternative spellings or search terms if the first search doesn't help.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "The search query. Be specific. Try corrected spellings if you suspect typos.",
        },
        reason: {
          type: "string",
          description:
            "Brief reason for this search (e.g., 'checking alternative spelling', 'looking for more specific info')",
        },
      },
      required: ["query"],
    },
  },
};

chatRouter.post("/", async (req, res) => {
  try {
    const { message, history, sourceType, sourceRepo } = chatSchema.parse(
      req.body
    );

    const provider = getChatProvider();

    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Initial search - expand to full documents
    const expandedDocs = await searchAndExpandDocuments(message, {
      matchThreshold: 0.2,
      maxDocuments: 5,
      sourceType,
      sourceRepo,
    });

    console.log(
      `Initial search found ${expandedDocs.length} full documents for: "${message}"`
    );

    // Send initial sources (summarized for frontend)
    res.write(
      `data: ${JSON.stringify({
        type: "sources",
        documents: expandedDocs.map((d) => ({
          id: d.filePath,
          source_id: d.filePath,
          source_repo: d.sourceRepo,
          similarity: d.similarity,
          content_preview:
            d.content.slice(0, 300) + (d.content.length > 300 ? "..." : ""),
          metadata: d.metadata,
          title: d.title,
        })),
      })}\n\n`
    );

    // Build initial context from full documents
    const initialContext = formatExpandedDocumentsForContext(expandedDocs);

    // Send full context to frontend for debugging
    res.write(
      `data: ${JSON.stringify({
        type: "debug_context",
        context: initialContext,
        contextLength: initialContext.length,
      })}\n\n`
    );

    // Check if provider supports tool calling (OpenAI does, HuggingFace doesn't)
    const supportsToolCalling = provider.name === "openai";
    const systemPrompt = supportsToolCalling
      ? SYSTEM_PROMPT_WITH_TOOLS
      : SYSTEM_PROMPT_NO_TOOLS;

    // Build messages
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      {
        role: "user",
        content: `${message}\n\n---\nSearch results:\n${initialContext}`,
      },
    ];

    if (supportsToolCalling) {
      // Agentic loop - let AI search multiple times if needed
      const MAX_TOOL_CALLS = 3;
      let toolCallCount = 0;

      while (toolCallCount < MAX_TOOL_CALLS) {
        const response = await provider.createCompletion({
          messages,
          tools: [SEARCH_TOOL],
          toolChoice: "auto",
          maxTokens: 2048,
        });

        const responseMessage = response.message;
        if (!responseMessage) break;

        // Check if AI wants to use a tool
        if (
          responseMessage.tool_calls &&
          responseMessage.tool_calls.length > 0
        ) {
          toolCallCount++;
          messages.push({
            role: "assistant",
            content: responseMessage.content,
            tool_calls: responseMessage.tool_calls,
          });

          for (const toolCall of responseMessage.tool_calls) {
            if (toolCall.function.name === "search_knowledge_base") {
              const args = JSON.parse(toolCall.function.arguments);
              console.log(
                `Tool call #${toolCallCount}: search for "${args.query}" (${args.reason || "no reason"})`
              );

              // Notify frontend about the search
              res.write(
                `data: ${JSON.stringify({
                  type: "tool_call",
                  tool: "search",
                  query: args.query,
                  reason: args.reason,
                })}\n\n`
              );

              // Execute search with expanded documents
              const newDocs = await searchAndExpandDocuments(args.query, {
                maxDocuments: 3,
                matchThreshold: 0.15,
                sourceType,
                sourceRepo,
              });

              // Send new sources
              if (newDocs.length > 0) {
                res.write(
                  `data: ${JSON.stringify({
                    type: "sources",
                    documents: newDocs.map((d) => ({
                      id: d.filePath,
                      source_id: d.filePath,
                      source_repo: d.sourceRepo,
                      similarity: d.similarity,
                      content_preview:
                        d.content.slice(0, 300) +
                        (d.content.length > 300 ? "..." : ""),
                      metadata: d.metadata,
                      title: d.title,
                    })),
                  })}\n\n`
                );
              }

              // Add tool result to messages
              const toolResult =
                newDocs.length > 0
                  ? formatExpandedDocumentsForContext(newDocs)
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
          const stream = provider.createStreamingCompletion({
            messages,
            maxTokens: 2048,
          });

          for await (const chunk of stream) {
            if (chunk.type === "text" && chunk.text) {
              res.write(
                `data: ${JSON.stringify({ type: "text", text: chunk.text })}\n\n`
              );
            }
          }
          break;
        }
      }
    } else {
      // No tool calling support - stream response directly using initial search context
      console.log("Starting streaming completion (no tools)...");
      console.log("Messages count:", messages.length);
      console.log("Context length:", initialContext.length, "chars");

      const stream = provider.createStreamingCompletion({
        messages,
        maxTokens: 2048,
      });

      let chunkCount = 0;
      for await (const chunk of stream) {
        chunkCount++;
        if (chunk.type === "text" && chunk.text) {
          res.write(
            `data: ${JSON.stringify({ type: "text", text: chunk.text })}\n\n`
          );
        } else if (chunk.type === "done") {
          console.log("Stream done, total chunks:", chunkCount);
        }
      }
      console.log("Finished streaming, chunks received:", chunkCount);
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (error) {
    console.error("Chat error:", error);

    // Check if headers already sent (SSE started)
    if (res.headersSent) {
      // Send error via SSE
      const errorMessage =
        error instanceof Error ? error.message : "Internal server error";
      res.write(
        `data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`
      );
      res.end();
      return;
    }

    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request", details: error.errors });
      return;
    }

    res.status(500).json({ error: "Internal server error" });
  }
});
