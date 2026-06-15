import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Admin tooling is restricted to Ethereum Foundation accounts. */
const ALLOWED_DOMAIN = "@ethereum.org";

// Server-only preferred; falls back to the public var if that's all that's set.
export const DEVABOT_URL =
  process.env.DEVABOT_API_URL ||
  process.env.NEXT_PUBLIC_DEVABOT_API_URL ||
  "http://localhost:3030";

export type AdminAuth =
  | { ok: true; token: string; email: string }
  | { ok: false; response: NextResponse };

/**
 * Shared gate for `/api/admin/*` routes: verifies the Supabase access token and
 * that the signed-in user has an `@ethereum.org` email. Returns the validated
 * token on success, or a ready-to-return error response (401/403/500).
 */
export async function requireEthereumOrg(
  request: NextRequest
): Promise<AdminAuth> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Auth not configured" }, { status: 500 }),
    };
  }

  const token = (request.headers.get("authorization") || "").replace(
    /^Bearer\s+/i,
    ""
  );
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!user.email?.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, token, email: user.email };
}
