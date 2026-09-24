"use client";

import { useState } from "react";
import { Bell, BellRing } from "lucide-react";
import cn from "classnames";
import { Link } from "@/routing";
import { NotificationPrefs, type PushSettings } from "./NotificationSettings";

/**
 * A control strip, not a list item: the schedule's lavender day-bar surface,
 * full-bleed under the app header on mobile, a bordered card of its own above
 * the inbox panel on desktop. Inbox cards are white (announcements) or
 * lavender-with-hairline (reminders) inside the panel, so this reads as
 * settings, not content.
 */
const card = "bg-dc-lavender border-b border-dc-hairline lg:rounded-xl lg:border";
const textButton =
  "shrink-0 cursor-pointer rounded font-heading text-[14px] font-bold leading-5 text-dc-purple underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple";

/**
 * The notification switches, inline at the top of the inbox: enabling
 * notifications is the page's main action, so it is not behind a Settings
 * click (the one-time PushOnboardingSheet covers the first launch only,
 * and anyone who tapped "Not now" or opened a browser tab lands here).
 * Same rows as the settings modal (NotificationPrefs), so the two never
 * disagree, and the same rule: the first switch turned on is the
 * permission prompt, never an auto-prompt.
 *
 * Shapes: signed out → "Get notified", one line and a sign-in link (the
 * subscriptions API needs an account). Anything off, or a context that
 * cannot push (browser tab on iOS, denied) → the rows, with the modal's
 * explanation under them. Both on → one line, "Notifications on", with Edit
 * expanding the rows in place, so enabled users keep their timeline near the
 * top. Nothing while the push state is still detecting.
 */
export function NotificationsCard({
  push,
  className,
}: {
  push: PushSettings;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (push.state === "loading") return null;

  if (!push.signedIn) {
    return (
      <div className={cn(card, "flex items-start gap-3 px-4 py-4 lg:px-5", className)}>
        <Bell className="mt-0.5 size-5 shrink-0 text-dc-purple" />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-[16px] font-bold leading-6 text-dc-fg2">
            Get notified
          </p>
          <p className="mt-1 font-heading text-[14px] leading-5 text-dc-fg2">
            Sign in to get announcements and session reminders as notifications
            on this device.
          </p>
          <Link href="/ticket" className={cn(textButton, "mt-2 inline-flex")}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const prefs = push.state === "on" ? push.prefs : null;
  const allOn = !!prefs?.announcements && !!prefs?.reminders;

  if (allOn && !expanded) {
    return (
      <div
        className={cn(card, "flex items-center justify-between gap-3 px-4 py-3 lg:px-5", className)}
      >
        <span className="flex min-w-0 items-center gap-2 font-heading text-[14px] leading-5 text-dc-fg2">
          <BellRing className="size-4 shrink-0 text-dc-purple" />
          <span className="truncate">
            <span className="font-bold">Notifications on</span>: announcements
            and session reminders
          </span>
        </span>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-expanded={false}
          className={textButton}
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className={cn(card, "px-4 py-4 lg:px-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-heading text-[16px] font-bold leading-6 text-dc-fg2">
          <Bell className="size-4 shrink-0 text-dc-purple" />
          {push.state === "on"
            ? "Notifications on this device"
            : "Get notified on this device"}
        </p>
        {allOn && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-expanded={true}
            className={textButton}
          >
            Hide
          </button>
        )}
      </div>
      <NotificationPrefs push={push} className="mt-4" />
    </div>
  );
}
