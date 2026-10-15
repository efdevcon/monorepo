"use client";

import { useEffect, useId, useSyncExternalStore } from "react";
import type { FeedbackError, FeedbackSource } from "./types";

/**
 * App-wide "open the feedback sheet" request, same pattern as the DevaBot
 * panel: the sheet is mounted once in the root layout, and any place (Home,
 * My Devcon, the crash page, the floating button) opens it without a
 * callback through the tree. `openedAt` makes a repeat request a new object.
 */
export interface FeedbackRequest {
  source: FeedbackSource;
  error?: FeedbackError;
  openedAt: number;
}

let current: FeedbackRequest | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((cb) => cb());
}

export function openFeedback(req: { source?: FeedbackSource; error?: FeedbackError } = {}): void {
  current = { source: req.source ?? "feedback", error: req.error, openedAt: Date.now() };
  emit();
}

export function closeFeedback(): void {
  if (!current) return;
  current = null;
  emit();
}

export function useFeedbackRequest(): FeedbackRequest | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => current,
    () => null
  );
}

/**
 * Pages whose own dialogs land in the floating button's corner (the map's
 * area card on phones) register themselves as covering it while they are
 * open; the button fades out meanwhile, like the map's bottom controls do.
 * A set of callers, not a flag, so two covering dialogs can overlap in time.
 */
const covering = new Set<string>();
const coverListeners = new Set<() => void>();

export function useHideFeedbackFab(hidden: boolean): void {
  const id = useId();
  useEffect(() => {
    if (!hidden) return;
    covering.add(id);
    coverListeners.forEach((cb) => cb());
    return () => {
      covering.delete(id);
      coverListeners.forEach((cb) => cb());
    };
  }, [hidden, id]);
}

export function useFeedbackFabHidden(): boolean {
  return useSyncExternalStore(
    (cb) => {
      coverListeners.add(cb);
      return () => {
        coverListeners.delete(cb);
      };
    },
    () => covering.size > 0,
    () => false
  );
}

/**
 * The root-layout crash page has no providers and no sheet. It stores the
 * error here and sends the browser to `/?feedback=crash`; the sheet picks it
 * up on load. sessionStorage: one tab, gone when the tab closes.
 */
export const FEEDBACK_PARAM = "feedback";
const CRASH_KEY = "feedback.crash";

export function describeError(error: Error & { digest?: string }): FeedbackError {
  return {
    message: String(error.message || error.name || "Unknown error").slice(0, 1_000),
    digest: error.digest,
    stack: error.stack?.split("\n").slice(0, 8).join("\n").slice(0, 2_000),
  };
}

export function rememberCrash(error: Error & { digest?: string }): void {
  try {
    sessionStorage.setItem(CRASH_KEY, JSON.stringify(describeError(error)));
  } catch {}
}

export function takeRememberedCrash(): FeedbackError | null {
  try {
    const raw = sessionStorage.getItem(CRASH_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(CRASH_KEY);
    return JSON.parse(raw) as FeedbackError;
  } catch {
    return null;
  }
}
