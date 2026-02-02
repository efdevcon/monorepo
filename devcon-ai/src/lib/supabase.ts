import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types.js";

export function createServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_KEY)");
  }

  return createClient<Database>(supabaseUrl, supabaseKey);
}
