import { NextRequest } from "next/server";
import APP_CONFIG from "@/CONFIG";

/**
 * Derives the current request's public origin from its Host header, which
 * Netlify (and proxies generally) preserve reliably — unlike
 * `new URL(request.url).origin`, whose construction isn't guaranteed to
 * reflect the public-facing domain behind serverless function proxying (we
 * hit exactly that: it resolved to an internal address instead of the real
 * domain, silently breaking magic-link redirects).
 *
 * Auto-adapts to whichever domain is actually being used — Netlify's
 * default subdomain, a custom domain, ... — with no hardcoded value or env
 * var needed. APP_CONFIG.APP_ORIGIN is kept only as a last-resort fallback
 * for the pathological case of a request with no Host header at all, which
 * shouldn't happen for real traffic.
 */
export function getRequestOrigin(request: NextRequest): string {
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!host) return APP_CONFIG.APP_ORIGIN;
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}
