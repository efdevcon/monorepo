import { createHmac, timingSafeEqual } from "crypto";
import type { Order } from "@/data/tickets/types";
import { hasAdmissionTicket } from "@/data/tickets/primary";

/**
 * The Q&A pass: the tickets check's answer ("this account holds an admission
 * ticket"), signed by this server and handed out with the tickets payload
 * (api/tickets/payload.ts). /api/meerkat/token trusts it instead of asking
 * Pretix again, so the "Ask a question" link costs no ticket lookup. It is
 * renewed, or dropped, by every tickets fetch: app open, sign-in, refresh,
 * attach and detach.
 *
 * Useless on its own: the token route also requires the same user's live
 * Supabase session. Keyed from VERIFICATION_SECRET (read directly, never
 * verification.ts's fallback) under its own label; Meerkat holds that
 * secret too, but a pass only yields a Meerkat token, which Meerkat could
 * mint itself anyway.
 */

/** How long a pass stands for the ticket check: a refunded or moved ticket keeps Q&A at most this long after the last fetch. */
export const QA_PASS_TTL_MS = 24 * 60 * 60 * 1000;

interface QaPassClaims {
  uid: string;
  /** Lower-cased. */
  email: string;
  /** Pretix event slug. */
  event: string;
  /** Milliseconds since epoch. */
  exp: number;
}

function passKey(): Buffer | null {
  const secret = process.env.VERIFICATION_SECRET;
  return secret ? createHmac("sha256", secret).update("devcon-qa-pass/v1").digest() : null;
}

const sign = (key: Buffer, body: string) => createHmac("sha256", key).update(body).digest("base64url");

/** A pass for `user` when `orders` hold an admission ticket; undefined otherwise or without VERIFICATION_SECRET. */
export function qaPassFor(
  user: { id: string; email: string },
  orders: Order[],
  event: string,
  nowMs: number = Date.now()
): string | undefined {
  const key = passKey();
  if (!key || !hasAdmissionTicket(orders)) return undefined;
  const claims: QaPassClaims = {
    uid: user.id,
    email: user.email.toLowerCase(),
    event,
    exp: nowMs + QA_PASS_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${body}.${sign(key, body)}`;
}

/** The pass's expiry when it is ours, unexpired, and issued to this user for this event; null otherwise. */
export function verifyQaPass(
  pass: string,
  expected: { uid: string; email: string; event: string },
  nowMs: number = Date.now()
): { exp: number } | null {
  const key = passKey();
  if (!key) return null;
  const [body, sig] = pass.split(".");
  if (!body || !sig) return null;
  const given = Buffer.from(sig);
  const wanted = Buffer.from(sign(key, body));
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<QaPassClaims>;
    if (
      claims.uid !== expected.uid ||
      claims.email !== expected.email.toLowerCase() ||
      claims.event !== expected.event ||
      typeof claims.exp !== "number" ||
      claims.exp <= nowMs
    ) {
      return null;
    }
    return { exp: claims.exp };
  } catch {
    return null;
  }
}
