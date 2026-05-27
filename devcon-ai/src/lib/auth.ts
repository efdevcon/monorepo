import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextFunction, Request, Response } from "express";

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

/**
 * Auth is enforced everywhere EXCEPT explicit local dev. Fail-secure: anything
 * other than NODE_ENV=development (production, undefined, test, ...) keeps the
 * gate on, so a misconfigured deploy can't accidentally expose the endpoints.
 */
export function isAuthDisabled(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Express middleware gating a route behind a valid Supabase session token
 * (Authorization: Bearer <access_token>). Skips entirely in local dev.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (isAuthDisabled()) {
    next();
    return;
  }

  const auth = await validateBearerToken(req.headers.authorization);
  if (!auth.ok) {
    if (auth.reason === "config") {
      res.status(500).json({ error: "Auth not configured on server" });
    } else {
      res.status(401).json({ error: "Authentication required" });
    }
    return;
  }

  (req as Request & { userEmail?: string }).userEmail = auth.email;
  next();
}
