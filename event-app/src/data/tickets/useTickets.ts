"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import QRCode from "qrcode";
import { supabase } from "@/data/auth/supabase";
import { useUser } from "@/data/auth/useUser";
import { isTransientFetchError, retryOnce } from "@/utils/retryOnce";
import { derivePrimary, ticketPrompt } from "./primary";
import type { TicketsPayload, TicketsResponse } from "./types";

/** Pause before the single automatic retry of a dropped first request. */
const RETRY_DELAY_MS = 1_000;

async function accessToken(): Promise<string> {
  if (!supabase) throw new Error("Supabase not initialized");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not signed in");
  return session.access_token;
}

/**
 * Fetch the signed-in user's tickets from `/api/tickets`, sending the Supabase
 * access token so the server can derive the email and query Pretix. A request
 * that never reaches a JSON response (Safari's "Load failed", a cold edge
 * answering with an HTML error page) is retried once after a second before
 * the hook reports an error: right after sign-in the screen has no cached
 * tickets, so a single dropped request used to flash red before the next
 * attempt succeeded. Application errors are not retried.
 */
async function fetchTickets(): Promise<TicketsPayload> {
  const token = await accessToken();
  return retryOnce(
    async () => {
      const res = await fetch("/api/tickets", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json: TicketsResponse = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || "Failed to load tickets");
      }
      return json.data;
    },
    isTransientFetchError,
    RETRY_DELAY_MS
  );
}

export type AttachResult = { ok: true } | { ok: false; error: string };

/** POST (attach) or DELETE (detach) against the attach route; resolves with the new payload or the server's message. */
async function attachRequest(
  method: "POST" | "DELETE",
  body: Record<string, unknown>
): Promise<{ ok: true; data: TicketsPayload } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/tickets/attach", {
      method,
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const json: TicketsResponse = await res.json();
    if (!json.success || !json.data) {
      return { ok: false, error: json.error || "Couldn't attach the ticket, try again" };
    }
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, error: "Couldn't reach the server, check your connection" };
  }
}

/**
 * Reusable hook for the user's tickets.
 *
 * Backed by SWR, whose cache is persisted to IndexedDB via Dexie (see
 * `src/data/cache`), so tickets remain available offline after the first load.
 * Only fetches once a user is signed in.
 *
 * Returns the orders, the primary ticket ("my ticket", see primary.ts) and
 * which prompt the ticket tab should show, a map of `secret -> QR data URL`,
 * loading/error state, a `refresh()` that revalidates, and `attach` (QR
 * screenshot), `choose` (one of the email-matched tickets) and `detach`, all
 * of which replace the cached payload with the server's answer, no second
 * fetch.
 */
export function useTickets() {
  const { user, hasInitialized } = useUser();

  const { data, error, isValidating, mutate } = useSWR(
    user ? ["tickets", user.id] : null,
    fetchTickets,
    { revalidateOnFocus: false, dedupingInterval: 10_000 }
  );

  // "Loading" until auth resolves AND the first fetch has returned (data or
  // error). Avoids a flash of the empty state before the SWR key is even set
  // (which only happens once `user` is known).
  const loading =
    !hasInitialized || (!!user && data === undefined && error === undefined);

  const tickets = data?.tickets ?? [];
  const primary = useMemo(() => derivePrimary(data?.tickets ?? []), [data]);
  const prompt = useMemo(() => ticketPrompt(data?.tickets ?? []), [data]);

  const [attaching, setAttaching] = useState(false);
  const attach = async (code: string): Promise<AttachResult> => {
    setAttaching(true);
    try {
      const result = await attachRequest("POST", { code });
      if (result.ok) await mutate(result.data, { revalidate: false });
      return result.ok ? { ok: true } : result;
    } finally {
      setAttaching(false);
    }
  };
  /** "This one is mine" among the email-matched tickets: no QR needed. */
  const choose = async (positionId: number): Promise<AttachResult> => {
    setAttaching(true);
    try {
      const result = await attachRequest("POST", { positionId });
      if (result.ok) await mutate(result.data, { revalidate: false });
      return result.ok ? { ok: true } : result;
    } finally {
      setAttaching(false);
    }
  };
  const detach = async (positionId: number): Promise<AttachResult> => {
    setAttaching(true);
    try {
      const result = await attachRequest("DELETE", { positionId });
      if (result.ok) await mutate(result.data, { revalidate: false });
      return result.ok ? { ok: true } : result;
    } finally {
      setAttaching(false);
    }
  };

  // Derive QR codes from the (cached) ticket secrets — no network needed, so
  // they regenerate offline from the persisted data.
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const codes: Record<string, string> = {};
      const secrets = new Set<string>();
      for (const order of tickets) {
        for (const ticket of order.tickets) {
          if (ticket.secret) secrets.add(ticket.secret);
          for (const addon of ticket.addons ?? []) {
            if (addon.secret) secrets.add(addon.secret);
          }
        }
      }
      for (const secret of secrets) {
        try {
          // 512px covers the modal's 180px frame crisply on 2–3x displays.
          codes[secret] = await QRCode.toDataURL(secret, {
            width: 512,
            margin: 1,
            color: { dark: "#000000", light: "#FFFFFF" },
          });
        } catch (err) {
          console.error("Failed to generate QR code:", err);
        }
      }
      if (!cancelled) setQrCodes(codes);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return {
    tickets,
    primary,
    prompt,
    /** Attached tickets Pretix no longer verified on the last fetch (their links were removed). */
    removedAttachments: data?.removedAttachments ?? 0,
    qrCodes,
    isLoading: loading,
    /** True during a background revalidation (e.g. Refresh) when data exists. */
    isRefreshing: isValidating && data !== undefined,
    error: error as Error | undefined,
    refresh: () => mutate(),
    attach,
    choose,
    detach,
    attaching,
  };
}
