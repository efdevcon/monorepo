import crypto from "crypto";

const DEFAULT_SECRET = "dev-secret-do-not-use-in-production";
const CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function getSecret(): string {
  return process.env.VERIFICATION_SECRET || DEFAULT_SECRET;
}

function base64urlEncode(data: string): string {
  return Buffer.from(data).toString("base64url");
}

function base64urlDecode(data: string): string {
  return Buffer.from(data, "base64url").toString("utf-8");
}

export function generateCode(userId: string, sessionId: string): string {
  const secret = getSecret();
  const payload = JSON.stringify({ userId, sessionId, ts: Date.now() });
  const encodedPayload = base64urlEncode(payload);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export function verifyCode(code: string): {
  valid: boolean;
  userId?: string;
  sessionId?: string;
  error?: string;
} {
  const secret = getSecret();
  const parts = code.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Invalid code format" };
  }

  const [encodedPayload, signature] = parts;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  ) {
    return { valid: false, error: "Invalid signature" };
  }

  let payload: { userId: string; sessionId: string; ts: number };
  try {
    payload = JSON.parse(base64urlDecode(encodedPayload));
  } catch {
    return { valid: false, error: "Invalid payload" };
  }

  if (Date.now() - payload.ts > CODE_EXPIRY_MS) {
    return { valid: false, error: "Code expired" };
  }

  return { valid: true, userId: payload.userId, sessionId: payload.sessionId };
}
