/**
 * Announcement/highlight URLs come verbatim from a Notion column (no
 * server-side normalization), so editors may paste anything: "/schedule",
 * "devcon.org/x", "//host/x", "https://…". Classify + normalize once here:
 * - internal = a single-slash path (in-app <Link>)
 * - everything else is external; scheme-less values (including
 *   protocol-relative "//host") get https:// so the anchor can't resolve
 *   relative to the current route (a bare "devcon.org/x" would 404 under
 *   /announcements/devcon.org/x).
 */
export function resolveAnnouncementLink(url: string): {
  href: string;
  external: boolean;
} {
  if (url.startsWith("/") && !url.startsWith("//")) {
    return { href: url, external: false };
  }
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(url);
  const href = hasScheme ? url : `https://${url.replace(/^\/+/, "")}`;
  return { href, external: true };
}
