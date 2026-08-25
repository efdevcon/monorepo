"use client";

import { Bell, BellOff, BellRing, Share } from "lucide-react";
import cn from "classnames";
import { usePushSubscription } from "@/data/push/usePushSubscription";

/**
 * Tap-to-enable push toggle, shown at the top of the announcements inbox —
 * enable notifications where announcements live. Never auto-prompts; the
 * permission dialog only appears on the button tap.
 */
export function PushOptIn() {
  const { signedIn, state, busy, error, subscribe, unsubscribe } =
    usePushSubscription();

  // Nothing useful to offer: still detecting, or a context that can never
  // push (desktop browsers without push, dev mode, signed-out users).
  if (state === "loading" || state === "unsupported" || !signedIn) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dc-hairline bg-dc-lavender px-4 py-3">
      {state === "requires-install" && (
        <p className="flex items-center gap-2 text-sm text-dc-muted">
          <Share className="h-4 w-4 shrink-0 text-dc-purple" />
          To get notified about announcements on iOS, add the app to your Home
          Screen first (Share → Add to Home Screen).
        </p>
      )}

      {state === "denied" && (
        <p className="flex items-center gap-2 text-sm text-dc-muted">
          <BellOff className="h-4 w-4 shrink-0 text-dc-muted" />
          Notifications are blocked for this site — allow them in your browser
          settings to get announcement alerts.
        </p>
      )}

      {state === "off" && (
        <>
          <p className="flex items-center gap-2 text-sm text-dc-fg2">
            <Bell className="h-4 w-4 shrink-0 text-dc-purple" />
            Get notified when the team posts an announcement.
          </p>
          <button
            onClick={subscribe}
            disabled={busy}
            className={cn(
              "rounded-full bg-dc-purple px-4 py-1.5 font-heading text-sm font-bold text-dc-purple-fg transition-colors",
              busy ? "opacity-60" : "hover:bg-dc-purple-600"
            )}
          >
            {busy ? "Enabling…" : "Enable notifications"}
          </button>
        </>
      )}

      {state === "on" && (
        <>
          <p className="flex items-center gap-2 text-sm text-dc-fg2">
            <BellRing className="h-4 w-4 shrink-0 text-dc-purple" />
            Notifications are on for this device.
          </p>
          <button
            onClick={unsubscribe}
            disabled={busy}
            className="text-sm font-medium text-dc-muted underline-offset-2 hover:underline"
          >
            {busy ? "Turning off…" : "Turn off"}
          </button>
        </>
      )}

      {error && <p className="w-full text-xs text-dc-error">{error}</p>}
    </div>
  );
}
