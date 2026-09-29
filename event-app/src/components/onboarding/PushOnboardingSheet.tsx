"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BellRing, CircleCheck } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/data/auth/useUser";
import { usePush } from "@/data/push/PushProvider";
import { readPref, writePref } from "@/data/prefs";
import { getActiveDataset } from "@/data/dataset";
import { onInterestAdded } from "@/data/interested/interestPulse";
import { readInterestedIds } from "@/data/interested/useInterested";
import { REMINDER_LEAD_MINUTES } from "@/data/reminders/reminders";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useOnline } from "@/hooks/useOnline";
import { useRouter } from "@/routing";
import { isIOS, isStandalone } from "@/utils/platform";
import { BottomSheet } from "@/components/BottomSheet";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import { NeedsConnection } from "@/components/NeedsConnection";

/**
 * One-time "turn on notifications" ask, shown once per device when the user
 * stars their INTEREST_THRESHOLD-th session in the installed app. Mounted by
 * the (page-layout) layout, inside `PushProvider`.
 *
 * Why then: it used to open on first launch, before the user knew what the
 * app does. Starring a third session is the moment they're invested in the
 * schedule, which is what session reminders are for.
 *
 * When it opens: in standalone display mode only (never in a browser tab),
 * once star taps have paused for QUIET_MS and the active dataset holds at
 * least INTEREST_THRESHOLD interests (`onInterestAdded`). The pause means a
 * burst of stars finishes first: a sheet sliding up mid-burst caught the
 * next tap on its scrim or "Not now" and burned the one ask. Only a tap
 * counts: stars arriving by sync, or a device that already had three, wait
 * for the next addition. It opens while push is "off", and also while it is
 * "on" with session reminders off (the Home card turns on announcements
 * only, so those users would otherwise never hear about reminders). It
 * waits while the push state is "loading", the flags aren't known yet or
 * auth hasn't settled. "on" with reminders on, "denied" and "unsupported"
 * skip it for good (the device can't or needn't be asked);
 * "requires-install" skips without recording (a standalone launch can't
 * really be in that state).
 *
 * Once per device: the Dexie pref PREF_KEY is written the moment it opens,
 * so "Not now", the scrim, Escape, a crash or killing the app all count as
 * shown. "Not now" still isn't "never": the schedule's My Interests view
 * keeps a quiet standing row (`RemindersNudgeRow`) that opens the
 * Notification settings while reminders are off.
 *
 * Steps (no wizard chrome, one card at a time):
 * - signed out: "Sign in to get session reminders". The subscriptions API needs an
 *   account, so the primary goes to /ticket (the sign-in home). If the user
 *   signs in during the same app session the sheet comes back with the
 *   notification step (still the same "once": nothing re-opens next launch).
 * - signed in, push off: "Get reminded before your sessions". The primary
 *   calls `push.subscribe(SUBSCRIBE_PREFS)` straight from the tap:
 *   `Notification.requestPermission()` is its first await, so nothing may be
 *   awaited before it. The system dialog is never shown without that tap.
 *   Unlike the other entry points (reminders off by default) it turns
 *   session reminders ON as well as announcements: the reminders are what
 *   this moment is asking about.
 * - signed in, push on without reminders: the same step, reworded, whose
 *   primary calls `push.setPref("reminders", true)` (a PATCH of the device's
 *   row; permission is already granted, so no prompt).
 * - outcomes: both types on → a short confirmation with Done. "denied" → the sheet
 *   closes with a toast pointing at the settings that can undo it. Granted
 *   but subscribe failed (typically the service worker still precaching
 *   on a fresh install) → the hook's `error` shows here with "Try again", which calls
 *   subscribe() again from that tap; never an automatic retry. Dismissing
 *   the prompt ("default") just leaves the step as it was.
 *
 * Mobile uses the shared BottomSheet (`fit`); BottomSheet is `lg:hidden`, so
 * desktop (an installed desktop PWA is standalone too) gets a centred card
 * in the NotificationSettings modal's shell. Both honour reduced motion.
 *
 * Dev preview: the sheet can't trigger under `pnpm dev` (no service worker,
 * not standalone), so outside production `?previewPushSheet=1` forces it
 * open, skipping the standalone, third-star, shown-once and push-state
 * checks but not the sign-in logic. `=signin`, `=enable`, `=reminders` (the
 * push-on wording), `=done` and `=error` force one step (for screenshots). A
 * preview never writes the pref.
 */

/**
 * A new key: devices that saw (or skipped) the old first-launch sheet under
 * "onboarding.pushSheet" still get this ask once, if push is still off.
 */
export const PREF_KEY = "onboarding.pushSheet.interests";
/** Interested sessions (active dataset) that make the ask worth it. */
const INTEREST_THRESHOLD = 3;
/** No star tap for this long ends a burst: only then does the sheet open. */
const QUIET_MS = 3000;
/** Pause before reopening after sign-in, so the page lands first. */
const OPEN_DELAY_MS = 800;
/** What this sheet subscribes with: reminders too, unlike a plain subscribe(). */
const SUBSCRIBE_PREFS = { announcements: true, reminders: true };

type Step = "signin" | "enable" | "done";
type Preview = "natural" | Step | "reminders" | "error";

/** Session-level lifecycle: `awaitingSignIn` = sent to /ticket, reopen on sign-in. */
type Phase = "idle" | "open" | "awaitingSignIn" | "finished";

function readPreview(): Preview | null {
  if (process.env.NODE_ENV === "production") return null;
  const value = new URLSearchParams(window.location.search).get("previewPushSheet");
  if (!value) return null;
  if (
    value === "signin" ||
    value === "enable" ||
    value === "reminders" ||
    value === "done" ||
    value === "error"
  ) {
    return value;
  }
  return "natural";
}

/** Real-world timestamp (not the mockable app clock): when this device was asked. */
function markShown() {
  void writePref(PREF_KEY, new Date().toISOString());
}

const deniedHint = () =>
  isIOS()
    ? "Notifications are blocked. You can allow them in Settings → Notifications, under this app."
    : "Notifications are blocked. You can allow them in your browser's site settings.";

const MODAL_BG = "linear-gradient(to top, #fbfafc 19.982%, #fff5fa 100%)";

export function PushOnboardingSheet() {
  const push = usePush();
  const { user, hasInitialized } = useUser();
  const online = useOnline();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const titleId = useId();

  const [preview, setPreview] = useState<Preview | null>(null);
  // Standalone and never shown on this device (or a dev preview).
  const [eligible, setEligible] = useState(false);
  // A star tap in this app session left INTEREST_THRESHOLD+ interests.
  const [triggered, setTriggered] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  // A subscribe() was tapped from this sheet: only then do "on", "denied"
  // and `error` count as its outcome.
  const [attempted, setAttempted] = useState(false);

  // Once skipped for a state that makes the ask pointless ("on", "denied",
  // "unsupported"), never open later in this session either (e.g. after
  // turning push off in the Notifications modal).
  const skippedRef = useRef(false);

  useEffect(() => {
    const forced = readPreview();
    if (!forced && !isStandalone()) return;
    let cancelled = false;
    void readPref(PREF_KEY).then((shown) => {
      if (cancelled) return;
      if (forced) setPreview(forced);
      if (forced || !shown) setEligible(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The preview skips the wait for a tap.
  const armed = triggered || !!preview;

  // Each star tap restarts the quiet timer; the count is checked once taps
  // stop (the store write has committed by then).
  useEffect(() => {
    if (!eligible || armed) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = onInterestAdded("session", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void readInterestedIds(getActiveDataset().eventId).then((ids) => {
          if (!cancelled && ids.length >= INTEREST_THRESHOLD) setTriggered(true);
        });
      }, QUIET_MS);
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe();
    };
  }, [eligible, armed]);

  // Whether there is anything to ask: "yes" (push off, or on without
  // reminders), "no" (reminders already on, or the device can't push),
  // "wait" (push state or the device's flags not known yet).
  const need: "yes" | "no" | "wait" =
    push.state === "loading" || push.state === "requires-install"
      ? "wait"
      : push.state === "off"
        ? "yes"
        : push.state !== "on"
          ? "no"
          : !push.prefs
            ? "wait"
            : push.prefs.reminders
              ? "no"
              : "yes";

  // First open: re-evaluated as the push state and auth settle.
  useEffect(() => {
    if (phase !== "idle" || !eligible || !armed || skippedRef.current) return;
    if (!preview) {
      if (need === "wait") return;
      if (need === "no") {
        skippedRef.current = true;
        markShown();
        return;
      }
    }
    if (!hasInitialized) return;
    // No extra pause (the quiet wait already let the last star land), but
    // out of the effect body so the open is its own render.
    const timer = setTimeout(() => {
      if (!preview) markShown();
      setPhase("open");
    }, 0);
    return () => clearTimeout(timer);
  }, [phase, eligible, armed, preview, need, hasInitialized]);

  // Sent to sign in: come back with the notification step once signed in
  // (and only if there is still something to ask; otherwise the sheet just
  // stays closed).
  useEffect(() => {
    if (phase !== "awaitingSignIn" || !user) return;
    if (need !== "yes" && !preview) return;
    const timer = setTimeout(() => setPhase("open"), OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [phase, user, need, preview]);

  const forcedStep = preview && preview !== "natural" ? preview : null;
  // Push is already on, only reminders are missing: a PATCH, no prompt.
  const remindersOnly =
    forcedStep === "reminders" || (!forcedStep && push.state === "on");
  const bothOn = push.state === "on" && !!push.prefs?.reminders;

  const step: Step =
    forcedStep === "error" || forcedStep === "reminders"
      ? "enable"
      : (forcedStep ??
        (!push.signedIn ? "signin" : attempted && bothOn ? "done" : "enable"));
  const busy = remindersOnly ? push.prefBusy === "reminders" : push.busy;
  const error =
    forcedStep === "error"
      ? "The app is still setting up offline support — try again in a few seconds."
      : attempted && !busy
        ? push.error
        : null;

  // Stable: BottomSheet re-runs its open effect when onOpenChange changes.
  const close = useCallback(() => setPhase("finished"), []);
  const onOpenChange = useCallback((next: boolean) => !next && close(), [close]);

  const onPrimary = () => {
    if (step === "signin") {
      setPhase("awaitingSignIn");
      router.push("/ticket");
      return;
    }
    if (step === "done") {
      close();
      return;
    }
    setAttempted(true);
    if (remindersOnly) {
      void push.setPref("reminders", true);
      return;
    }
    // Straight from the tap: subscribe() awaits requestPermission() first.
    void push.subscribe(SUBSCRIBE_PREFS).then(() => {
      // Denied from this tap: nothing left to offer here but where to undo it.
      if ("Notification" in window && Notification.permission === "denied") {
        setPhase("finished");
        toast(deniedHint());
      }
    });
  };

  const open = phase === "open";
  const content = (
    <SheetContent
      step={step}
      titleId={titleId}
      error={error}
      busy={step === "enable" && busy}
      remindersOnly={remindersOnly}
      online={online}
      onPrimary={onPrimary}
      onDismiss={close}
    />
  );

  if (isDesktop) {
    return (
      <DesktopShell open={open} onClose={close} titleId={titleId}>
        {content}
      </DesktopShell>
    );
  }
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      ariaLabel={TITLES[step]}
      fit
    >
      <div className="rounded-t-xl border border-dc-hairline bg-white px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {content}
      </div>
    </BottomSheet>
  );
}

const TITLES: Record<Step, string> = {
  signin: "Sign in to get session reminders",
  enable: "Get reminded before your sessions",
  done: "Notifications are on",
};

/**
 * The card body shared by both shells: icon, title, two lines, then the
 * stacked full-width buttons. The primary takes focus whenever a step
 * mounts (autoFocus), so keyboard and screen-reader users land on the ask.
 */
function SheetContent({
  step,
  titleId,
  error,
  busy,
  remindersOnly,
  online,
  onPrimary,
  onDismiss,
}: {
  step: Step;
  titleId: string;
  error: string | null;
  busy: boolean;
  remindersOnly: boolean;
  online: boolean;
  onPrimary: () => void;
  onDismiss: () => void;
}) {
  const Icon = step === "done" ? CircleCheck : BellRing;
  const needsConnection = step === "enable" && !online;
  return (
    <div className="font-heading">
      <Icon className="size-8 text-dc-purple" aria-hidden />
      <h2
        id={titleId}
        className="mt-3 text-[20px] font-bold leading-7 tracking-[-0.5px] text-dc-fg2"
      >
        {TITLES[step]}
      </h2>
      <div className="mt-2 flex flex-col gap-2 text-[14px] leading-5 text-dc-fg2">
        {step === "signin" && (
          <>
            <p>
              We can nudge you {REMINDER_LEAD_MINUTES} minutes before each
              session you&apos;re interested in. Notifications are linked to
              your Devcon account, so sign in first, with the email on your
              ticket if you have one.
            </p>
            <p className="text-dc-muted">Nothing is sent until you say yes.</p>
          </>
        )}
        {step === "enable" && remindersOnly && (
          <p>
            We&apos;ll nudge you {REMINDER_LEAD_MINUTES} minutes before each
            session you&apos;re interested in. Your announcements stay as
            they are.
          </p>
        )}
        {step === "enable" && !remindersOnly && (
          <>
            <p>
              We&apos;ll nudge you {REMINDER_LEAD_MINUTES} minutes before each
              session you&apos;re interested in, plus the occasional
              announcement from the Devcon team. We keep those rare.
            </p>
            <p className="text-dc-muted">
              You&apos;ll be asked to allow them first. Nothing is sent until
              you say yes.
            </p>
          </>
        )}
        {step === "done" && (
          <p>
            You&apos;re set. Change what you get any time under
            Notifications → Settings.
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[14px] leading-5 text-dc-error">
          {error}
        </p>
      )}
      {needsConnection && (
        <NeedsConnection what="Turning on notifications" className="mt-3" />
      )}

      <div className="mt-6 flex flex-col gap-3">
        <PrimaryButton
          // A new button per step, so autoFocus moves focus to each new ask.
          key={step}
          type="button"
          autoFocus
          onClick={onPrimary}
          disabled={busy || needsConnection}
          // It takes focus on open: show the app's purple ring, not the UA's.
          className="w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple"
        >
          {step === "signin"
            ? "Sign in"
            : step === "done"
              ? "Done"
              : busy
                ? "Turning on…"
                : error
                  ? "Try again"
                  : remindersOnly
                    ? "Turn on reminders"
                    : "Turn on notifications"}
        </PrimaryButton>
        {step !== "done" && (
          <SecondaryButton type="button" onClick={onDismiss} className="w-full">
            Not now
          </SecondaryButton>
        )}
      </div>
    </div>
  );
}

/**
 * Desktop shell: the Notifications modal's centred card (same background,
 * radius and shadow). Scrim click and Escape dismiss, like "Not now".
 */
function DesktopShell({
  open,
  onClose,
  titleId,
  children,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  children: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const duration = reducedMotion ? 0 : 0.2;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/[0.64] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-[361px] rounded-[12px] p-6 shadow-[0_10px_15px_rgba(22,11,43,0.1),0_4px_6px_rgba(22,11,43,0.1)]"
            style={{ background: MODAL_BG }}
            initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.9 }}
            transition={{ duration, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
