/**
 * The browser session as the server sees it: the auth cookie that
 * /api/auth/session mirrors (the `@supabase/ssr` shape: `sb-<ref>-auth-token`,
 * split into `.0`, `.1`… chunks when long, the value a `base64-` prefixed
 * base64url JSON or plain JSON), decoded here without the auth library.
 *
 * Why not read it through a server client: that client refreshes an expired
 * session as a side effect of reading it, and a server-side refresh rotates
 * the browser's token family. Supabase forgives one step (the parent of the
 * active token may be reused), but a cookie two refreshes behind, one missed
 * mirror on venue Wi-Fi, gets the whole session revoked and signs the person
 * out of the app. So the server only ever VALIDATES the access token found
 * here (cookieUser.ts); an expired one means "signed out here" for that one
 * request, and the browser keeps its session. Pure, checked in `data:test`.
 */
export interface CookieSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

const BASE64_PREFIX = "base64-";

/** `sb-<project ref>-auth-token`, the ref being the first label of the project host. */
export function authCookieName(supabaseUrl: string): string {
  const ref = new URL(supabaseUrl).hostname.split(".")[0];
  return `sb-${ref}-auth-token`;
}

export function parseAuthCookie(
  cookies: readonly { name: string; value: string }[],
  supabaseUrl: string
): CookieSession | null {
  let key: string;
  try {
    key = authCookieName(supabaseUrl);
  } catch {
    return null;
  }
  let raw = cookies.find((c) => c.name === key)?.value;
  if (!raw) {
    const prefix = `${key}.`;
    const chunks = cookies
      .filter((c) => c.name.startsWith(prefix) && /^\d+$/.test(c.name.slice(prefix.length)))
      .sort((a, b) => Number(a.name.slice(prefix.length)) - Number(b.name.slice(prefix.length)));
    if (chunks.length === 0) return null;
    raw = chunks.map((c) => c.value).join("");
  }
  const decoded = raw.startsWith(BASE64_PREFIX)
    ? Buffer.from(raw.slice(BASE64_PREFIX.length), "base64url").toString("utf8")
    : raw;
  try {
    const parsed: unknown = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object") return null;
    const { access_token, refresh_token, expires_at } = parsed as Record<string, unknown>;
    if (typeof access_token !== "string" || !access_token) return null;
    return {
      access_token,
      refresh_token: typeof refresh_token === "string" ? refresh_token : undefined,
      expires_at: typeof expires_at === "number" ? expires_at : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * The `exp` claim of a JWT, in seconds, read without verifying it: enough to
 * refuse an already-expired token before handing it to the auth library,
 * whose setSession() would otherwise refresh it (and rotate the browser's
 * tokens). Null for anything that is not a three-part token with a numeric exp.
 */
export function jwtExpiresAt(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const payload: unknown = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    const exp = payload && typeof payload === "object" ? (payload as Record<string, unknown>).exp : null;
    return typeof exp === "number" && Number.isFinite(exp) ? exp : null;
  } catch {
    return null;
  }
}
