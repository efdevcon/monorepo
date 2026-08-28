import { createServerComponentClient } from "@/data/auth/supabaseServer";
import { signBridgeToken } from "@/data/auth/bridgeToken";

/**
 * The app's single <link rel="manifest"> tag — personalized (carrying a
 * bridge token) when signed in, the plain static manifest otherwise. This
 * MUST be the only place that renders this tag: Safari only reads the
 * manifest as it exists in the initial server-rendered HTML when "Add to
 * Home Screen" is used, ignoring any later client-side change — so it has
 * to already be correct on first paint, which is why this is a Server
 * Component (reading the session cookie) rather than a client-side swap.
 */
export async function PersonalizedManifestLink() {
  const supabase = await createServerComponentClient();
  const email = (await supabase?.auth.getUser())?.data.user?.email;

  if (email && process.env.INSTALL_BRIDGE_SECRET) {
    // Token built inside try/catch, JSX outside it: React renders JSX
    // lazily, so a throw from inside a JSX expression would escape the
    // catch anyway (react-hooks/error-boundaries).
    let bridgeToken: string | null = null;
    try {
      bridgeToken = signBridgeToken(email);
    } catch {
      // Fall through to the default manifest below.
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
