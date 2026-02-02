"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Markdown from "react-markdown";
import cn from "classnames";

interface Message {
  role: "user" | "assistant";
  content: string;
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
  apiUrl?: string;
}

const STORAGE_KEY = "devabot_messages";

export default function DevaBot({ toggled, onToggle, apiUrl }: DevaBotProps) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [error, setError] = useState("");
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [showSources, setShowSources] = useState(false);

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

    try {
      const baseUrl = apiUrl || process.env.NEXT_PUBLIC_DEVABOT_API_URL || "http://localhost:3001";
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          className="fixed inset-0 z-[10000] bg-black/60"
          onClick={() => onToggle(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 h-full w-[400px] max-w-full bg-white shadow-xl flex flex-col"
            initial={{ [isSmallScreen ? "y" : "x"]: "100%" }}
            animate={{ [isSmallScreen ? "y" : "x"]: "0%" }}
            exit={{ [isSmallScreen ? "y" : "x"]: "100%" }}
            transition={{ duration: 0.3 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-bold text-lg">Deva AI</h2>
              <button
                onClick={() => onToggle(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300"
              >
                ✕
              </button>
            </div>

            {/* Sources toggle */}
            {sources.length > 0 && (
              <div className="px-4 py-2 bg-yellow-50 border-b">
                <button
                  onClick={() => setShowSources(!showSources)}
                  className="text-xs font-mono text-yellow-800"
                >
                  🔍 {sources.length} sources fetched (click to {showSources ? "hide" : "show"})
                </button>
                {showSources && (
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                    {sources.map((s, i) => (
                      <div key={s.id} className="text-xs font-mono bg-yellow-100 p-2 rounded">
                        <div className="font-bold">
                          [{i + 1}] {s.source_id} ({(s.similarity * 100).toFixed(1)}%)
                        </div>
                        <div className="text-yellow-700 mt-1">{s.content_preview}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-sm">
                {error}
                <button onClick={() => setError("")} className="ml-2 underline">
                  Dismiss
                </button>
              </div>
            )}

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {messages.length === 0 && !streamingMessage && (
                <div className="text-center text-gray-500 mt-20">
                  <p className="text-lg font-medium mb-2">Ask me anything</p>
                  <p className="text-sm">About Devcon, speakers, schedule, and more.</p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn("max-w-[85%] p-3 rounded-xl text-sm", {
                    "ml-auto bg-purple-600 text-white rounded-br-none": msg.role === "user",
                    "mr-auto bg-gray-100 rounded-bl-none": msg.role === "assistant",
                  })}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              ))}

              {streamingMessage && (
                <div className="max-w-[85%] mr-auto bg-gray-100 rounded-xl rounded-bl-none p-3 text-sm">
                  <div className="prose prose-sm max-w-none">
                    <Markdown>{streamingMessage}</Markdown>
                  </div>
                </div>
              )}

              {isLoading && !streamingMessage && (
                <div className="max-w-[85%] mr-auto bg-gray-100 rounded-xl rounded-bl-none p-3 text-sm text-gray-500">
                  Thinking...
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Actions */}
            {messages.length > 0 && !isLoading && (
              <div className="px-4 pb-2">
                <button
                  onClick={handleReset}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear conversation
                </button>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
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
                  placeholder="Ask me anything..."
                  className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !query.trim()}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    query.trim() ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-400"
                  )}
                >
                  ↑
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
