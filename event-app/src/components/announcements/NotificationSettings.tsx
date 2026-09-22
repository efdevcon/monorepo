"use client";

import { useEffect, useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellOff, BellRing, Share, Smartphone } from "lucide-react";
import cn from "classnames";
import type { usePushSubscription } from "@/data/push/usePushSubscription";
import { REMINDER_LEAD_MINUTES } from "@/data/reminders/reminders";
import { useOnline } from "@/hooks/useOnline";
import { CloseButton } from "@/components/Buttons";
import { NeedsConnection } from "@/components/NeedsConnection";
import { Switch } from "@/components/Switch";

/** One `usePushSubscription()` result, shared by the link and the modal so
 *  the link's icon and the switch always agree. The page owns the instance. */
export type PushSettings = ReturnType<typeof usePushSubscription>;

/**
 * "Notifications" entry point in the inbox's tabs row: opens the settings
 * modal. Nothing to offer while detecting or signed out (the subscriptions
 * API needs a session), so it renders nothing then — same rule the old
 * always-visible card had.
 */
export function NotificationSettingsLink({
  push,
  onOpen,
}: {
  push: PushSettings;
  onOpen: () => void;
}) {
  if (!push.signedIn || push.state === "loading") return null;
  const Icon = push.state === "on" ? BellRing : Bell;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className="flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded py-2 font-heading text-[14px] font-bold leading-none text-dc-purple underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple"
    >
      <Icon className="size-4" />
      Notifications
    </button>
  );
}

const MODAL_BG = "linear-gradient(to top, #fbfafc 19.982%, #fff5fa 100%)";

/**
 * Notification preferences modal: one iOS-style switch for push on this
 * device, with the state's explanation under it. The switch is live only in
 * the `off` / `on` states; a context that can't push (desktop browser, iOS
 * tab not yet installed, permission denied) shows why with the switch
 * disabled. Never auto-prompts — the permission dialog only appears on the
 * switch tap. Same shell as the ticket QR modal: centred, backdrop click
 * and Escape close.
 */
export function NotificationSettingsModal({
  push,
  open,
  onClose,
}: {
  push: PushSettings;
  open: boolean;
  onClose: () => void;
}) {
  const { state, busy, error, subscribe, unsubscribe } = push;
  // Subscribing/unsubscribing talks to the push service and our API.
  const online = useOnline();
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const toggleable = state === "off" || state === "on";
  const on = state === "on";

  const description = (() => {
    switch (state) {
      case "on":
        return {
          Icon: BellRing,
          text: `Notifications are on for this device, including reminders for sessions you're interested in.`,
        };
      case "off":
        return {
          Icon: Bell,
          text: `Get notified when the team posts an announcement, and ${REMINDER_LEAD_MINUTES} minutes before a session you're interested in starts.`,
        };
      case "requires-install":
        return {
          Icon: Share,
          text: "To get notified about announcements and sessions you're interested in on iOS, add the app to your Home Screen first (Share → Add to Home Screen).",
        };
      case "denied":
        return {
          Icon: BellOff,
          text: "Notifications are blocked for this site — allow them in your browser settings to get announcement alerts.",
        };
      default:
        return {
          Icon: Smartphone,
          text: "This browser can't receive push notifications. Install the app on your phone to get them.",
        };
    }
  })();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          onClick={onClose}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-[361px] rounded-[12px] p-6 font-heading shadow-[0_10px_15px_rgba(22,11,43,0.1),0_4px_6px_rgba(22,11,43,0.1)]"
            style={{ background: MODAL_BG }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                id={titleId}
                className="text-[20px] font-bold leading-7 tracking-[-0.5px] text-dc-fg2"
              >
                Notifications
              </h2>
              <CloseButton onClick={onClose} />
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <span className="text-[16px] font-bold leading-6 text-dc-fg2">
                Push notifications
              </span>
              <Switch
                checked={on}
                onChange={(next) => (next ? subscribe() : unsubscribe())}
                disabled={!toggleable || !online}
                busy={busy}
                aria-label="Push notifications"
                aria-describedby={descId}
              />
            </div>

            <p
              id={descId}
              className={cn(
                "mt-3 flex items-start gap-2 text-[14px] leading-5",
                toggleable ? "text-dc-fg2" : "text-dc-muted"
              )}
            >
              <description.Icon
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  state === "denied" ? "text-dc-muted" : "text-dc-purple"
                )}
              />
              {busy
                ? on
                  ? "Turning off…"
                  : "Enabling…"
                : description.text}
            </p>

            {error && (
              <p className="mt-3 text-[12px] leading-4 text-dc-error">{error}</p>
            )}
            {!online && (
              <NeedsConnection
                what="Changing notification settings"
                className="mt-3"
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
