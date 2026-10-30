/**
 * Return to the page that asked for sign-in. My Devcon is the app's one
 * sign-in surface, so a page that needs an account (the session page's Q&A)
 * sends people there with `?next=<path>` and My Devcon brings them back once
 * they are signed in (components/Ticket.tsx). Only an in-app path is ever
 * followed: the value arrives in a URL anyone can craft, so a host, a scheme
 * or a protocol-relative form is refused and the user simply stays on My
 * Devcon. Pure module: no DOM, no React, checked in `data:test`.
 */
export const RETURN_PARAM = "next";
export const SIGN_IN_PATH = "/my-devcon";

/** `value` if it is a path inside this app that is not the sign-in page itself, else null. */
export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value) return null;
  // A single leading slash only: "//host" and "/\host" are hosts to a browser.
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if (/[\s\u0000-\u001f\u007f]/.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value, "https://app.invalid");
  } catch {
    return null;
  }
  if (url.origin !== "https://app.invalid") return null;
  // Never bounce back onto the sign-in page: a loop, and pointless.
  if (url.pathname === SIGN_IN_PATH || url.pathname.startsWith(`${SIGN_IN_PATH}/`)) return null;
  return value;
}

/** Href of the sign-in page that returns to `returnTo` afterwards (plain sign-in page if the target is not safe). */
export function signInHref(returnTo: string): string {
  const safe = safeReturnPath(returnTo);
  if (!safe) return SIGN_IN_PATH;
  return `${SIGN_IN_PATH}?${RETURN_PARAM}=${encodeURIComponent(safe)}`;
}
