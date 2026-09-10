import { headers } from "next/headers";
import { createServerComponentClient } from "@/data/auth/supabaseServer";
import { signBridgeToken } from "@/data/auth/bridgeToken";

/**
 * Only where the installed app cannot see the browser's session: Safari on
 * iPhone/iPad (a home-screen web app has its own storage) and Safari on
 * macOS ("Add to Dock" web apps are isolated the same way). Chrome, Edge,
 * Firefox and Android installs share storage with the browser, so they are
 * already signed in on first launch; giving them the bridge start_url would
 * only make every launch a server round trip and an offline launch a miss.
 * iPad Safari in desktop mode reports itself as a Mac and is covered by the
 * second branch.
 */
export function wantsInstallBridge(userAgent: string): boolean {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true;
  return (
    /Macintosh/.test(userAgent) &&
    /Safari/.test(userAgent) &&
    !/Chrome|Chromium|CriOS|Edg|Firefox|FxiOS|OPR/.test(userAgent)
  );
}

/**
 * The app's single <link rel="manifest"> tag — personalized (carrying a
 * bridge token) when signed in on a platform whose installed app can't see
 * the browser session, the plain static manifest otherwise. This MUST be the
 * only place that renders this tag: Safari only reads the manifest as it
 * exists in the initial server-rendered HTML when "Add to Home Screen" is
 * used, ignoring any later client-side change — so it has to already be
 * correct on first paint, which is why this is a Server Component (reading
 * the session cookie) rather than a client-side swap. The cookie itself is
 * kept in step with the browser session by src/data/auth/sessionCookie.ts.
 */
export async function PersonalizedManifestLink() {
  const userAgent = (await headers()).get("user-agent") ?? "";
  if (wantsInstallBridge(userAgent) && process.env.INSTALL_BRIDGE_SECRET) {
    const supabase = await createServerComponentClient();
    const email = (await supabase?.auth.getUser())?.data.user?.email;
    // Token built inside try/catch, JSX outside it: React renders JSX
    // lazily, so a throw from inside a JSX expression would escape the
    // catch anyway (react-hooks/error-boundaries).
    let bridgeToken: string | null = null;
    if (email) {
      try {
        bridgeToken = signBridgeToken(email);
      } catch {
        // Fall through to the default manifest below.
      }
    }
    if (bridgeToken) {
      return (
        <link
          rel="manifest"
          href={`/api/manifest-bridge?bridge=${encodeURIComponent(bridgeToken)}`}
        />
      );
    }
  }

  return <link rel="manifest" href="/manifest.webmanifest" />;
}
