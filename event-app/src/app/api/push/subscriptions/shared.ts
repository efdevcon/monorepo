import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Helpers shared by the subscription routes (route.ts, prefs/route.ts). A
 * route file may only export its HTTP handlers, so they live here.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** The signed-in Supabase user behind the Bearer token, or null. */
export async function requireUser(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const token = (request.headers.get("authorization") || "").replace(
    /^Bearer\s+/i,
    ""
  );
  if (!token) return null;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  return error || !user ? null : user;
}

/**
 * Per-device notification preferences, one boolean column each on
 * devcon8_push_subscriptions (migration 20260923120000): announcements
 * default on, session reminders default off (opt-in).
 */
export interface PushPrefs {
  announcements: boolean;
  reminders: boolean;
}

/**
 * The fields of an optional `prefs` body member that are booleans; anything
 * else is ignored, so a missing field is left as it is. Null when `prefs` is
 * present but not an object (a malformed request, 400).
 */
export function parsePrefs(raw: unknown): Partial<PushPrefs> | null {
  if (raw === undefined) return {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const out: Partial<PushPrefs> = {};
  if (typeof r.announcements === "boolean") out.announcements = r.announcements;
  if (typeof r.reminders === "boolean") out.reminders = r.reminders;
  return out;
}
