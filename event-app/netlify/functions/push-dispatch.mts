import type { Config } from "@netlify/functions";

/**
 * Scheduled trigger for the push dispatcher: every minute, POST the
 * secret-gated /api/push/dispatch route on this same site. All real logic
 * (claiming, fan-out, crash recovery) lives in the route — this is only the
 * clock. `URL` is injected by Netlify with the site's primary origin.
 */
export default async () => {
  const secret = process.env.PUSH_DISPATCH_SECRET;
  if (!secret) {
    console.warn("[push-dispatch] PUSH_DISPATCH_SECRET not set; skipping");
    return;
  }
  const origin = process.env.URL;
  if (!origin) {
    console.warn("[push-dispatch] no site URL; skipping");
    return;
  }

  const res = await fetch(`${origin}/api/push/dispatch`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`[push-dispatch] dispatch failed (${res.status}): ${body}`);
    return;
  }
  // Quiet on no-op minutes; the route logs claims itself.
};

export const config: Config = {
  schedule: "* * * * *",
};
