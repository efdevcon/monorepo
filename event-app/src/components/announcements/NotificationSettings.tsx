"use client";

import { useId, type ReactNode } from "react";
import { BellOff, Share, Smartphone } from "lucide-react";
import cn from "classnames";
import type {
  PushPrefKind,
  usePushSubscription,
} from "@/data/push/usePushSubscription";
import { REMINDER_LEAD_MINUTES } from "@/data/reminders/reminders";
import { useOnline } from "@/hooks/useOnline";
import { isIOS } from "@/utils/platform";
import { NeedsConnection } from "@/components/NeedsConnection";
import { Switch } from "@/components/Switch";

/** One `usePushSubscription()` result: the app-wide instance from PushProvider. */
export type PushSettings = ReturnType<typeof usePushSubscription>;

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
 * The two preference rows and what goes under them (state note, error,
 * offline notice), for any container: the settings modal below and the
 * inline card at the top of the inbox (NotificationsCard). Owns nothing but
 * the online check; all state comes from `push`.
 */
export function NotificationPrefs({
  push,
  className,
}: {
  push: PushSettings;
  className?: string;
}) {
  const { state, busy, error, prefBusy, setPref } = push;
  // Changing either flag talks to the push service and/or our API.
  const online = useOnline();
  const noteId = useId();

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
    <div className={className}>
      <PrefRow
        title="Announcements"
        helper="Updates from the Devcon team. We keep them rare."
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
    </div>
  );
}
