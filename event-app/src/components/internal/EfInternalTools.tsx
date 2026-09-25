"use client";

import { useState } from "react";
import cn from "classnames";
import { RotateCcw, Sparkles, Tv } from "lucide-react";
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

/**
 * The app's labelled pill (HeaderPill's 32px mobile recipe: white hairline
 * pill, 16px purple icon, 13px label), as a plain class so the room-screens
 * entry can be a Link. Sits under its row's copy, left-aligned.
 */
const toolPill =
  "flex h-8 w-fit cursor-pointer items-center gap-2 rounded-full border border-dc-hairline bg-white pl-[10px] pr-3 text-[13px] leading-none text-dc-fg transition-colors duration-150 ease-out hover:bg-dc-purple-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple [&>svg]:size-4 [&>svg]:text-dc-purple";

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
        <h2 className="text-[16px] font-bold leading-6 text-dc-fg2">EF internal tools</h2>
        <span className="rounded-[2px] bg-white px-1.5 py-[3px] text-[10px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-purple">
          @ethereum.org only
        </span>
      </div>

      {/* Deva (AI assistant) */}
      <div className="mt-4">
        <p className="text-[14px] font-bold leading-5 text-dc-fg2">Ask Deva</p>
        <p className="mt-1 text-[14px] leading-5 text-dc-fg2">
          The AI assistant, off the public menu for now.
        </p>
        <button type="button" onClick={openDevaBot} className={cn(toolPill, "mt-3")}>
          <Sparkles />
          Open
        </button>
      </div>

      {/* Room screens (kiosk) */}
      <div className="mt-4 border-t border-dc-hairline pt-4">
        <p className="text-[14px] font-bold leading-5 text-dc-fg2">Room screens</p>
        <p className="mt-1 text-[14px] leading-5 text-dc-fg2">
          The kiosk view for the display outside each room: pick a room, then leave the
          screen on it.
        </p>
        <Link href="/room-screens" className={cn(toolPill, "mt-3")}>
          <Tv />
          Open
        </Link>
      </div>

      {/* Nudges */}
      <div className="mt-4 border-t border-dc-hairline pt-4">
        <p className="text-[14px] font-bold leading-5 text-dc-fg2">
          Install &amp; notification nudges
        </p>
        <p className="mt-1 text-[14px] leading-5 text-dc-fg2">
          Bring back the &ldquo;Install the Devcon app&rdquo; card, the first-launch push
          sheet and the &ldquo;Turn on notifications&rdquo; card on Home, as if this device
          had never seen them.
        </p>
        {nudges === "cleared" && (
          <p className="mt-1 text-[14px] leading-5 text-dc-purple">
            Cleared. Reload to see them again.
          </p>
        )}
        {nudges === "cleared" ? (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={cn(toolPill, "mt-3")}
          >
            <RotateCcw />
            Reload
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void resetNudges()}
            className={cn(toolPill, "mt-3")}
          >
            <RotateCcw />
            Reset nudges
          </button>
        )}
      </div>

      {/* Session reminder rehearsal (folded by default). */}
      <ReminderRehearsal />
    </section>
  );
}
