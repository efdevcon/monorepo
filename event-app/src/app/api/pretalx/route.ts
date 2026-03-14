import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://speak.ticketh.xyz";
const EVENT_SLUG = "testopesto-2026";
const API_KEY = process.env.PRETALX_API_KEY;

/**
 * Proxy GET requests to the pretalx API, injecting the auth token server-side.
 *
 * Usage: /api/pretalx?path=/submissions/&page_size=100
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const path = searchParams.get("path") || "/";

  // Build the upstream URL, forwarding all query params except "path"
  const upstream = new URL(`/api/events/${EVENT_SLUG}${path}`, BASE_URL);
  for (const [key, value] of searchParams.entries()) {
    if (key !== "path") {
      upstream.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {};
  if (API_KEY) {
    headers["Authorization"] = `Token ${API_KEY}`;
  }

  const res = await fetch(upstream.toString(), { headers });
  const data = await res.json();

  return NextResponse.json(data, { status: res.status });
}
