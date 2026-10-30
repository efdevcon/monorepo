import { NextRequest, NextResponse } from "next/server";
import APP_CONFIG from "@/CONFIG";
import { cookieUser } from "@/data/auth/cookieUser";
import { authCookieName } from "@/data/auth/authCookie";
import { healScript } from "./heal";
import { signInHref } from "@/routing/returnTo";
import { detailHref } from "@/routing/viewParams";
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
 * cookie the app mirrors through /api/auth/session and only validated here,
 * never refreshed (src/data/auth/authCookie.ts: a server-side refresh could
 * sign the person out of the app), and (2) a paid Pretix ticket for the
 * event, matched by email or attached by QR proof. The email in the JWT is
 * the verified session email, never client-supplied. Failures render a small
 * page in that tab; nothing here is JSON.
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
  // Where "Back to the app" lands: the session's own page (a Pretalx code
  // gets redirected to the slug page by src/proxy.ts).
  const back = detailHref("session", sessionId);

  const { configured, hadCookie, user, reason } = await cookieUser(request.cookies.getAll());
  if (!configured) return page(500, "Q&A unavailable", "Sign-in isn't configured on this deployment.", { back });
  if (!user?.email) {
    // Two different failures hide behind one 401: no cookie at all (the
    // browser never mirrored its sign-in), or a cookie whose access token
    // has expired since the last mirror. The log line tells them apart. The
    // page first tries to heal itself (heal.ts): the app's own session lives
    // in this origin's localStorage, so when it is there the page mirrors
    // it, refreshing it first when it has expired too, and reloads once
    // (`retried`); only when that fails is the sign-in content shown.
    console.warn(
      `[/api/meerkat/go] not signed in: cookie=${hadCookie ? "present" : "absent"}` +
        (reason ? ` reason=${reason}` : "")
    );
    const retried = request.nextUrl.searchParams.get("retried") === "1";
    return page(
      401,
      "Sign in first",
      hadCookie
        ? "Your sign-in has expired. Sign in again, then tap Ask a question."
        : "You're not signed in here. Sign in on the Devcon app, then tap Ask a question again.",
      { back, signIn: signInHref(back), heal: !retried }
    );
  }
  if (!perUser.allow(user.id)) {
    return page(429, "Too many attempts", "Please wait a few minutes before trying again.", { back });
  }

  const store = getStoreFromEnv();
  if (!store) {
    console.error("[/api/meerkat/go] Pretix not configured, refusing to issue token");
    return page(503, "Q&A unavailable", "Ticketing isn't configured on this deployment.", { back });
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
    return page(502, "Couldn't verify your ticket", "The ticket service didn't answer. Please try again in a moment.", { back });
  }
  if (!ownsTicket) {
    return page(403, "Ticket required", "A valid Devcon ticket is required to ask questions.", { back });
  }

  const response = NextResponse.redirect(meerkatSessionUrl(sessionId, generateHandoverToken(user.email)), 302);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

interface PageLinks {
  /** The session page, for "Back to the app" (history.back() when this page was reached in place, as in the installed app). */
  back?: string;
  /** Sign-in page that returns to the session afterwards (401 only). */
  signIn?: string;
  /** Mirror the app's own session into the cookie, refreshing it first if it has expired, and reload once (401 only). */
  heal?: boolean;
}

/**
 * Minimal self-contained page for wherever the link opened: a new tab in a
 * browser, but in place in the installed app, where there is no tab to close
 * and a dead end would strand people. So every page offers "Back to the app",
 * the sign-in pages offer the sign-in itself, and a missing or expired cookie
 * heals without anyone noticing when the app is signed in (heal.ts): while
 * the script works, the page shows only "Opening Q&A"; the sign-in content
 * and a "try again" variant (for a failure that may pass: no network, a
 * rate limit) are rendered hidden, and the script reveals one if it gives
 * up (the sign-in one without script). No CSP on this app, so the inline
 * script is fine.
 */
function page(status: number, title: string, message: string, links: PageLinks = {}): NextResponse {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const heal = links.heal && supabaseUrl && anonKey
    ? healScript({ storageKey: authCookieName(supabaseUrl), supabaseUrl, anonKey })
    : "";
  const backLink = links.back
    ? `<a class="btn primary" href="${escapeHtml(links.back)}" onclick="if(history.length>1){history.back();return false}">Back to the app</a>`
    : "";
  const signInLink = links.signIn
    ? `<a class="btn" href="${escapeHtml(links.signIn)}">Sign in</a>`
    : "";
  const fullTitle = `${title} - ${APP_CONFIG.APP_NAME}`;
  const content = `<h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(message)}</p>
  <div class="actions">${signInLink}${backLink}</div>`;
  const body = heal
    ? `<main id="heal-wait">
  <h1>Opening Q&amp;A</h1>
  <p>Checking your sign-in.</p>
</main>
<main id="heal-fail" hidden data-title="${escapeHtml(fullTitle)}">
  ${content}
</main>
<main id="heal-retry" hidden data-title="${escapeHtml(`Try again in a moment - ${APP_CONFIG.APP_NAME}`)}">
  <h1>Try again in a moment</h1>
  <p>We couldn&#39;t check your sign-in just now. Go back to the app and tap Ask a question again in a minute.</p>
  <div class="actions">${backLink}</div>
</main>
<noscript><style>#heal-wait{display:none}#heal-fail{display:block}</style></noscript>`
    : `<main>
  ${content}
</main>`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(heal ? `Q&A - ${APP_CONFIG.APP_NAME}` : fullTitle)}</title>
<style>
  body { margin: 0; min-height: 100dvh; display: grid; place-items: center; background: #f9f8fa; color: #1a0d33; font: 16px/1.5 system-ui, -apple-system, sans-serif; }
  main { max-width: 28rem; padding: 2rem; text-align: center; }
  h1 { font-size: 1.25rem; margin: 0 0 .5rem; }
  p { margin: 0; color: #594d73; }
  .actions { display: flex; flex-direction: column; gap: .75rem; margin-top: 1.5rem; }
  .btn { display: block; padding: .8rem 1rem; border-radius: 999px; border: 1px solid #d9d3e6; color: #7235ed; font-weight: 700; text-decoration: none; background: #fff; }
  .btn.primary { background: #7235ed; border-color: #7235ed; color: #fff; }
</style>
${heal}
</head>
<body>
${body}
</body>
</html>
`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
