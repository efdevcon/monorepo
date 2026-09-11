import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export interface AuthedUser {
  id: string;
  email: string;
}

/**
 * The signed-in Supabase user behind a Bearer token, or null. The email is
 * derived server-side from the verified session, never trusted from the
 * client.
 */
export async function requireUser(request: NextRequest): Promise<AuthedUser | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const {
    data: { user },
    error,
  } = await createClient(url, anonKey).auth.getUser(token);
  return error || !user?.email ? null : { id: user.id, email: user.email };
}

/** Best-effort client address for rate limiting (Netlify sets the first header). */
export function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-nf-client-connection-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
