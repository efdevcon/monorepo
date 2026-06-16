import { NextRequest, NextResponse } from "next/server";
import { DEVABOT_URL, requireEthereumOrg } from "@/data/admin/adminApiAuth";

export const dynamic = "force-dynamic";

/**
 * EF-only proxy to the DevaBot RAG service for the admin inference debugger.
 * Enforces an `@ethereum.org` session server-side, then forwards the request
 * verbatim (including any `sourceType` / `sourceRepo` dataset filters) and
 * streams the SSE response back.
 */
export async function POST(request: NextRequest) {
  const auth = await requireEthereumOrg(request);
  if (!auth.ok) return auth.response;

  const body = await request.text();
  let upstream: Response;
  try {
    upstream = await fetch(`${DEVABOT_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  } catch {
    return NextResponse.json(
      { error: `Inference service unreachable at ${DEVABOT_URL}` },
      { status: 502 }
    );
  }

  // Stream the upstream (SSE) response straight back to the client.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") || "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
