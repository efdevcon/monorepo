import { NextRequest, NextResponse } from "next/server";
import { DEVABOT_URL, requireEthereumOrg } from "@/data/admin/adminApiAuth";

/** EF-only proxy: corpus overview (total + per-dataset counts). */
export async function GET(request: NextRequest) {
  const auth = await requireEthereumOrg(request);
  if (!auth.ok) return auth.response;

  try {
    const upstream = await fetch(`${DEVABOT_URL}/api/datasets`, {
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
