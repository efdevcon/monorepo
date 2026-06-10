"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import QRCode from "qrcode";
import { supabase } from "@/data/auth/supabase";
import { useUser } from "@/data/auth/useUser";
import type { Order, TicketsResponse } from "./types";

/**
 * Fetch the signed-in user's tickets from `/api/tickets`, sending the Supabase
 * access token so the server can derive the email and query Pretix.
 */
async function fetchTickets(): Promise<{ tickets: Order[] }> {
  if (!supabase) throw new Error("Supabase not initialized");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not signed in");

  const res = await fetch("/api/tickets", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json: TicketsResponse = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || "Failed to load tickets");
  }
  return json.data;
}

/**
 * Reusable hook for the user's tickets.
 *
 * Backed by SWR, whose cache is persisted to IndexedDB via Dexie (see
 * `src/data/cache`), so tickets remain available offline after the first load.
 * Only fetches once a user is signed in.
 *
 * Returns the orders, a map of `secret -> QR data URL`, loading/error state and
 * a `refresh()` that revalidates.
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
          codes[secret] = await QRCode.toDataURL(secret, {
            width: 200,
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
    qrCodes,
    isLoading: loading,
    /** True during a background revalidation (e.g. Refresh) when data exists. */
    isRefreshing: isValidating && data !== undefined,
    error: error as Error | undefined,
    refresh: () => mutate(),
  };
}
