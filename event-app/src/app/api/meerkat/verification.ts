import crypto from "crypto";

// TODO: Replace with a proper secret before production and move to env var only
export const HANDOVER_SECRET = "devcon-meerkat-handover-secret-2026";
/** Token lifetime: the app renews it while a session page is open (data/meerkat/handoffToken.ts). */
export const CODE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function getSecret(): string {
  return process.env.VERIFICATION_SECRET || HANDOVER_SECRET;
}

function base64urlEncode(data: string): string {
  return Buffer.from(data).toString("base64url");
}

export interface HandoverPayload {
  email: string;
  iat: number;
  exp: number;
}

/**
 * The hand-off JWT for `email`, valid CODE_EXPIRY_MS but never past
 * `notAfter` (the Q&A pass's expiry), with that expiry in ms.
 */
export function generateHandoverToken(
  email: string,
  notAfter: number = Infinity
): { token: string; expiresAt: number } {
  const secret = getSecret();
  const now = Date.now();
  const payload: HandoverPayload = {
    email,
    iat: now,
    exp: Math.min(now + CODE_EXPIRY_MS, notAfter),
  };

  const header = base64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64urlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");

  return { token: `${header}.${body}.${signature}`, expiresAt: payload.exp };
}
