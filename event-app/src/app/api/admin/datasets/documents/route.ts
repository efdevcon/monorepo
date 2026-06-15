import { NextRequest, NextResponse } from "next/server";
import { DEVABOT_URL, requireEthereumOrg } from "@/data/admin/adminApiAuth";

/** EF-only proxy: browse corpus documents (paginated/filterable). */
export async function GET(request: NextRequest) {
  const auth = await requireEthereumOrg(request);
  if (!auth.ok) return auth.response;

  // Forward the dataset/pagination query params verbatim.
  const qs = request.nextUrl.search;
  try {
    const upstream = await fetch(`${DEVABOT_URL}/api/datasets/documents${qs}`, {
      headers: { "Content-Type": "application/json" },
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
