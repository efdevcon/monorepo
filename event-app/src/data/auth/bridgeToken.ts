import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.INSTALL_BRIDGE_SECRET;
const TTL_MS = 24 * 60 * 60 * 1000; // 24h — generous enough to cover "installed today, opened tomorrow"

interface BridgePayload {
  email: string;
  exp: number;
}

/**
 * Self-verifying, signed token proving "this email was legitimately
 * verified as signed-in by our own server, within the last 24h" — without
 * needing a database. Carries no real credential: the actual Supabase
 * magic link is generated fresh at redemption time (see /api/auth/bridge),
 * not baked in here, so this token stays useful even if opened long after
 * minting (unlike a raw magic link, which has its own short expiry).
 */
export function signBridgeToken(email: string): string {
  if (!SECRET) throw new Error("INSTALL_BRIDGE_SECRET not configured");
  const payload: BridgePayload = { email, exp: Date.now() + TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyBridgeToken(token: string): { email: string } | null {
  if (!SECRET) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expectedSig = createHmac("sha256", SECRET).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload: BridgePayload = JSON.parse(
      Buffer.from(body, "base64url").toString()
    );
    if (typeof payload.email !== "string" || Date.now() > payload.exp) return null;
    return { email: payload.email };
  } catch {
    return null;
  }
}
