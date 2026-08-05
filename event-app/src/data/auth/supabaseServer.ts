import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Cookie-aware Supabase client for Server Components — read-only. Safe to
 * call from anywhere in the server-rendered tree; cookie writes (e.g. token
 * refresh) are silently dropped since Server Components can't set cookies
 * outside a Route Handler/Server Action. This is only used to check "is
 * someone signed in" for rendering the correct manifest link on first
 * paint — the client-side app keeps using its own existing session
 * (src/data/auth/supabase.ts) for everything else.
 */
export async function createServerComponentClient(): Promise<SupabaseClient | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // No-op: Server Components can't set cookies. A refreshed token
        // just won't persist here, which is fine for a read-only check.
      },
    },
  });
}
