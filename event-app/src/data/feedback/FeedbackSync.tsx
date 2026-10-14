"use client";

import { useEffect } from "react";
import { useOnline } from "@/hooks/useOnline";
import { installConsoleCapture } from "./consoleCapture";
import { flushFeedbackOutbox } from "./outbox";

/**
 * Mount once at the app root: starts the console capture and sends queued
 * feedback reports when the app opens, comes back to the foreground or gets
 * its connection back (same triggers as the interests sync).
 */
export function FeedbackSync() {
  const online = useOnline();

  useEffect(() => {
    installConsoleCapture();
    void flushFeedbackOutbox();
    const onVisible = () => {
      if (document.visibilityState === "visible") void flushFeedbackOutbox();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    if (online) void flushFeedbackOutbox();
  }, [online]);

  return null;
}
