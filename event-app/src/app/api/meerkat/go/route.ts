import { NextRequest, NextResponse } from "next/server";
import { cookieClient } from "../../auth/cookieClient";
import { createRateLimiter } from "../../tickets/rateLimit";
import { listLinks } from "../../tickets/links";
import { getStoreFromEnv, getTicketsForUser } from "../../tickets/pretix";
import { generateHandoverToken } from "../verification";
import { isSessionId, meerkatSessionUrl } from "../handover";

/**
 * The "Ask a question" link: `GET /api/meerkat/go?session=<id>` is a plain
 * navigation (new tab, or in place in the installed app) that ends on
 * Meerkat's Q&A page with a handover JWT attached. Doing the work behind a
 * redirect keeps the click synchronous (no popup-blocker dance around an
 * awaited fetch) and keeps the token out of client code and the DOM.
 *
 * Gated like the old POST: (1) a signed-in user, read from the Supabase auth
 * cookies the app mirrors through /api/auth/session, and (2) a paid Pretix
 * ticket for the event, matched by email or attached by QR proof. The email
 * in the JWT is the verified session email, never client-supplied. Failures
 * render a small page in that tab; nothing here is JSON.
 *
 * Per user only: attendees at the venue share a few NAT addresses, and an
 * anonymous request does no Pretix work anyway.
 */
const perUser = createRateLimiter(20, 10 * 60_000);

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session") ?? "";
  if (!isSessionId(sessionId)) {
    return page(400, "Unknown session", "This link doesn't point to a session.");
  }

  const { client, apply } = cookieClient(request);
  if (!client) return page(500, "Q&A unavailable", "Sign-in isn't configured on this deployment.");

  // Reads the cookie session, refreshing it when expired (the refreshed
  // cookies ride along on whatever response goes out below).
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.email) {
    return apply(
      page(
        401,
        "Sign in first",
        "You're not signed in here. Sign in on the Devcon app (Me tab), then tap Ask a question again."
      )
    );
  }
  if (!perUser.allow(user.id)) {
    return apply(page(429, "Too many attempts", "Please wait a few minutes before trying again."));
  }

  const store = getStoreFromEnv();
  if (!store) {
    console.error("[/api/meerkat/go] Pretix not configured, refusing to issue token");
    return apply(page(503, "Q&A unavailable", "Ticketing isn't configured on this deployment."));
  }

  let ownsTicket = false;
  try {
    const { orders } = await getTicketsForUser(
      { email: user.email, links: await listLinks(user.id, store.eventSlug) },
      store
    );
    ownsTicket = orders.some((order) => order.tickets.some((ticket) => ticket.admission !== false));
  } catch (err) {
    console.error("[/api/meerkat/go] ticket lookup failed:", err);
    return apply(page(502, "Couldn't verify your ticket", "The ticket service didn't answer. Please try again in a moment."));
  }
  if (!ownsTicket) {
    return apply(page(403, "Ticket required", "A valid Devcon ticket is required to ask questions."));
  }

  const response = NextResponse.redirect(meerkatSessionUrl(sessionId, generateHandoverToken(user.email)), 302);
  response.headers.set("Cache-Control", "no-store");
  return apply(response);
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** Minimal self-contained page for the tab the link opened in. */
function page(status: number, title: string, message: string): NextResponse {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} · Devcon</title>
<style>
  body { margin: 0; min-height: 100dvh; display: grid; place-items: center; background: #f9f8fa; color: #1a0d33; font: 16px/1.5 system-ui, -apple-system, sans-serif; }
  main { max-width: 28rem; padding: 2rem; text-align: center; }
  h1 { font-size: 1.25rem; margin: 0 0 .5rem; }
  p { margin: 0; color: #594d73; }
  .hint { margin-top: 1rem; font-size: .875rem; }
</style>
</head>
<body>
<main>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(message)}</p>
  <p class="hint">Close this page to get back to the app.</p>
</main>
</body>
</html>
`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
