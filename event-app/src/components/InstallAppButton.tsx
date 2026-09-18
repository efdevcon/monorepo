"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { createPortal } from "react-dom";
import cn from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Download, ExternalLink, MoreVertical } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import APP_CONFIG from "@/CONFIG";
import { PrimaryButton, SecondaryButton } from "./Buttons";
import { useUser } from "@/data/auth/useUser";
import { supabase } from "@/data/auth/supabase";
import { iosMajorVersion, isIOS, isIPad, isSafari, isStandalone } from "@/utils/platform";
import {
  IosAddToHomeGlyph,
  IosChevronGlyph,
  IosMoreGlyph,
  IosPageMenuGlyph,
  IosShareGlyph,
} from "./IosGlyphs";

/** The Chromium-only install event, captured early in src/app/layout.tsx. */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __deferredInstallPrompt: BeforeInstallPromptEvent | null;
  }
}

/**
 * Gets a fresh sign-in link (via /api/manifest-bridge) and, on iOS, tries to
 * hand it straight to Safari via the `x-safari-https://` scheme — unlike
 * the same trick failing from inside Gmail's in-app browser, this is a real
 * standalone browser (Brave/Chrome) navigating via JS, which iOS generally
 * does hand off to the OS. Copies the link to the clipboard regardless, as
 * a fallback: the handoff isn't guaranteed since it happens after an async
 * fetch, and iOS sometimes blocks app-handoff attempts not tied directly to
 * the tap that triggered them.
 */
export function useCopySignInLink(): () => Promise<void> {
  return async () => {
    try {
      const accessToken = (await supabase?.auth.getSession())?.data.session
        ?.access_token;
      if (!accessToken) throw new Error("Not signed in");

      const res = await fetch("/api/manifest-bridge", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to create sign-in link");
      const { bridgeToken } = await res.json();
      if (!bridgeToken) throw new Error("Failed to create sign-in link");
      const link = `${window.location.origin}/api/auth/bridge?bridge=${encodeURIComponent(bridgeToken)}`;

      await navigator.clipboard.writeText(link).catch(() => {});

      if (isIOS()) {
        // Harmless even if we're already in Safari — it just re-opens the
        // same link there — deliberately not gated on "not Safari", since
        // several iOS browsers (Brave included) are indistinguishable from
        // Safari by User-Agent, which made that gate hide the option exactly
        // when it was needed.
        window.location.href = link.replace(/^https:\/\//, "x-safari-https://");
        toast.success("Opening in Safari… link copied too, in case it doesn't switch automatically");
      } else {
        toast.success("Link copied — paste it into Safari's address bar");
      }
    } catch {
      toast.error("Couldn't create a sign-in link. Try again in a moment.");
    }
  };
}

/**
 * Open the current page in Safari, for visitors who aren't signed in. Same
 * `x-safari-https://` handoff as useCopySignInLink, minus the sign-in link —
 * there's no session to carry, so no API round-trip is needed and the button
 * works signed out (previously the only Safari action required being signed
 * in, so a signed-out visitor was just told to switch browsers manually).
 * The URL is copied too: the handoff isn't guaranteed, and on success this
 * tab is backgrounded so the toast is never seen anyway.
 */
export function useOpenInSafari(): () => Promise<void> {
  return async () => {
    const link = window.location.href;
    await navigator.clipboard.writeText(link).catch(() => {});
    window.location.href = link.replace(/^https:\/\//, "x-safari-https://");
    toast.success(
      "Opening in Safari… link copied too, in case it doesn't switch automatically"
    );
  };
}

/**
 * Show install UI only on mobile web before install — never inside the
 * native (Capacitor) app or an already-installed standalone PWA, and never
 * on desktop (the install nudge is a phone and tablet thing by decision).
 * iPad goes through isIOS(): Safari there asks for the desktop site, so its
 * User-Agent says "Macintosh" and never "iPad" (found on iPadOS 17.7,
 * 2026-09-16); the touch-points check is what tells it from a Mac.
 */
export function useShouldShowInstall(): boolean {
  const [shouldShow, setShouldShow] = useState(false);
  useEffect(() => {
    if (isStandalone() || Capacitor.isNativePlatform()) return;
    if (typeof navigator === "undefined") return;
    setShouldShow(isIOS() || /Android/i.test(navigator.userAgent));
  }, []);
  return shouldShow;
}

/**
 * Subscribes to the `beforeinstallprompt` event captured in the root layout.
 * Returns the deferred prompt when Chromium has offered a native install, or
 * null otherwise (iOS, Firefox, criteria not met, already installed).
 */
function useInstallPrompt(): BeforeInstallPromptEvent | null {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    const sync = () => setPrompt(window.__deferredInstallPrompt ?? null);
    sync();
    window.addEventListener("install-prompt-available", sync);
    window.addEventListener("appinstalled", sync);
    return () => {
      window.removeEventListener("install-prompt-available", sync);
      window.removeEventListener("appinstalled", sync);
    };
  }, []);
  return prompt;
}

/** One manual install step: the control to look for (Apple's own glyph on iOS), and what to do with it. */
type HowToStep = { Icon: ComponentType<{ className?: string }>; text: ReactNode };

/**
 * How to reach "Add to Home Screen" in Safari, which moves with every iOS
 * release (iPhone; iPad keeps Share at the top right). Steps and icons follow
 * khmyznikov/pwa-install's Apple dialog, which tracks these per release:
 * - iOS 27: the compact tab bar's ⋯ button became a Tabs button, so Share
 *   sits in the Page menu (three lines) on the left of the address bar, or
 *   behind a touch and hold on the address bar.
 * - iOS 26: compact tab bar by default, Share behind ⋯ next to the address
 *   bar; the Bottom and Top layouts keep it in the toolbar.
 * - iOS 26 and later share sheets tuck the action behind "View More".
 * - iOS 18 and earlier: the Share button in the bottom toolbar.
 * Guidance is the whole install story on iOS Safari: no beforeinstallprompt,
 * no Web Install API, and the Web Share sheet lacks Safari's own "Add to
 * Home Screen" action (tried 2026-09-16).
 */
function safariSteps(version: number | null, ipad: boolean): HowToStep[] {
  const steps: HowToStep[] = [];
  if (ipad) {
    steps.push({
      Icon: IosShareGlyph,
      text: (
        <>
          Tap <b>Share</b> at the top right.
        </>
      ),
    });
  } else if (version !== null && version >= 27) {
    steps.push(
      {
        Icon: IosPageMenuGlyph,
        text: (
          <>
            Tap the <b>Page</b> menu if there&apos;s no Share icon.
          </>
        ),
      },
      {
        Icon: IosShareGlyph,
        text: (
          <>
            Tap <b>Share</b> in the navigation bar.
          </>
        ),
      }
    );
  } else if (version === 26) {
    steps.push(
      {
        Icon: IosMoreGlyph,
        text: (
          <>
            Tap <b>•••</b> if there&apos;s no Share icon.
          </>
        ),
      },
      {
        Icon: IosShareGlyph,
        text: (
          <>
            Tap <b>Share</b> in the navigation bar.
          </>
        ),
      }
    );
  } else if (version !== null) {
    steps.push({
      Icon: IosShareGlyph,
      text: (
        <>
          Tap <b>Share</b> in the bottom toolbar.
        </>
      ),
    });
  } else {
    // Version unknown: name the places it has lived.
    steps.push({
      Icon: IosShareGlyph,
      text: (
        <>
          Tap <b>Share</b> in the toolbar, or in the menu next to the address bar.
        </>
      ),
    });
  }
  if (version !== null && version >= 26) {
    steps.push({
      Icon: IosChevronGlyph,
      text: (
        <>
          Tap <b>View More</b> in the share sheet.
        </>
      ),
    });
  }
  steps.push({
    Icon: IosAddToHomeGlyph,
    text: (
      <>
        Tap <b>Add to Home Screen</b>.
      </>
    ),
  });
  return steps;
}

/** Platform-aware manual install steps, for browsers with no native prompt. */
function manualInstructions(): { intro: string; steps: HowToStep[] } {
  if (isIOS()) {
    const safari = isSafari();
    return {
      intro: safari
        ? "Add this app to your Home Screen for the full experience."
        : "To install, open this page in Safari first.",
      // Outside Safari the card is just the hop (see InstallInstructionsModal);
      // these steps only show once the visitor is in Safari.
      steps: safariSteps(iosMajorVersion(), isIPad()),
    };
  }
  // Android / desktop browsers that don't fire `beforeinstallprompt` (e.g.
  // Firefox, or hardened Chromium builds that gate installs).
  return {
    intro: "Add this app to your home screen for the full experience.",
    steps: [
      { Icon: MoreVertical, text: <>Open your browser&apos;s menu.</> },
      {
        Icon: Download,
        text: (
          <>
            Tap <b>Install app</b> or <b>Add to Home screen</b>.
          </>
        ),
      },
    ],
  };
}

/** Instructions card shown when no native install prompt is available. */
function InstallInstructionsModal({
  onClose,
  onOpenInSafari,
}: {
  onClose: () => void;
  /** Present on iOS: hands the visitor over to Safari, which is the only
   *  browser that can install. Signed in it carries a fresh sign-in link so
   *  the session survives the hop (other iOS browsers have separate
   *  storage); signed out it just re-opens the page. */
  onOpenInSafari?: () => void;
}) {
  const { intro, steps } = manualInstructions();
  // isSafari() is UA sniffing and unreliable in both directions on iOS
  // (Brave mimics Safari's UA), so it only decides whether the hop is worth
  // offering — the steps below stand on their own either way.
  const safariIsNextStep = !!onOpenInSafari && !isSafari();
  // iOS Safari steps are followed live, so the card stays clear of where
  // Safari opens things. iPhone: the Page menu, ••• menu and share sheet
  // rise from the bottom over roughly the lower half, so the card sits at
  // the top and skips the art header to keep every step above them. iPad:
  // the share sheet is a popover dropping from the top-right toolbar, so the
  // card stays at the bottom. The Safari hop and other platforms keep the
  // usual bottom sheet (centred from `sm`).
  const safariSteps = isIOS() && !safariIsNextStep;
  const stepsOnTop = safariSteps && !isIPad();
  const align = stepsOnTop
    ? "items-start pt-[calc(16px+var(--safe-top))]"
    : safariSteps
      ? "items-end"
      : "items-end sm:items-center";

  return createPortal(
    <motion.div
      className={cn(
        "fixed inset-0 z-[95] flex justify-center bg-black/60 p-4 backdrop-blur-sm",
        align
      )}
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <motion.div
        className="w-full overflow-hidden rounded-3xl bg-white shadow-2xl sm:max-w-sm"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: stepsOnTop ? -28 : 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: stepsOnTop ? -28 : 28, scale: 0.98 }}
        transition={{ type: "spring", damping: 28, stiffness: 340 }}
      >
        {/* Devcon art header, fading into the white card body */}
        <div className={cn("relative h-32 w-full", stepsOnTop && "hidden")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/login/backdrop.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#160b2b]/40 via-[#160b2b]/5 to-white" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/login/devcon-8-logo.svg"
            alt="Devcon"
            className="absolute left-1/2 top-[44%] w-28 -translate-x-1/2 -translate-y-1/2 drop-shadow"
            style={{ filter: "brightness(0) invert(1)" }}
          />
        </div>

        <div className={cn("px-6 pb-6 text-center font-heading", stepsOnTop && "pt-6")}>
          <h3 className="text-lg font-bold text-dc-fg2">
            Install {APP_CONFIG.APP_NAME}
          </h3>
          <p className="mb-5 mt-1 text-sm text-dc-muted">{intro}</p>
          {/* When we're (probably) not in Safari, switching IS the next step,
              so it leads the card as a real button rather than only appearing
              as written instruction step 1. */}
          {safariIsNextStep && (
            <PrimaryButton onClick={onOpenInSafari} className="mb-5 w-full">
              <ExternalLink className="size-4" />
              Open in Safari
            </PrimaryButton>
          )}
          {/* Not in Safari yet: the hop is the whole job, the Safari steps
              would only be noise here (they show once the page reopens in
              Safari and the visitor taps Install again). */}
          {!safariIsNextStep && (
            <ol className="mb-6 space-y-3 text-left text-sm text-dc-muted">
              {steps.map(({ Icon, text }, i) => (
                <li key={i} className="flex items-center gap-3">
                  <StepIcon Icon={Icon} /> <span>{text}</span>
                </li>
              ))}
            </ol>
          )}
          {/* No Safari CTA when we're already in Safari — the Share ->
              Add to Home Screen steps above are the whole job there. */}
          {safariIsNextStep ? (
            <SecondaryButton onClick={onClose} className="w-full">
              Got it
            </SecondaryButton>
          ) : (
            <PrimaryButton onClick={onClose} className="w-full">
              Got it
            </PrimaryButton>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

/** The control a step points at, in a disc (pwa-install's how-to rows). */
function StepIcon({ Icon }: { Icon: ComponentType<{ className?: string }> }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-dc-purple-soft text-dc-purple">
      <Icon className="size-5" />
    </span>
  );
}

/**
 * The install action shared by every install control (bottom-of-page button,
 * top-of-page hero). On Chromium `install()` fires the real native prompt
 * (captured early in the root layout); everywhere else it opens the
 * platform-aware manual steps — render `modal` next to the control.
 */
export function useInstallFlow(): {
  install: () => Promise<void>;
  modal: ReactNode;
} {
  const installPrompt = useInstallPrompt();
  const [showInstructions, setShowInstructions] = useState(false);
  const { user } = useUser();
  const copySignInLink = useCopySignInLink();
  const openInSafari = useOpenInSafari();

  const install = async () => {
    if (installPrompt) {
      // Real native install (Chrome / Brave / Edge / Samsung / etc.).
      try {
        await installPrompt.prompt();
        await installPrompt.userChoice;
      } catch {
        // Prompt already consumed or blocked — fall through to clearing it.
      } finally {
        // The event is single-use; drop it so a later tap shows manual steps.
        window.__deferredInstallPrompt = null;
        window.dispatchEvent(new Event("install-prompt-available"));
      }
      return;
    }
    // No native prompt (iOS, Firefox, hardened Chromium) → manual instructions.
    setShowInstructions(true);
  };

  const modal = (
    <AnimatePresence>
      {showInstructions && (
        <InstallInstructionsModal
          key="install-instructions"
          onClose={() => setShowInstructions(false)}
          // iOS only (Safari is the only installer there). Signed in, the
          // hop carries a sign-in link so the session survives; signed out
          // there's nothing to carry, so a plain hop is enough.
          onOpenInSafari={
            isIOS() ? (user ? copySignInLink : openInSafari) : undefined
          }
        />
      )}
    </AnimatePresence>
  );

  return { install, modal };
}

/**
 * "Install app" button + install flow. Only renders on mobile web before
 * install (useShouldShowInstall).
 */
export function InstallAppButton({
  className,
  label = "Install app",
}: {
  className?: string;
  label?: string;
}) {
  const shouldShow = useShouldShowInstall();
  const { install, modal } = useInstallFlow();

  if (!shouldShow) return null;

  return (
    <>
      <button
        type="button"
        onClick={install}
        className={
          className ??
          // Same treatment as the schedule "Interested" pill: purple icon,
          // hairline border, muted label.
          "inline-flex min-h-8 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-dc-hairline bg-white px-3 py-1 text-[12px] leading-none text-dc-muted transition-colors duration-150 ease-out hover:bg-dc-lavender"
        }
      >
        {/* Purple belongs to the default pill treatment (purple icon, muted
            label). When a caller styles the button itself — e.g. the white
            glass button on the home hero — the icon inherits that colour
            instead, so it can't clash with the surface it sits on. */}
        <Download className={cn("size-4", !className && "text-dc-purple")} />
        {label}
      </button>
      {modal}
    </>
  );
}
