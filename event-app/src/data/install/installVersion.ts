/**
 * Install version: which generation of the manifest an installed icon was
 * made with.
 *
 * The manifest's start_url carries it (`/?install=N`; the sign-in bridge
 * start_url passes it through to its redirect), so every launch from an icon
 * says what the icon is, however old: iOS never changes an installed app's
 * start_url, Chrome only when it rebuilds the WebAPK after a manifest change.
 * The old Devcon 7 app's icon launches at `/` with no marker at all.
 *
 * Bump INSTALL_VERSION (and the static manifest) when every install must be
 * renewed: the manifest `id` is `/install/N` (both manifests), and browsers
 * key an installed app on its id, so a new number is a new app to install
 * beside the old icon, and the app can tell an old icon from a current one on
 * launch and show a re-install or migration screen instead of running on
 * stale state. The old Devcon 7 app's manifest had no id, so its identity is
 * its start_url `/`.
 *
 * Pure module (the service worker and route handlers import it); the
 * device-side memory of the version lives in deviceInstallVersion.ts.
 */
export const INSTALL_VERSION = 1;
export const INSTALL_PARAM = "install";

/** The version in an `install` query value, or null when absent or malformed. */
export function parseInstallVersion(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** `?install=N` to append to a path, or "" when there is no version to carry. */
export function installMarker(version: number | null): string {
  return version === null ? "" : `?${INSTALL_PARAM}=${version}`;
}
