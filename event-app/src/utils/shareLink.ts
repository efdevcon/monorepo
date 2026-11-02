import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import APP_CONFIG from "@/CONFIG";

/**
 * Absolute URL of an app path for sharing (the session and speaker Share
 * menus, the map card's Share). On the public origin the page is on, so a
 * preview deploy shares itself; the Capacitor shell serves the bundle from
 * `https://localhost`, where a copied link is dead off the device, so it
 * (and the server) use the configured app origin instead.
 */
export function shareUrl(path: string): string {
  const origin = typeof window !== "undefined" && !Capacitor.isNativePlatform() ? window.location.origin : APP_CONFIG.APP_ORIGIN;
  return new URL(path, origin).toString();
}

/**
 * Copies a link and says so in a toast. True once it is on the clipboard,
 * so the caller counts the share only then: the write is refused without
 * a fresh gesture or a secure context, and the error toast covers that.
 */
export async function copyShareLink(url: string, done: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    toast.success(done);
    return true;
  } catch {
    toast.error("Couldn't copy the link");
    return false;
  }
}
