import { readPref, writePref } from "@/data/prefs";
import { isStandalone } from "@/utils/platform";
import { INSTALL_PARAM, parseInstallVersion } from "./installVersion";

/**
 * Device-side memory of the install version (see installVersion.ts): the
 * highest version this device has launched an icon with, kept in the prefs
 * table so a page load without the marker (a hard reload on an in-app URL,
 * an offline launch through the bridge fallback) still counts as a current
 * install. Only an installed app's launch URL is trusted: a tab can open a
 * shared link that happens to carry the marker.
 */
const INSTALL_VERSION_PREF = "install.version";

/** The install version in this page's URL, or null (a tab, a hard reload inside the app). */
export function launchInstallVersion(): number | null {
  if (typeof window === "undefined") return null;
  return parseInstallVersion(new URLSearchParams(window.location.search).get(INSTALL_PARAM));
}

/** Highest install version this device has launched with, remembering this launch's; null when it never has. */
export async function knownInstallVersion(): Promise<number | null> {
  const remembered = (await readPref<number>(INSTALL_VERSION_PREF)) ?? null;
  const launched = isStandalone() ? launchInstallVersion() : null;
  if (launched !== null && launched > (remembered ?? 0)) {
    await writePref(INSTALL_VERSION_PREF, launched);
    return launched;
  }
  return remembered;
}
