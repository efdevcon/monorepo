import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Lazily created Supabase client with the service-role key, for server routes
 * that write tables behind RLS with no policies. Null when the key is not
 * configured, so callers can answer 503 instead of crashing.
 */
let client: SupabaseClient | null | undefined;

export function serviceClient(): SupabaseClient | null {
  if (client === undefined) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    client = url && key ? createClient(url, key) : null;
  }
  return client;
}
