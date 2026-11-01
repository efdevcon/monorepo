import { NextRequest, NextResponse } from "next/server";
import { requireEthereumOrg } from "@/data/admin/adminApiAuth";
import { MATOMO_SITE_ID, MATOMO_URL } from "@/data/analytics/track";
import { bulkQueries, parseWindow, shapeReport, type AnalyticsReport } from "./report";

/**
 * EF-only live report from Matomo for /admin/analytics: one
 * `API.getBulkRequest` POST (the token travels in the body, never in a URL)
 * covering the daily series, today, the last 30 minutes, totals and the
 * breakdowns (report.ts). `?days=7|14|30` sets the window.
 *
 * `MATOMO_TOKEN` is server-only and must exist on the deployment; without it
 * the page says so instead of failing. Answers are memoised per window for
 * 60 s per server instance, so a team refreshing together costs Matomo one
 * request a minute at most.
 */
export const dynamic = "force-dynamic";

const MEMO_MS = 60_000;
const memo = new Map<number, { at: number; report: AnalyticsReport }>();

export async function GET(request: NextRequest) {
  const auth = await requireEthereumOrg(request);
  if (!auth.ok) return auth.response;

  const token = process.env.MATOMO_TOKEN;
  if (!token) {
    return NextResponse.json(
      { success: false, error: "MATOMO_TOKEN is not set on this deployment." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  const days = parseWindow(request.nextUrl.searchParams.get("days"));
  const hit = memo.get(days);
  if (hit && Date.now() - hit.at < MEMO_MS) {
    return NextResponse.json(
      { success: true, data: hit.report, cached: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const body = new URLSearchParams({
      module: "API",
      method: "API.getBulkRequest",
      format: "JSON",
      token_auth: token,
    });
    // An empty public site id means tracking is off for this deploy; the
    // report still reads the real site.
    bulkQueries(MATOMO_SITE_ID || "38", days).forEach((q, i) => {
      body.set(`urls[${i}]`, new URLSearchParams(q).toString());
    });
    const res = await fetch(`${MATOMO_URL}/index.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Matomo answered ${res.status}`);
    const results: unknown = await res.json();
    if (!Array.isArray(results)) {
      const message =
        results && typeof results === "object" && "message" in results
          ? String((results as { message: unknown }).message)
          : "unexpected answer";
      throw new Error(`Matomo: ${message}`);
    }
    const report = shapeReport(results, days);
    memo.set(days, { at: Date.now(), report });
    return NextResponse.json(
      { success: true, data: report },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[/api/admin/analytics] error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Matomo request failed" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
