"use client";

import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { usePush } from "@/data/push/PushProvider";
import { readPref, writePref } from "@/data/prefs";
import { useOnline } from "@/hooks/useOnline";
import { Link } from "@/routing";
import { PrimaryButton } from "../Buttons";
import { useInstallHeroVisible } from "../InstallHeroCard";
import { NeedsConnection } from "../NeedsConnection";

/** Dexie pref: this device dismissed the card ("Not now"). */
const PREF_KEY = "home.notificationsHero.dismissed";

/** The install card's dismiss × recipe, on the lavender band. */
const dismissButton =
  "absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/70 text-dc-fg2 shadow-[inset_0_0_1px_rgba(255,255,255,0.66)] backdrop-blur-[1.5px] transition-[scale,background-color] duration-150 ease-out hover:bg-white motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97] motion-reduce:transition-none";

/**
 * Home's "turn on notifications" step, the second stage of the slot that
 * starts with InstallHeroCard: once the app is installed (or in any browser
 * that can push) and the account is signed in, this card asks for
 * notifications until they are on. It is the quiet fallback for everyone the
 * one-time PushOnboardingSheet missed (tapped "Not now", opened the app days
 * later), and it vanishes as soon as push is on, denied, or dismissed here.
 *
 * Shows only while the push state is exactly "off" and the install card is
 * not on screen: install comes first, always (a context that cannot push,
 * "requires-install", "unsupported", "denied", never sees this card either). The tap is the permission prompt, straight
 * from the button (never an auto-prompt), and subscribes with the defaults:
 * announcements on, session reminders left to the switch on /notifications.
 * Dismissal is remembered per device in the Dexie prefs table, like the
 * onboarding sheet's "shown" flag; the /notifications strip stays the place
 * to change one's mind. Hosts wrap it in `empty:hidden`.
 */
export function NotificationsHeroCard() {
  const push = usePush();
  const online = useOnline();
  const installShowing = useInstallHeroVisible();
  // null until the pref is read, so the card never flashes for a device that
  // dismissed it.
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    void readPref<boolean>(PREF_KEY).then((v) => {
      if (!cancelled) setDismissed(v === true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (dismissed !== false || installShowing) return null;
  if (!push.signedIn || push.state !== "off") return null;

  const dismiss = () => {
    setDismissed(true);
    void writePref(PREF_KEY, true);
  };

  return (
    <section
      aria-label="Turn on notifications"
      className="overflow-hidden rounded-xl border border-dc-hairline bg-white font-heading lg:flex lg:flex-row-reverse lg:min-h-[180px]"
    >
      {/* Band: the install card's art slot, in the app's lavender with the
          bell, so the two steps read as one series without a second photo. */}
      <div className="relative flex h-[120px] items-center justify-center bg-dc-lavender lg:h-auto lg:w-[42%] lg:shrink-0">
        <BellRing className="size-12 text-dc-purple" aria-hidden />
        <button
          type="button"
          onClick={dismiss}
          aria-label="Not now"
          className={dismissButton}
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4 lg:flex-1 lg:justify-center lg:gap-6 lg:p-8">
        <div className="min-w-0">
          <h2 className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2 lg:text-2xl lg:font-extrabold lg:leading-[1.2]">
            Turn on notifications
          </h2>
          <p className="mt-1 text-[14px] leading-5 text-dc-muted lg:mt-2 lg:max-w-[640px] lg:text-base lg:leading-6">
            Announcements from the team, on this device. We keep them rare.
            Session reminders are one switch away in{" "}
            <Link
              href="/notifications"
              className="font-bold text-dc-purple underline-offset-2 hover:underline"
            >
              Notifications
            </Link>
            .
          </p>
          {push.error && (
            <p className="mt-2 text-[12px] leading-4 text-dc-error">{push.error}</p>
          )}
        </div>
        <PrimaryButton
          onClick={() => void push.subscribe()}
          disabled={push.busy || !online}
          className="w-full shrink-0 lg:w-fit"
        >
          <BellRing className="size-4" />
          {push.busy ? "Enabling…" : push.error ? "Try again" : "Turn on notifications"}
        </PrimaryButton>
        {!online && <NeedsConnection what="Turning on notifications" />}
      </div>
    </section>
  );
}
