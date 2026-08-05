import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRequestOrigin } from "../../_lib/origin";
import { verifyBridgeToken } from "../../_lib/bridgeToken";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * The start_url of the personalized manifest minted by /api/manifest-bridge
 * — i.e. what actually runs when the installed home-screen icon is first
 * opened. Verifies the bridge token, then generates a REAL Supabase magic
 * link right now (not earlier, at "Add to Home Screen" time) and redirects
 * to it — so however long the gap between installing and first opening the
 * icon, the Supabase-side link is always freshly minted, not stale.
 */
export async function GET(request: NextRequest) {
  const origin = getRequestOrigin(request);
  const bridgeToken = request.nextUrl.searchParams.get("bridge") || "";
  const verified = verifyBridgeToken(bridgeToken);

  if (!verified || !supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.redirect(origin);
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: verified.email,
    options: { redirectTo: `${origin}/ticket` },
  });
  if (error || !data?.properties?.action_link) {
    return NextResponse.redirect(origin);
  }

  return NextResponse.redirect(data.properties.action_link);
}
