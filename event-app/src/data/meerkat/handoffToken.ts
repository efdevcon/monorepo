"use client";

import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/data/auth/supabase";

/**
 * The Meerkat hand-off token rendered into the "Ask a question" link
 * (components/schedule/SessionQA.tsx), traded for the tickets payload's Q&A
 * pass at /api/meerkat/token. In memory only: never SWR (persisted to
 * IndexedDB) or storage, gone on reload and on sign-out.
 *
 * One token per user and pass, shared by every mounted feed and renewed by
 * one timer: when under RENEW_BEFORE_MS remain, only while the page is
 * visible (rechecked on visibilitychange, pageshow and every remount). It is
 * withdrawn WITHDRAW_BEFORE_MS before it lapses, and the click re-checks it,
 * so a link never carries a token Meerkat would refuse. Failures (incl. no
 * session or a 401) back off and retry, sooner when Supabase signs in or
 * refreshes; a 403 (no valid pass) waits for a new pass, fetched once per
 * user and pass (requestPassRefresh).
 */

/** Renew the token once this little of its life remains. */
export const RENEW_BEFORE_MS = 10 * 60_000;
/** Stop rendering the token this long before it lapses. */
export const WITHDRAW_BEFORE_MS = 30_000;

export type HandoffProblem = "failed" | "no-pass";

export interface HandoffSnapshot {
  /** `${userId}:${pass}`, "" when there is nothing to fetch for. */
  key: string;
  token?: string;
  /** Local clock: receipt time + the server's ttlMs (no client/server clock skew). */
  expiresAt?: number;
  problem?: HandoffProblem;
  failures: number;
  /** No new attempt before this (local clock). */
  retryAt: number;
}

/** What the button shows. */
export type AskState = { kind: "ready"; token: string } | { kind: "loading" } | { kind: HandoffProblem };

/**
 * The button state for a snapshot, at `nowMs` when given. Renders pass no
 * time: tick() takes the token out of the store before it lapses.
 */
export function askState(snapshot: HandoffSnapshot, nowMs?: number): AskState {
  const fresh = nowMs === undefined || (!!snapshot.expiresAt && snapshot.expiresAt - nowMs > WITHDRAW_BEFORE_MS);
  if (snapshot.token && fresh) {
    return { kind: "ready", token: snapshot.token };
  }
  return snapshot.problem ? { kind: snapshot.problem } : { kind: "loading" };
}

/** Whether a new token should be fetched now: none or nearly spent, not waiting on a pass or session, past the back-off. */
export function needsToken(snapshot: HandoffSnapshot, nowMs: number): boolean {
  if (!snapshot.key || snapshot.problem === "no-pass") return false;
  if (nowMs < snapshot.retryAt) return false;
  return !snapshot.token || !snapshot.expiresAt || snapshot.expiresAt - nowMs <= RENEW_BEFORE_MS;
}

/** Back-off after `failures` failed attempts in a row: 2 minutes, then 5. */
export function retryDelayMs(failures: number): number {
  return failures <= 1 ? 2 * 60_000 : 5 * 60_000;
}

const EMPTY: HandoffSnapshot = { key: "", failures: 0, retryAt: 0 };

let snapshot: HandoffSnapshot = EMPTY;
let pass: string | undefined;
let inFlight = false;
let subscribers = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function set(next: Partial<HandoffSnapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

function visible(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "visible";
}

/** Withdraw a spent token, fetch when due, and wake again at the next deadline. */
function tick() {
  clearTimeout(timer);
  timer = undefined;
  if (subscribers === 0 || !snapshot.key) return;
  const now = Date.now();
  if (snapshot.token && snapshot.expiresAt && snapshot.expiresAt - now <= WITHDRAW_BEFORE_MS) {
    set({ token: undefined, expiresAt: undefined });
  }
  if (needsToken(snapshot, now) && !inFlight && visible()) {
    void fetchToken();
    return; // fetchToken ticks again when done
  }
  const wakes: number[] = [];
  if (snapshot.expiresAt) wakes.push(snapshot.expiresAt - RENEW_BEFORE_MS, snapshot.expiresAt - WITHDRAW_BEFORE_MS);
  if (snapshot.retryAt > now) wakes.push(snapshot.retryAt);
  const next = wakes.filter((at) => at > now);
  if (next.length) timer = setTimeout(tick, Math.min(...next) - now);
}

async function fetchToken() {
  const key = snapshot.key;
  inFlight = true;
  try {
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    // No session here, or one the server refused (401, possibly a Supabase
    // hiccup): a failure like any other, retried after the back-off or as
    // soon as Supabase signs in or refreshes. Never a sign-in dead end.
    if (!session) throw new Error("no session");
    const res = await fetch("/api/meerkat/token", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ pass }),
    });
    if (snapshot.key !== key) return; // user or pass changed meanwhile
    if (res.status === 403) return set({ problem: "no-pass" });
    const json: { success?: boolean; data?: { token?: string; ttlMs?: number } } = await res.json();
    const token = json.data?.token;
    const ttlMs = json.data?.ttlMs;
    if (!res.ok || !json.success || !token || typeof ttlMs !== "number") throw new Error(`token ${res.status}`);
    set({ token, expiresAt: Date.now() + ttlMs, problem: undefined, failures: 0, retryAt: 0 });
  } catch {
    if (snapshot.key !== key) return;
    const failures = snapshot.failures + 1;
    set({ failures, retryAt: Date.now() + retryDelayMs(failures), problem: "failed" });
  } finally {
    inFlight = false;
    tick();
  }
}

/** Point the store at this user and pass; any other token is dropped at once. */
function target(userId: string | undefined, nextPass: string | undefined) {
  const key = userId && nextPass ? `${userId}:${nextPass}` : "";
  if (key === snapshot.key) return;
  pass = nextPass;
  snapshot = { ...EMPTY, key };
  listeners.forEach((listener) => listener());
  tick();
}

let globalsInstalled = false;
function installGlobals() {
  if (globalsInstalled || typeof window === "undefined") return;
  globalsInstalled = true;
  document.addEventListener("visibilitychange", tick);
  window.addEventListener("pageshow", tick);
  supabase?.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      target(undefined, undefined);
    } else if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && snapshot.problem === "failed") {
      set({ problem: undefined, retryAt: 0 });
      // Outside the auth callback: auth-js holds its lock while it runs.
      setTimeout(tick, 0);
    }
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether the store holds a token Meerkat will still take (for the click-time check). */
export function handoffTokenUsable(nowMs: number = Date.now()): boolean {
  return askState(snapshot, nowMs).kind === "ready";
}

/** Re-check now: withdraw a lapsed token and fetch a new one (after a click on a stale link). */
export function recheckHandoff() {
  tick();
}

/**
 * One tickets refetch per user and pass (the payload lacks a usable pass),
 * however many feeds ask: each refetch is a Pretix lookup. `force` is the
 * attendee's own retry.
 */
const passRefreshes = new Map<string, "pending" | "done">();
export function requestPassRefresh(key: string, refetch: () => unknown, force = false) {
  const state = passRefreshes.get(key);
  if (state === "pending" || (state === "done" && !force)) return;
  passRefreshes.set(key, "pending");
  listeners.forEach((listener) => listener());
  void Promise.resolve(refetch()).finally(() => {
    passRefreshes.set(key, "done");
    listeners.forEach((listener) => listener());
  });
}

/** Where that refetch stands for this user and pass. */
export function usePassRefreshState(key: string | null): "idle" | "pending" | "done" {
  return useSyncExternalStore(
    subscribe,
    () => (key ? passRefreshes.get(key) ?? "idle" : "idle"),
    () => "idle"
  );
}

/** After "Couldn't get your Q&A link": try again now. */
export function retryHandoff() {
  if (snapshot.problem !== "failed") return;
  set({ problem: undefined, retryAt: 0 });
  tick();
}

/**
 * The hand-off for `userId` with the tickets payload's `qaPass`, as the
 * button should show it. Nothing is fetched while either is missing; the
 * server render and the first client render are always "loading".
 */
export function useHandoffToken(
  userId: string | undefined,
  qaPass: string | undefined
): { ask: AskState; problem?: HandoffProblem } {
  useEffect(() => {
    installGlobals();
    subscribers += 1;
    // A remount may find the timer stopped (last feed unmounted) or a token
    // that lapsed meanwhile: re-check at once.
    tick();
    return () => {
      subscribers -= 1;
      if (subscribers === 0) clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    target(userId, qaPass);
  }, [userId, qaPass]);
  const current = useSyncExternalStore(subscribe, () => snapshot, () => EMPTY);
  // tick() withdraws the token from the store before it lapses, so the
  // render reads the store as is; the click re-checks with the clock.
  const mine = current.key && current.key === `${userId}:${qaPass}` ? current : EMPTY;
  return { ask: askState(mine), problem: mine.problem };
}
