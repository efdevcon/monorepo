"use client";

import { useCallback, useState } from "react";
import { BellRing } from "lucide-react";
import cn from "classnames";
import { usePush } from "@/data/push/PushProvider";
import { REMINDER_LEAD_MINUTES } from "@/data/reminders/reminders";
import {
  canOpenNotificationSettings,
  NotificationSettingsModal,
} from "@/components/announcements/NotificationSettings";

/**
 * The standing reminders offer in the schedule's My Interests view: one
 * quiet line that opens the Notification settings modal in place. It is
 * what makes the third-star sheet's "Not now" mean "not yet": the sheet asks
 * once per device, this stays wherever the value is obvious (the starred
 * list) and never expires or interrupts.
 *
 * Shown while this device could turn reminders on but hasn't: push "off",
 * or "on" with reminders off. Nothing while signed out or detecting (the
 * modal needs an account, like its other entry points), and nothing when
 * the device can't push at all ("denied", "unsupported",
 * "requires-install"), since the row would lead only to an explanation.
 * The modal stays mounted while open, so turning reminders on there hides
 * the row but not the modal.
 */
export function RemindersNudgeRow({ className }: { className?: string }) {
  const push = usePush();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const remindersOff =
    push.state === "off" || (push.state === "on" && push.prefs?.reminders === false);
  const show = canOpenNotificationSettings(push) && remindersOff;

  return (
    <>
      {show && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className={cn(
            // A text link, not a card: boxed, it wrapped to two lines on a
            // 390px phone, and a card read as content rather than an offer.
            "flex w-full cursor-pointer items-center gap-2 rounded py-1 text-left text-[14px] font-bold leading-5 text-dc-purple underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple",
            className
          )}
        >
          <BellRing className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            Get a nudge {REMINDER_LEAD_MINUTES} mins before each interest
          </span>
        </button>
      )}
      <NotificationSettingsModal push={push} open={open} onClose={close} />
    </>
  );
}
