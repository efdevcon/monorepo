import { NextRequest, NextResponse } from "next/server";
import { DEVABOT_URL, requireEthereumOrg } from "@/data/admin/adminApiAuth";

export const dynamic = "force-dynamic";

/**
 * EF-only proxy for RAG-only retrieval: forwards to the backend's
 * `/api/search/expanded` (the chat flow's retrieval step, no LLM) and returns
 * the matched documents + the formatted context as JSON.
 */
export async function POST(request: NextRequest) {
  const auth = await requireEthereumOrg(request);
  if (!auth.ok) return auth.response;

  const body = await request.text();
  try {
    const upstream = await fetch(`${DEVABOT_URL}/api/search/expanded`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const data = await upstream.text();
    return new NextResponse(data, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      { error: `Inference service unreachable at ${DEVABOT_URL}` },
      { status: 502 }
    );
  }
}
