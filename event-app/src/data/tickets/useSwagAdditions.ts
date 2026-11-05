"use client";

import useSWR from "swr";
import { supabase } from "@/data/auth/supabase";
import type { SwagAdditionOffer } from "./swagAdditions";

type Response<T> = { success: boolean; data?: T; error?: string };

async function callSwagAdditions<T>(body: Record<string, string | number>): Promise<T> {
  if (!supabase) throw new Error("Not signed in");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not signed in");
  const res = await fetch("/api/swag-additions", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: Response<T> = await res.json().catch(() => ({ success: false, error: "Unexpected response" }));
  if (!json.success || !json.data) throw new Error(json.error || "Something went wrong, please try again");
  return json.data;
}

/**
 * The extra swag each of these checked-in tickets can buy (prices and what is
 * left), by ticket secret. Cached (Dexie-backed SWR) and re-read on focus, so
 * a purchase shows when the attendee comes back from checkout. A ticket whose
 * offers fail to load simply offers nothing.
 */
export function useSwagAdditions(ticketSecrets: string[]) {
  const secrets = [...ticketSecrets].sort();
  const { data, isLoading } = useSWR<Record<string, SwagAdditionOffer[]>>(
    secrets.length > 0 ? ["swag-additions", ...secrets] : null,
    async () => {
      const entries = await Promise.all(
        secrets.map(async (secret) => {
          try {
            const { offers } = await callSwagAdditions<{ offers: SwagAdditionOffer[] }>({
              action: "status",
              ticketSecret: secret,
            });
            return [secret, offers] as const;
          } catch {
            return [secret, []] as const;
          }
        })
      );
      return Object.fromEntries(entries);
    },
    { revalidateOnFocus: true, dedupingInterval: 5000 }
  );
  return { offersBySecret: data ?? {}, isLoading };
}

/** The Pretix page that redeems this ticket's voucher for the addition (created on first ask). */
export async function swagCheckoutUrl(ticketSecret: string, itemId: number): Promise<string> {
  const { url } = await callSwagAdditions<{ url: string }>({ action: "buy", ticketSecret, itemId });
  return url;
}
