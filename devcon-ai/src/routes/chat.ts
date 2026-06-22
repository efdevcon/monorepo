import { Router } from "express";
import { z } from "zod";
import {
  searchDocuments,
  searchAndExpandDocuments,
  getDocumentContext,
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
const SYSTEM_PROMPT_WITH_TOOLS = `You are Deva, a helpful AI assistant for Devcon Mumbai in November (2026, November 3 to 6). 

IMPORTANT: You have a search_knowledge_base tool. ALWAYS use it before saying you don't know something.

Choosing where to search (the tool's "source" argument):
- Default to "content" — the official Devcon website & docs. Use it for general, definitional, or practical questions: what Devcon is about, tickets, venue, rules, how-to, etc.
- Use "sessions" ONLY when the user is discovering talks, interests or speakers: a topic they're interested in, a specific speaker or track, or "what should I attend". The session catalog is for talk discovery, not for explaining Devcon itself.
- Use "all" only when a question genuinely spans both.
The initial results provided below are content-biased on purpose; if the user is asking about talks/topics, do a follow-up search with source:"sessions".

If a result looks relevant but its text is cut off (ends mid-sentence or with [...truncated]), call expand_context with that result's source id to read the full document — don't burn a search on it.

If the initial search results don't contain what the user is asking about:
1. Look for potential typos in the user's query and search with corrected spelling
2. Try searching for related terms or synonyms
3. Search for specific keywords from the question

Examples of when to use the search tool:
- User asks about "tabelcloth" → search for "tablecloth" (corrected spelling)
- User asks about "devcon tickets" but results don't help → search "ticket price" or "ticket sale"
- Initial results seem irrelevant → search with more specific terms

Only say "I don't have information about that" AFTER trying at least one search with alternative terms.

CROPS alignment — Devcon and Ethereum are guided by the Ethereum Foundation's CROPS values: Censorship Resistance, Open-source (free as in freedom), Privacy, and Security. Treat these as an indivisible whole in service of user self-sovereignty. Keep your answers aligned with them: favour permissionless, open, privacy-preserving, secure, self-sovereign approaches, and never endorse censorship, proprietary lock-in, surveillance, or insecure practices. When it's relevant, frame Devcon and Ethereum through this lens.

When answering:
- Be friendly and concise
- Use the provided context
- Format with markdown when helpful
- Citations: each numbered context entry has a "Link:" line. WHENEVER you mention a session, speaker, or document title that appears in the context, you MUST wrap it in a markdown link using that entry's Link value verbatim, e.g. \`[Privacy-First CBDCs](source:sessions/privacy-first-cbdcs)\`. This is not optional — every mention of a context item must be linked.
- NEVER emit a markdown link with an empty destination like \`[Title]()\`. If for any reason you don't have a Link value, write the title as plain text instead — do not wrap it in brackets at all.
- The link target MUST start with \`source:\` and MUST exactly match a Link value from the context. Never invent URLs, never use http/https for citations.`;

// System prompt for models WITHOUT tool calling (HuggingFace, etc.)
const SYSTEM_PROMPT_NO_TOOLS = `You are Deva, a helpful AI assistant for Devcon and the Ethereum Foundation ecosystem.

You will be provided with search results from a knowledge base. Answer the user's question based ONLY on the provided context.

Rules:
- Answer based on the provided search results only
- If the search results don't contain relevant information, say "I don't have information about that in my knowledge base"
- Do NOT make up information or pretend to search
- Do NOT write out fake function calls or searches
- CROPS alignment: Devcon and Ethereum follow the Ethereum Foundation's CROPS values — Censorship Resistance, Open-source, Privacy, Security. Keep answers aligned with these (permissionless, open, privacy-preserving, secure, self-sovereign); never endorse censorship, proprietary lock-in, surveillance, or insecure practices.
- Be friendly and concise
- Format with markdown when helpful
- Citations: each numbered context entry has a "Link:" line. WHENEVER you mention a session, speaker, or document title that appears in the context, you MUST wrap it in a markdown link using that entry's Link value verbatim, e.g. \`[Privacy-First CBDCs](source:sessions/privacy-first-cbdcs)\`. This is not optional — every mention of a context item must be linked.
- NEVER emit a markdown link with an empty destination like \`[Title]()\`. If for any reason you don't have a Link value, write the title as plain text instead — do not wrap it in brackets at all.
- The link target MUST start with \`source:\` and MUST exactly match a Link value from the context. Never invent URLs, never use http/https for citations.`;

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
        source: {
          type: "string",
          enum: ["content", "sessions", "all"],
          description:
            "Which corpus to search. 'content' = official Devcon/Devconnect website & docs (use for general, definitional, or practical questions — what/how/where/when, tickets, venue, rules). 'sessions' = the talk/session catalog (use ONLY when the user is discovering talks: topics they're interested in, a speaker, a track, 'what should I attend'). 'all' = both. Default to 'content'.",
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

const EXPAND_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "expand_context",
    description:
      "Read the FULL text of a document you already found. Use this when a search result looks relevant but is truncated or you're close to the answer — prefer it over running another search. Pass the source id from a result's 'Link:' line.",
    parameters: {
      type: "object",
      properties: {
        source_id: {
          type: "string",
          description:
            "The source id / Link value of the document to expand, e.g. 'sessions/foo' or 'pages/bar.mdx' (a leading 'source:' is fine).",
        },
      },
      required: ["source_id"],
    },
  },
};

chatRouter.post("/", async (req, res) => {
  try {
    const { message, history, sourceType, sourceRepo } = chatSchema.parse(
      req.body,
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
      `Initial search found ${expandedDocs.length} full documents for: "${message}"`,
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
      })}\n\n`,
    );

    // Build initial context from full documents
    const initialContext = formatExpandedDocumentsForContext(expandedDocs);

    // Send full context to frontend for debugging
    res.write(
      `data: ${JSON.stringify({
        type: "debug_context",
        context: initialContext,
        contextLength: initialContext.length,
      })}\n\n`,
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
      let streamedAnswer = false;

      while (toolCallCount < MAX_TOOL_CALLS) {
        const response = await provider.createCompletion({
          messages,
          tools: [SEARCH_TOOL, EXPAND_TOOL],
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
                `Tool call #${toolCallCount}: search for "${args.query}" [source: ${args.source || "default"}] (${args.reason || "no reason"})`,
              );

              // Map the model's chosen corpus to a source_type filter. A
              // request-level sourceType (dashboard scope) always wins.
              const sourceTypeByArg =
                args.source === "content"
                  ? "github"
                  : args.source === "sessions"
                    ? "devcon-api"
                    : undefined; // "all" or unset → no filter
              const effectiveSourceType = sourceType ?? sourceTypeByArg;

              // Notify frontend about the search
              res.write(
                `data: ${JSON.stringify({
                  type: "tool_call",
                  tool: "search",
                  query: args.query,
                  source: args.source,
                  reason: args.reason,
                })}\n\n`,
              );

              // Execute search with expanded documents
              const newDocs = await searchAndExpandDocuments(args.query, {
                maxDocuments: 3,
                matchThreshold: 0.15,
                sourceType: effectiveSourceType,
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
                  })}\n\n`,
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
            } else if (toolCall.function.name === "expand_context") {
              const args = JSON.parse(toolCall.function.arguments);
              const sid = String(args.source_id || "");
              console.log(
                `Tool call #${toolCallCount}: expand_context "${sid}"`,
              );

              // Surface in the debugger as an "expand" tool call.
              res.write(
                `data: ${JSON.stringify({
                  type: "tool_call",
                  tool: "expand",
                  query: sid,
                  source: "expand",
                  reason: "reading full document",
                })}\n\n`,
              );

              const doc = await getDocumentContext(sid, { sourceRepo });

              if (doc) {
                res.write(
                  `data: ${JSON.stringify({
                    type: "sources",
                    documents: [
                      {
                        id: doc.filePath,
                        source_id: doc.filePath,
                        source_repo: doc.sourceRepo,
                        similarity: doc.similarity,
                        content_preview:
                          doc.content.slice(0, 300) +
                          (doc.content.length > 300 ? "..." : ""),
                        metadata: doc.metadata,
                        title: doc.title,
                      },
                    ],
                  })}\n\n`,
                );
              }

              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: doc
                  ? formatExpandedDocumentsForContext([doc])
                  : "No document found for that source id.",
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
                `data: ${JSON.stringify({ type: "text", text: chunk.text })}\n\n`,
              );
            }
          }
          streamedAnswer = true;
          break;
        }
      }

      // The model can exhaust MAX_TOOL_CALLS while still wanting to search,
      // which exits the loop before it ever answers. Force one final completion
      // WITHOUT tools so it responds from the context already gathered — instead
      // of leaving the user with no reply.
      if (!streamedAnswer) {
        const stream = provider.createStreamingCompletion({
          messages,
          maxTokens: 2048,
        });
        for await (const chunk of stream) {
          if (chunk.type === "text" && chunk.text) {
            res.write(
              `data: ${JSON.stringify({ type: "text", text: chunk.text })}\n\n`,
            );
          }
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
            `data: ${JSON.stringify({ type: "text", text: chunk.text })}\n\n`,
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
        `data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`,
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
