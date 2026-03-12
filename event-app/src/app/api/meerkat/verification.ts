import crypto from "crypto";

// TODO: Replace with a proper secret before production and move to env var only
export const HANDOVER_SECRET = "devcon-meerkat-handover-secret-2026";
const CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function getSecret(): string {
  return process.env.VERIFICATION_SECRET || HANDOVER_SECRET;
}

function base64urlEncode(data: string): string {
  return Buffer.from(data).toString("base64url");
}

export interface HandoverPayload {
  email: string;
  sessionId: string;
  iat: number;
  exp: number;
}

export function generateHandoverToken(
  email: string,
  sessionId: string
): string {
  const secret = getSecret();
  const now = Date.now();
  const payload: HandoverPayload = {
    email,
    sessionId,
    iat: now,
    exp: now + CODE_EXPIRY_MS,
  };

  const header = base64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64urlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}
