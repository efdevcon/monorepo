/**
 * Announcement/highlight URLs come verbatim from a Notion column (no
 * server-side normalization), so editors may paste anything: "/schedule",
 * "devcon.org/x", "//host/x", "https://…". Classify + normalize once here:
 * - internal = a single-slash path (in-app <Link>)
 * - external = an http(s) or mailto URL; scheme-less values (including protocol-relative
 *   "//host") get https:// so the anchor can't resolve relative to the current
 *   route (a bare "devcon.org/x" would 404 under /announcements/devcon.org/x).
 * - anything else is refused, and callers render the card without a link.
 *
 * The refusal matters because the resolved value goes straight into an
 * `<a href>`: allowing any scheme would let a pasted "javascript:…" become
 * click-to-execute script in our own origin, on a page where the reader is
 * signed in. Editors are trusted, but this function exists precisely to
 * normalize input nobody has validated, so it allowlists rather than
 * blocklists — "starts with a scheme" is not the same question as "is a
 * scheme we're willing to put in an href".
 */
export function resolveAnnouncementLink(
  url: string
): { href: string; external: boolean } | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return { href: trimmed, external: false };
  }

  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed);
  if (scheme) {
    const name = scheme[1].toLowerCase();
    // Allowlist, not a blocklist. mailto is here because an editor could
    // reasonably paste one and it is inert in an href; javascript:, data:,
    // vbscript: and blob: are the reason the check exists.
    if (name !== "http" && name !== "https" && name !== "mailto") return null;
    return { href: trimmed, external: true };
  }

  // Scheme-less ("devcon.org/x", "//devcon.org/x") — assume https.
  return { href: `https://${trimmed.replace(/^\/+/, "")}`, external: true };
}
