"use client";

import { useEffect, useId, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellOff, Settings, Share, Smartphone } from "lucide-react";
import cn from "classnames";
import type {
  PushPrefKind,
  usePushSubscription,
} from "@/data/push/usePushSubscription";
import { REMINDER_LEAD_MINUTES } from "@/data/reminders/reminders";
import { useOnline } from "@/hooks/useOnline";
import { isIOS } from "@/utils/platform";
import { CloseButton } from "@/components/Buttons";
import { NeedsConnection } from "@/components/NeedsConnection";
import { Switch } from "@/components/Switch";

/** One `usePushSubscription()` result, shared by the link and the modal so
 *  the link's icon and the switches always agree. The page owns the instance. */
export type PushSettings = ReturnType<typeof usePushSubscription>;

/**
 * Whether to offer a settings entry point at all: nothing while detecting or
 * signed out, since the subscriptions API needs a session — same rule the
 * old always-visible card had. Shared by the desktop link below and the
 * page's mobile header pill.
 */
export const canOpenNotificationSettings = (push: PushSettings) =>
  push.signedIn && push.state !== "loading";

/**
 * Label of that entry point (mobile header pill and desktop link alike):
 * "Enable notifications" until both switches are on (off, one of two,
 * denied, needs install), "Settings" once they are, so the entry reads as
 * the action it leads to rather than as a preferences drawer.
 */
export const notificationSettingsLabel = (push: PushSettings) =>
  push.state === "on" && !!push.prefs?.announcements && !!push.prefs?.reminders
    ? "Settings"
    : "Enable notifications";

/**
 * Desktop entry to the notification settings, beside the Notifications
 * page's h1: a purple text button (notificationSettingsLabel) that opens
 * the modal. The mobile equivalent is the page's header pill.
 */
export function NotificationSettingsLink({
  push,
  onOpen,
}: {
  push: PushSettings;
  onOpen: () => void;
}) {
  if (!canOpenNotificationSettings(push)) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label="Notification settings"
      className="flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded py-2 font-heading text-[16px] font-bold leading-none text-dc-purple underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple"
    >
      <Settings className="size-4" />
      {notificationSettingsLabel(push)}
    </button>
  );
}

const MODAL_BG = "linear-gradient(to top, #fbfafc 19.982%, #fff5fa 100%)";

/** What the hook reports while "on" before any flags are known (the
 *  server's column defaults); the hook already falls back to these, this
 *  only guards the type. */
const DEFAULT_PREFS: Record<PushPrefKind, boolean> = {
  announcements: true,
  reminders: false,
};

/**
 * Why a context that can't push shows both switches disabled. Shown once,
 * under the rows, for the non-toggleable states only; "off" / "on" need no
 * extra words because each row's helper already says what it does.
 */
function stateNote(state: PushSettings["state"]) {
  switch (state) {
    case "requires-install":
      return {
        Icon: Share,
        text: "To get announcements and session reminders on iOS, add the app to your Home Screen first (Share → Add to Home Screen).",
      };
    case "denied":
      return {
        Icon: BellOff,
        text: isIOS()
          ? "Notifications are blocked for this app, so announcements and session reminders can't reach you. Allow them in Settings → Notifications, under this app."
          : "Notifications are blocked for this site, so announcements and session reminders can't reach you. Allow them in your browser settings.",
      };
    case "unsupported":
      return {
        Icon: Smartphone,
        text: "This browser can't receive push notifications. Install the app on your phone to get them.",
      };
    default:
      return null;
  }
}

/**
 * One notification type: bold title, helper text under it, switch on the
 * right. While its own change is in flight the helper swaps to
 * "Enabling…" / "Turning off…" (the first switch turned on is also the
 * permission prompt, so that can sit a while). The switch is described by
 * the helper plus, in a context that can't push, the shared state note.
 */
function PrefRow({
  title,
  helper,
  checked,
  onChange,
  disabled,
  busy,
  noteId,
  className,
}: {
  title: string;
  helper: ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled: boolean;
  busy: boolean;
  noteId?: string;
  className?: string;
}) {
  const helperId = useId();
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <span className="block text-[16px] font-bold leading-6 text-dc-fg2">
          {title}
        </span>
        <div
          id={helperId}
          className={cn(
            "mt-1 text-[14px] leading-5",
            disabled ? "text-dc-muted" : "text-dc-fg2"
          )}
        >
          {busy ? (checked ? "Turning off…" : "Enabling…") : helper}
        </div>
      </div>
      <Switch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        busy={busy}
        aria-label={title}
        aria-describedby={noteId ? `${helperId} ${noteId}` : helperId}
      />
    </div>
  );
}

/**
 * Notification preferences modal: two peer iOS-style switches for this
 * device, Announcements and Session reminders. There's no master switch —
 * the first one turned on asks for permission and subscribes with only that
 * type, turning the last one off unsubscribes, anything in between just
 * updates the device's flags (all in `push.setPref`). The switches are live
 * only in the `off` / `on` states; a context that can't push (desktop
 * browser, iOS tab not yet installed, permission denied) shows both
 * disabled-off with one explanation under them. Session reminders land in
 * the inbox either way — the switch only controls the push. Never
 * auto-prompts: the permission dialog only appears on a switch tap. Same
 * shell as the ticket QR modal: centred, backdrop click and Escape close.
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
  const { state, busy, error, prefBusy, setPref } = push;
  // Changing either flag talks to the push service and/or our API.
  const online = useOnline();
  const titleId = useId();
  const noteId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const toggleable = state === "off" || state === "on";
  const prefs = state === "on" ? (push.prefs ?? DEFAULT_PREFS) : null;
  const note = stateNote(state);

  // One change at a time: a row whose neighbour is mid-change (or a plain
  // subscribe()/unsubscribe() from elsewhere) is disabled, not busy.
  const rowProps = (kind: PushPrefKind) => ({
    checked: !!prefs?.[kind],
    onChange: (next: boolean) => void setPref(kind, next),
    busy: prefBusy === kind,
    disabled:
      !toggleable ||
      !online ||
      (prefBusy !== null && prefBusy !== kind) ||
      (busy && prefBusy === null),
    noteId: note ? noteId : undefined,
  });

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

            <PrefRow
              title="Announcements"
              helper="Updates from the Devcon team. We keep them rare."
              className="mt-5"
              {...rowProps("announcements")}
            />
            <PrefRow
              title="Session reminders"
              helper={
                <>
                  A push {REMINDER_LEAD_MINUTES} minutes before a session
                  you&apos;re interested in starts.
                  <span className="mt-1 block text-[12px] leading-4 text-dc-muted">
                    Reminders always show in your inbox, with or without push.
                  </span>
                </>
              }
              className="mt-4 border-t border-dc-hairline pt-4"
              {...rowProps("reminders")}
            />

            {note && (
              <p
                id={noteId}
                className="mt-4 flex items-start gap-2 text-[14px] leading-5 text-dc-muted"
              >
                <note.Icon
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    state === "denied" ? "text-dc-muted" : "text-dc-purple"
                  )}
                />
                {note.text}
              </p>
            )}

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
