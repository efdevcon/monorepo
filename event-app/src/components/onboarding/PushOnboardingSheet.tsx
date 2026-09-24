"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BellRing, CircleCheck } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/data/auth/useUser";
import { usePush } from "@/data/push/PushProvider";
import { readPref, writePref } from "@/data/prefs";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useOnline } from "@/hooks/useOnline";
import { useRouter } from "@/routing";
import { isIOS, isStandalone } from "@/utils/platform";
import { BottomSheet } from "@/components/BottomSheet";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import { NeedsConnection } from "@/components/NeedsConnection";
import { whenIntroSplashDone } from "@/components/IntroSplash";

/**
 * One-time "turn on notifications" ask, shown once per device after the app
 * is installed. Mounted by the (page-layout) layout, inside `PushProvider`.
 *
 * When it opens: in standalone display mode only (never in a browser tab),
 * once the intro splash has finished or been skipped (`whenIntroSplashDone`,
 * then OPEN_DELAY_MS), and only while push is exactly "off". It waits while
 * the push state is "loading" or auth hasn't settled. "on", "denied" and
 * "unsupported" skip it for good (the device can't or needn't be asked);
 * "requires-install" skips without recording (a standalone launch can't
 * really be in that state). A device whose splash played long before this
 * sheet existed still gets it once on its next launch, by design.
 *
 * Once per device: the Dexie pref PREF_KEY is written the moment it opens,
 * so "Not now", the scrim, Escape, a crash or killing the app all count as
 * shown. There is no re-nudge; later changes happen in the Notifications
 * strip at the top of /notifications.
 *
 * Steps (no wizard chrome, one card at a time):
 * - signed out: "Sign in to get updates". The subscriptions API needs an
 *   account, so the primary goes to /ticket (the sign-in home). If the user
 *   signs in during the same app session the sheet comes back with the
 *   notification step (still the same "once": nothing re-opens next launch).
 * - signed in: "Turn on notifications". The primary calls `push.subscribe()`
 *   straight from the tap (announcements on, reminders off, the defaults):
 *   `Notification.requestPermission()` is its first await, so nothing may be
 *   awaited before it. The system dialog is never shown without that tap.
 * - outcomes: "on" → a short confirmation with Done. "denied" → the sheet
 *   closes with a toast pointing at the settings that can undo it. Granted
 *   but subscribe failed (typically the first-launch service worker still
 *   precaching) → the hook's `error` shows here with "Try again", which calls
 *   subscribe() again from that tap; never an automatic retry. Dismissing
 *   the prompt ("default") just leaves the step as it was.
 *
 * Mobile uses the shared BottomSheet (`fit`); BottomSheet is `lg:hidden`, so
 * desktop (an installed desktop PWA is standalone too) gets a centred card
 * in the NotificationSettings modal's shell. Both honour reduced motion.
 *
 * Dev preview: the sheet can't trigger under `pnpm dev` (no service worker,
 * not standalone), so outside production `?previewPushSheet=1` forces it
 * open, skipping the standalone, splash-seen, shown-once and push-state
 * checks but not the sign-in logic. `=signin`, `=enable`, `=done` and
 * `=error` force one step (for screenshots). A preview never writes the pref.
 */

const PREF_KEY = "onboarding.pushSheet";
/** Pause after the splash so the sheet doesn't land on top of its last frame. */
const OPEN_DELAY_MS = 400;

type Step = "signin" | "enable" | "done";
type Preview = "natural" | Step | "error";

/** Session-level lifecycle: `awaitingSignIn` = sent to /ticket, reopen on sign-in. */
type Phase = "idle" | "open" | "awaitingSignIn" | "finished";

function readPreview(): Preview | null {
  if (process.env.NODE_ENV === "production") return null;
  const value = new URLSearchParams(window.location.search).get("previewPushSheet");
  if (!value) return null;
  if (value === "signin" || value === "enable" || value === "done" || value === "error") {
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
  const [splashDone, setSplashDone] = useState(false);
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

  useEffect(() => whenIntroSplashDone(() => setSplashDone(true)), []);

  // First open: re-evaluated as the push state and auth settle.
  useEffect(() => {
    if (phase !== "idle" || !eligible || !splashDone || skippedRef.current) return;
    if (!preview) {
      if (push.state === "loading" || push.state === "requires-install") return;
      if (push.state !== "off") {
        skippedRef.current = true;
        markShown();
        return;
      }
    }
    if (!hasInitialized) return;
    const timer = setTimeout(() => {
      if (!preview) markShown();
      setPhase("open");
    }, OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [phase, eligible, splashDone, preview, push.state, hasInitialized]);

  // Sent to sign in: come back with the notification step once signed in
  // (and only if push is still off; otherwise the sheet just stays closed).
  useEffect(() => {
    if (phase !== "awaitingSignIn" || !user) return;
    if (push.state !== "off" && !preview) return;
    const timer = setTimeout(() => setPhase("open"), OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [phase, user, push.state, preview]);

  const forcedStep = preview && preview !== "natural" ? preview : null;
  const step: Step =
    forcedStep === "error"
      ? "enable"
      : (forcedStep ??
        (!push.signedIn ? "signin" : attempted && push.state === "on" ? "done" : "enable"));
  const error =
    forcedStep === "error"
      ? "The app is still setting up offline support — try again in a few seconds."
      : attempted && !push.busy
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
    // Straight from the tap: subscribe() awaits requestPermission() first.
    setAttempted(true);
    void push.subscribe().then(() => {
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
      busy={step === "enable" && push.busy}
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
  signin: "Sign in to get updates",
  enable: "Turn on notifications",
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
  online,
  onPrimary,
  onDismiss,
}: {
  step: Step;
  titleId: string;
  error: string | null;
  busy: boolean;
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
              Notifications are linked to your Devcon account. Sign in with
              the email on your ticket, then turn them on.
            </p>
            <p className="text-dc-muted">Nothing is sent until you say yes.</p>
          </>
        )}
        {step === "enable" && (
          <>
            <p>
              Get announcements from the Devcon team. We keep them rare.
              Session reminders can be turned on later under Notifications → Settings.
            </p>
            <p className="text-dc-muted">
              You&apos;ll be asked to allow them first. Nothing is sent until
              you say yes.
            </p>
          </>
        )}
        {step === "done" && (
          <p>
            You&apos;re set. Session reminders are opt-in — find them under
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
