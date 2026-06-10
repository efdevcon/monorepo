"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import type { Components } from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import Markdown from "react-markdown";
import cn from "classnames";
import {
  ArrowUp,
  ChevronDown,
  FileText,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { supabase } from "@/data/auth/supabase";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Map devcon-ai's portable `source:<id>` URIs to event-app's local routes.
// Bot's source_ids look like `sessions/<slug>` or `speakers/<slug>`; anything
// else falls back to a generic `/<stripped path>` so the ID stays clickable
// even before that route exists.
function resolveSourceUri(href: string): string | null {
  if (!href.startsWith("source:")) return null;
  const path = href
    .slice("source:".length)
    .replace(/#chunk-\d+$/, "")
    .replace(/#\d+$/, "");
  if (path.startsWith("sessions/")) {
    return `/schedule/${path.slice("sessions/".length)}`;
  }
  if (path.startsWith("speakers/")) {
    return `/speakers/${path.slice("speakers/".length)}`;
  }
  return `/${path}`;
}

interface Source {
  id: string;
  source_id: string;
  source_repo: string;
  similarity: number;
  content_preview: string;
  metadata: Record<string, unknown>;
}

interface DevaBotProps {
  toggled: boolean;
  onToggle: (visible: boolean) => void;
}

const STORAGE_KEY = "devabot_messages";

export default function DevaBot({ toggled, onToggle }: DevaBotProps) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [error, setError] = useState("");
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [showSources, setShowSources] = useState(false);
  const [debugContext, setDebugContext] = useState<string>("");
  const [showDebugContext, setShowDebugContext] = useState(false);

  const markdownComponents = useMemo<Components>(
    () => ({
      a: ({ href, children, ...rest }) => {
        // Model sometimes emits `[Title]()` with no destination — render as
        // bold text so we never produce a link to the current origin.
        if (!href || href === "#") {
          return <strong>{children}</strong>;
        }
        const resolved = resolveSourceUri(href);
        if (resolved) {
          return (
            <a
              href={resolved}
              className="text-purple-600 underline"
              onClick={() => onToggle(false)}
            >
              {children}
            </a>
          );
        }
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            {...rest}
          >
            {children}
          </a>
        );
      },
    }),
    [onToggle],
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load messages from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load messages:", e);
      }
    }
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => setIsSmallScreen(window.innerWidth < 500);
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  // Lock body scroll when open
  useEffect(() => {
    if (toggled) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [toggled]);

  const handleSend = async () => {
    if (isLoading || !query.trim()) return;

    const userMessage: Message = { role: "user", content: query.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setQuery("");
    setIsLoading(true);
    setStreamingMessage("");
    setError("");
    setSources([]);
    setDebugContext("");

    try {
      // Call our login-gated proxy (same-origin) with the Supabase token.
      const token = (await supabase?.auth.getSession())?.data.session
        ?.access_token;
      const response = await fetch(`/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log("SSE data:", data);
              if (data.type === "sources") {
                console.log("Sources received:", data.documents);
                setSources(data.documents || []);
              } else if (data.type === "debug_context") {
                console.log("Debug context received:", data.contextLength, "chars");
                setDebugContext(data.context || "");
              } else if (data.type === "text") {
                assistantContent += data.text;
                setStreamingMessage(assistantContent);
              } else if (data.type === "done") {
                // Finished streaming
              }
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }

      // Add assistant message to history
      if (assistantContent) {
        setMessages([...newMessages, { role: "assistant", content: assistantContent }]);
      }
      setStreamingMessage("");
    } catch (e: any) {
      console.error("Chat error:", e);
      setError(e.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setStreamingMessage("");
    setError("");
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AnimatePresence>
      {toggled && (
        <motion.div
          className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm"
          onClick={() => onToggle(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 flex h-full w-[420px] max-w-full flex-col bg-white shadow-2xl"
            initial={{ [isSmallScreen ? "y" : "x"]: "100%" }}
            animate={{ [isSmallScreen ? "y" : "x"]: "0%" }}
            exit={{ [isSmallScreen ? "y" : "x"]: "100%" }}
            transition={{ duration: 0.3 }}
          >
            {/* Header — devcon logo + Deva AI badge */}
            <div className="flex items-center justify-between gap-3 border-b border-[#E1E4EA] px-4 py-3">
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/login/devcon-8-logo.svg"
                  alt="Devcon 8 India"
                  className="h-7 w-auto"
                />
                <span className="inline-flex items-center gap-1 rounded-full bg-[#f3eeff] px-2 py-0.5 text-xs font-semibold text-[#7D52F4]">
                  <Sparkles className="h-3 w-3" />
                  Deva AI
                </span>
              </div>
              <button
                onClick={() => onToggle(false)}
                aria-label="Close"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sources (collapsible) */}
            {sources.length > 0 && (
              <div className="border-b border-[#E1E4EA] px-4 py-2">
                <button
                  onClick={() => setShowSources(!showSources)}
                  className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  <Search className="h-3.5 w-3.5" />
                  {sources.length} source{sources.length > 1 ? "s" : ""}
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      showSources && "rotate-180"
                    )}
                  />
                </button>
                {showSources && (
                  <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
                    {sources.map((s, i) => (
                      <div
                        key={s.id}
                        className="rounded-lg bg-gray-50 p-2 text-xs"
                      >
                        <div className="font-semibold text-gray-700">
                          [{i + 1}] {s.source_id}{" "}
                          <span className="font-normal text-gray-400">
                            {(s.similarity * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="mt-0.5 line-clamp-2 text-gray-500">
                          {s.content_preview}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Debug context — dev only */}
            {process.env.NODE_ENV === "development" && debugContext && (
              <div className="border-b border-[#E1E4EA] px-4 py-2">
                <button
                  onClick={() => setShowDebugContext(!showDebugContext)}
                  className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Context · {debugContext.length.toLocaleString()} chars
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      showDebugContext && "rotate-180"
                    )}
                  />
                </button>
                {showDebugContext && (
                  <pre className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-2 text-[11px] text-gray-500">
                    {debugContext}
                  </pre>
                )}
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="flex items-center justify-between gap-2 bg-red-50 px-4 py-2 text-sm text-red-600">
                <span>{error}</span>
                <button
                  onClick={() => setError("")}
                  className="shrink-0 cursor-pointer text-xs underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 space-y-3 overflow-y-auto bg-gray-50/50 p-4 pb-24"
            >
              {messages.length === 0 && !streamingMessage && (
                <div className="mt-16 flex flex-col items-center text-center">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f3eeff] text-[#7D52F4]">
                    <Sparkles className="h-6 w-6" />
                  </span>
                  <p className="text-lg font-bold">Ask Deva anything</p>
                  <p className="mt-1 max-w-[16rem] text-sm text-gray-500">
                    Speakers, schedule, sessions — ask away.
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn("max-w-[85%] px-3.5 py-2.5 text-sm", {
                    "ml-auto rounded-2xl rounded-br-md bg-[#7D52F4] text-white":
                      msg.role === "user",
                    "mr-auto rounded-2xl rounded-bl-md border border-[#E1E4EA] bg-white shadow-sm":
                      msg.role === "assistant",
                  })}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none">
                      <Markdown components={markdownComponents}>
                        {msg.content}
                      </Markdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              ))}

              {streamingMessage && (
                <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-md border border-[#E1E4EA] bg-white p-3.5 text-sm shadow-sm">
                  <div className="prose prose-sm max-w-none">
                    <Markdown components={markdownComponents}>
                      {streamingMessage}
                    </Markdown>
                  </div>
                </div>
              )}

              {isLoading && !streamingMessage && (
                <div className="mr-auto flex max-w-[85%] gap-1 rounded-2xl rounded-bl-md border border-[#E1E4EA] bg-white px-4 py-3 shadow-sm">
                  {[0, 0.15, 0.3].map((d) => (
                    <span
                      key={d}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                      style={{ animationDelay: `${d}s` }}
                    />
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Floating input — overlays the chat instead of a docked footer */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 px-3 pt-8 bg-gradient-to-t from-white via-white/90 to-transparent"
              style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
            >
              {messages.length > 0 && !isLoading && (
                <button
                  onClick={handleReset}
                  className="pointer-events-auto cursor-pointer rounded-full border border-[#E1E4EA] bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm backdrop-blur transition-colors hover:bg-gray-100"
                >
                  Clear conversation
                </button>
              )}
              <div className="pointer-events-auto flex w-full items-center gap-1 rounded-full border border-[#E1E4EA] bg-white py-1.5 pl-4 pr-1.5 shadow-lg transition-colors hover:border-gray-300 focus-within:border-[#7D52F4] focus-within:hover:border-[#7D52F4]">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={isLoading ? "Waiting for response…" : "Ask me anything…"}
                  className="flex-1 bg-transparent text-sm outline-none"
                  disabled={isLoading}
                />
                {query && !isLoading && (
                  <button
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    aria-label="Clear"
                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={handleSend}
                  disabled={isLoading || !query.trim()}
                  aria-label="Send"
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
                    isLoading
                      ? "text-gray-400"
                      : query.trim()
                        ? "cursor-pointer bg-[#7D52F4] text-white hover:bg-[#6A3FD1]"
                        : "bg-gray-200 text-gray-400"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ArrowUp className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
