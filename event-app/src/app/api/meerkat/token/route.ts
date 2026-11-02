import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "../../tickets/auth";
import { createRateLimiter } from "../../tickets/rateLimit";
import { getStoreFromEnv } from "../../tickets/pretix";
import { verifyQaPass } from "../qaPass";
import { generateHandoverToken } from "../verification";

/**
 * The Meerkat hand-off token behind the "Ask a question" link
 * (data/meerkat/handoffToken.ts renders it into the link and renews it).
 *
 * POST with the Supabase access token as `Authorization: Bearer …` and the
 * Q&A pass from the tickets payload as `{ pass }`. The pass is the ticket
 * check (qaPass.ts), so this route never calls Pretix: it verifies the
 * session, checks the pass was issued to that same user for this event, and
 * mints a token for the verified email, valid an hour but never past the
 * pass. 403 tells the app to fetch its tickets again for a new pass.
 */
const perUser = createRateLimiter(30, 10 * 60_000);

/**
 * A pass this close to expiry gets a 403, so the app fetches a fresh one. More
 * than the client's renewal window (RENEW_BEFORE_MS, 10 min): a token capped
 * at the pass must never be due for renewal the moment it arrives.
 */
const MIN_PASS_LEFT_MS = 15 * 60_000;

const noStore = { "Cache-Control": "no-store" };
const fail = (status: number, error: string) =>
  NextResponse.json({ success: false, error }, { status, headers: noStore });

export async function POST(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return fail(500, "Auth not configured");
  }
  const store = getStoreFromEnv();
  if (!store || !process.env.VERIFICATION_SECRET) return fail(500, "Q&A not configured");

  const user = await requireUser(request);
  if (!user) return fail(401, "Invalid or expired session");
  if (!perUser.allow(user.id)) return fail(429, "Too many requests");

  let pass: unknown;
  try {
    ({ pass } = await request.json());
  } catch {
    // Handled as a missing pass below.
  }
  const verified =
    typeof pass === "string"
      ? verifyQaPass(pass, { uid: user.id, email: user.email, event: store.eventSlug })
      : null;
  if (!verified || verified.exp - Date.now() < MIN_PASS_LEFT_MS) {
    return fail(403, "No valid Q&A pass");
  }

  const { token, expiresAt } = generateHandoverToken(user.email, verified.exp);
  return NextResponse.json(
    { success: true, data: { token, ttlMs: expiresAt - Date.now() } },
    { headers: noStore }
  );
}
