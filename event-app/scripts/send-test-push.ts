// Send a test web-push notification from the command line, using the same
// declarative payload shape as the real dispatcher (src/app/api/push/).
// Reads VAPID keys + Supabase credentials from .env. Team-only by default.
//
//   pnpm push:test "Title here" "Body text"            # team subscribers only
//   pnpm push:test "Title" "Body" --url /schedule      # custom deep link
//   pnpm push:test "Title" "Body" --all                # EVERY subscriber (careful)
//   pnpm push:test --list                              # list subscriptions, send nothing
import "dotenv/config";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const APP_ORIGIN = process.env.APP_ORIGIN || "https://devcon-event-app.netlify.app";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const urlIndex = args.indexOf("--url");
  const url = urlIndex >= 0 ? args[urlIndex + 1] : "/announcements";
  const positional = args.filter(
    (a, i) => !a.startsWith("--") && args[i - 1] !== "--url"
  );
  const [title = "Test notification", body = "Sent from the command line."] =
    positional;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase env vars missing");
  const db = createClient(supabaseUrl, serviceKey);

  let query = db
    .from("devcon8_push_subscriptions")
    .select("endpoint, p256dh, auth, is_team");
  if (!flags.has("--all")) query = query.eq("is_team", true);
  const { data: subs, error } = await query;
  if (error) throw new Error(error.message);
  if (!subs || subs.length === 0) {
    console.log(flags.has("--all") ? "No subscriptions." : "No team subscriptions (use --all for everyone).");
    return;
  }

  if (flags.has("--list")) {
    for (const s of subs) {
      const service = s.endpoint.includes("push.apple.com")
        ? "apple"
        : s.endpoint.includes("fcm.googleapis.com")
          ? "fcm"
          : "other";
      console.log(`- [${service}] team:${s.is_team} ${s.endpoint.slice(0, 60)}...`);
    }
    console.log(`${subs.length} subscription(s). Nothing sent.`);
    return;
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("VAPID env vars missing");
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:devcon-website@ethereum.org",
    publicKey,
    privateKey
  );

  const payload = JSON.stringify({
    web_push: 8030,
    notification: {
      title,
      body: body || undefined,
      navigate: url.startsWith("/") ? `${APP_ORIGIN}${url}` : url,
    },
  });

  console.log(`Sending "${title}" to ${subs.length} subscription(s)...`);
  const gone: string[] = [];
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 3600, urgency: "high" }
      );
      console.log(`  ok   ${sub.endpoint.slice(0, 55)}...`);
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode ?? "network";
      if (code === 404 || code === 410) gone.push(sub.endpoint);
      console.log(`  FAIL(${code}) ${sub.endpoint.slice(0, 55)}...`);
    }
  }

  // Prune permanently dead endpoints, same as the real dispatcher — otherwise
  // they linger and every later test reports the same phantom failure.
  if (gone.length > 0) {
    const { error: pruneError } = await db
      .from("devcon8_push_subscriptions")
      .delete()
      .in("endpoint", gone);
    console.log(
      pruneError
        ? `  (failed to prune ${gone.length} dead endpoint(s): ${pruneError.message})`
        : `  pruned ${gone.length} dead endpoint(s)`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
