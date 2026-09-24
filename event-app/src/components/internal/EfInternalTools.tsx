"use client";

import { useState } from "react";
import { ExternalLink, FlaskConical, RotateCcw, Sparkles, Tv } from "lucide-react";
import { useUser } from "@/data/auth/useUser";
import { deletePref } from "@/data/prefs";
import { openDevaBot } from "@/components/ai/devaBotState";
import { Link } from "@/routing";
import { ReminderRehearsal } from "@/components/announcements/ReminderRehearsal";
import { resetInstallHeroDismissal } from "@/components/InstallHeroCard";

const TEAM_DOMAIN = "@ethereum.org";

/** Per-device "already shown / dismissed" flags of the notification nudges. */
const NUDGE_PREF_KEYS = [
  "onboarding.pushSheet", // PushOnboardingSheet, once per device
  "home.notificationsHero.dismissed", // Home's "Turn on notifications" card
];

const textButton =
  "flex cursor-pointer items-center gap-1.5 rounded-full border border-dc-hairline bg-white px-3 py-1.5 text-[13px] font-bold leading-none text-dc-fg2 hover:bg-dc-purple-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple";

/**
 * Tools for the EF team on My Devcon (/ticket), rendered only for signed-in
 * @ethereum.org accounts; attendees never see the section. Everything here
 * acts on this device or this account only:
 * - Ask Deva: opens the AI assistant panel (DevaBot). Its "AI" entry left
 *   the public header on 2026-09-24; this is the team's way in.
 * - Room screens: the kiosk view shown on the display outside each room
 *   (/room-screens). Out of the public nav since 2026-09-24; this is its
 *   entry point for the team.
 * - Reset nudges: brings back the install card (its dismissal is in memory
 *   for the session) and clears the per-device flags that hide the
 *   first-launch push sheet and Home's "Turn on notifications" card, so all
 *   three can be seen again (the two flags after a reload).
 * - Rehearse reminders (ReminderRehearsal): the session-reminder rehearsal at
 *   a mocked clock, own devices only.
 */
export function EfInternalTools() {
  const { user } = useUser();
  const [nudges, setNudges] = useState<"idle" | "cleared">("idle");

  if (!user?.email?.toLowerCase().endsWith(TEAM_DOMAIN)) return null;

  const resetNudges = async () => {
    resetInstallHeroDismissal();
    await Promise.all(NUDGE_PREF_KEYS.map((k) => deletePref(k)));
    setNudges("cleared");
  };

  return (
    <section
      aria-label="EF internal tools"
      className="mt-6 rounded-xl border border-dc-hairline bg-dc-lavender p-4 font-heading lg:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[16px] font-bold leading-6 text-dc-fg2">
          <FlaskConical className="size-4 text-dc-purple" />
          EF internal tools
        </h2>
        <span className="rounded-[2px] bg-white px-1.5 py-[3px] text-[10px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-purple">
          @ethereum.org only
        </span>
      </div>

      {/* Deva (AI assistant) */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-bold leading-5 text-dc-fg2">Ask Deva</p>
          <p className="mt-1 text-[12px] leading-4 text-dc-muted">
            The AI assistant, off the public menu for now.
          </p>
        </div>
        <button type="button" onClick={openDevaBot} className={textButton}>
          <Sparkles className="size-3.5" />
          Open
        </button>
      </div>

      {/* Room screens (kiosk) */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3 border-t border-dc-hairline pt-4">
        <div className="min-w-0">
          <p className="text-[14px] font-bold leading-5 text-dc-fg2">Room screens</p>
          <p className="mt-1 text-[12px] leading-4 text-dc-muted">
            The kiosk view for the display outside each room: pick a room, then leave the
            screen on it.
          </p>
        </div>
        <Link href="/room-screens" className={textButton}>
          <Tv className="size-3.5" />
          Open
          <ExternalLink className="size-3" />
        </Link>
      </div>

      {/* Nudges */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3 border-t border-dc-hairline pt-4">
        <div className="min-w-0">
          <p className="text-[14px] font-bold leading-5 text-dc-fg2">
            Install &amp; notification nudges
          </p>
          <p className="mt-1 text-[12px] leading-4 text-dc-muted">
            Bring back the &ldquo;Install the Devcon app&rdquo; card, the first-launch push
            sheet and the &ldquo;Turn on notifications&rdquo; card on Home, as if this device
            had never seen them.
          </p>
          {nudges === "cleared" && (
            <p className="mt-1 text-[12px] leading-4 text-dc-purple">
              Cleared. Reload to see them again.
            </p>
          )}
        </div>
        {nudges === "cleared" ? (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={textButton}
          >
            <RotateCcw className="size-3.5" />
            Reload
          </button>
        ) : (
          <button type="button" onClick={() => void resetNudges()} className={textButton}>
            <RotateCcw className="size-3.5" />
            Reset nudges
          </button>
        )}
      </div>

      {/* Session reminder rehearsal (folded by default). */}
      <ReminderRehearsal />
    </section>
  );
}
