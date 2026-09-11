import { createHash } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { LinkProof, TicketLink } from "./pretix";

/**
 * Attached tickets: positions an account proved it holds by uploading the
 * ticket QR (see attach/route.ts). Server-only, service-role key; the table
 * has RLS and no policies, so the anon key never reaches it. Migration:
 * devcon-api/src/supabase/migrations/20260909120000_devcon8_ticket_links.sql.
 */
const TABLE = "devcon8_ticket_links";

let client: SupabaseClient | null | undefined;
function serviceClient(): SupabaseClient | null {
  if (client === undefined) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    client = url && key ? createClient(url, key) : null;
  }
  return client;
}

/** False when the service-role key is missing: reads return nothing, attach answers 503. */
export function linksConfigured(): boolean {
  return serviceClient() !== null;
}

/** Pretix secrets are long random strings, so a plain SHA-256 cannot be reversed or guessed. */
export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export async function listLinks(userId: string, event: string): Promise<TicketLink[]> {
  const db = serviceClient();
  if (!db) return [];
  const { data, error } = await db
    .from(TABLE)
    .select("position_id, proof")
    .eq("user_id", userId)
    .eq("event", event)
    .order("attached_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    positionId: Number(row.position_id),
    proof: row.proof === "email" ? "email" : "qr",
  }));
}

export async function addLink(
  userId: string,
  event: string,
  positionId: number,
  secret: string,
  proof: LinkProof
): Promise<void> {
  const db = serviceClient();
  if (!db) throw new Error("Ticket links not configured");
  const { error } = await db.from(TABLE).upsert(
    { user_id: userId, event, position_id: positionId, secret_hash: hashSecret(secret), proof },
    { onConflict: "user_id,event,position_id" }
  );
  if (error) throw new Error(error.message);
}

export async function removeLinks(
  userId: string,
  event: string,
  positionIds: number[]
): Promise<void> {
  if (positionIds.length === 0) return;
  const db = serviceClient();
  if (!db) return;
  const { error } = await db
    .from(TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("event", event)
    .in("position_id", positionIds);
  if (error) throw new Error(error.message);
}

export const removeLink = (userId: string, event: string, positionId: number) =>
  removeLinks(userId, event, [positionId]);

/**
 * How many other accounts attached each of these positions. Two accounts on
 * one ticket is allowed (nothing here can arbitrate it, the door does), but
 * the card says so. Returns only positions with at least one other holder.
 */
export async function countOtherHolders(
  userId: string,
  event: string,
  positionIds: number[]
): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  if (positionIds.length === 0) return counts;
  const db = serviceClient();
  if (!db) return counts;
  const { data, error } = await db
    .from(TABLE)
    .select("position_id")
    .eq("event", event)
    .in("position_id", positionIds)
    .neq("user_id", userId);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const id = Number(row.position_id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}
