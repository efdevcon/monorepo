import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedAnonClient: SupabaseClient | null = null;
let loggedMissingConfig = false;

function getAnonClient(): SupabaseClient | null {
  if (cachedAnonClient) return cachedAnonClient;
  const url = process.env.SUPABASE_URL;
  // For getUser(token), either anon or service-role works — both are accepted
  // by the Supabase Auth REST API as the `apikey` header. Prefer anon if both
  // are set (least privilege); fall back to service key.
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    if (!loggedMissingConfig) {
      console.error(
        "[devcon-avatar/auth] SUPABASE_URL and a key (SUPABASE_ANON_KEY or SUPABASE_SERVICE_KEY) are not set. " +
          "Token validation will always fail.",
      );
      loggedMissingConfig = true;
    }
    return null;
  }
  cachedAnonClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedAnonClient;
}

export type AuthResult =
  | { ok: true; email: string }
  | { ok: false; reason: "config" | "invalid" };

/**
 * Validate a Supabase access token from an Authorization: Bearer header.
 * Returns `{ok: true, email}` on success, or a structured failure reason.
 */
export async function validateBearerToken(
  authHeader: string | undefined,
): Promise<AuthResult> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, reason: "invalid" };
  }
  const token = authHeader.substring(7).trim();
  if (!token) return { ok: false, reason: "invalid" };

  const supabase = getAnonClient();
  if (!supabase) return { ok: false, reason: "config" };

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error) {
    console.warn("[devcon-avatar/auth] getUser error:", error.message);
    return { ok: false, reason: "invalid" };
  }
  if (!user?.email) return { ok: false, reason: "invalid" };
  return { ok: true, email: user.email };
}
