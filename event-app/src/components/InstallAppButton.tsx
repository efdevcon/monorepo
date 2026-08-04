"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Copy, Download, Share, MoreVertical } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import APP_CONFIG from "@/CONFIG";
import { useUser } from "@/data/auth/useUser";
import { supabase } from "@/data/auth/supabase";

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

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua);
}

/**
 * True when installing may need a hop through Safari first: signed in, on
 * iOS, not already installed. Drives both the proactive banner on /ticket
 * and the fallback option in the install modal.
 *
 * Deliberately NOT gated on "not Safari" — several iOS browsers (Brave
 * included) don't add a distinguishing token to their User-Agent, so they
 * can be indistinguishable from real Safari, which made this silently hide
 * exactly when it was needed. Showing it unconditionally on iOS is harmless
 * even when already in Safari (worst case, a redundant option) and far more
 * reliable than trying to detect the negative case.
 */
export function useShouldShowSafariBridge(): boolean {
  const { user } = useUser();
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(!!user && isIOS() && !isStandalone());
  }, [user]);
  return show;
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
      const manifest = await res.json();
      const link: string = manifest.start_url;

      await navigator.clipboard.writeText(link).catch(() => {});

      if (isIOS()) {
        // Harmless even if we're already in Safari — it just re-opens the
        // same link there. See useShouldShowSafariBridge on why this isn't
        // gated on "not Safari".
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
 * Show the install button only on mobile web before install — never inside the
 * native (Capacitor) app or an already-installed standalone PWA.
 */
export function useShouldShowInstall(): boolean {
  const [shouldShow, setShouldShow] = useState(false);
  useEffect(() => {
    if (isStandalone() || Capacitor.isNativePlatform()) return;
    if (typeof navigator === "undefined") return;
    setShouldShow(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
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

/** Platform-aware manual install steps, for browsers with no native prompt. */
function manualInstructions(): { intro: string; steps: ReactNode[] } {
  if (isIOS()) {
    const safari = isSafari();
    return {
      intro: safari
        ? "Add this app to your Home Screen for the full experience."
        : "To install on your iPhone, open this page in Safari first.",
      steps: [
        ...(safari
          ? []
          : [
              <>
                Open this page in <b>Safari</b>.
              </>,
            ]),
        <>
          Tap the <Share className="inline-block h-4 w-4 align-text-bottom" /> Share
          button.
        </>,
        <>
          Choose <b>“Add to Home Screen”</b>.
        </>,
      ],
    };
  }
  // Android / desktop browsers that don't fire `beforeinstallprompt` (e.g.
  // Firefox, or hardened Chromium builds that gate installs).
  return {
    intro: "Add this app to your home screen for the full experience.",
    steps: [
      <>
        Open your browser&apos;s menu{" "}
        <MoreVertical className="inline-block h-4 w-4 align-text-bottom" />.
      </>,
      <>
        Choose <b>“Install app”</b> or <b>“Add to Home screen”</b>.
      </>,
    ],
  };
}

/** Instructions card shown when no native install prompt is available. */
function InstallInstructionsModal({
  onClose,
  onCopySignInLink,
}: {
  onClose: () => void;
  /** Present only when signed in on iOS in a non-Safari browser — copies a
   *  fresh sign-in link to the clipboard to paste into Safari, so the
   *  session carries over (Safari is required to install, but the app was
   *  opened in e.g. Brave/Chrome, which have separate storage). */
  onCopySignInLink?: () => void;
}) {
  const { intro, steps } = manualInstructions();

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <motion.div
        className="w-full overflow-hidden rounded-3xl bg-white shadow-2xl sm:max-w-sm"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 28, scale: 0.98 }}
        transition={{ type: "spring", damping: 28, stiffness: 340 }}
      >
        {/* Devcon art header, fading into the white card body */}
        <div className="relative h-32 w-full">
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

        <div className="px-6 pb-6 text-center">
          <h3 className="text-lg font-bold">Install {APP_CONFIG.APP_NAME}</h3>
          <p className="mb-5 mt-1 text-sm text-gray-500">{intro}</p>
          <ol className="mb-6 space-y-3 text-left text-sm text-gray-600">
            {steps.map((content, i) => (
              <li key={i} className="flex items-start gap-3">
                <Step n={i + 1} /> <span className="pt-0.5">{content}</span>
              </li>
            ))}
          </ol>
          {onCopySignInLink && (
            <button
              onClick={onCopySignInLink}
              className="mb-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[#E1E4EA] py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 active:scale-[0.98]"
            >
              <Copy className="h-4 w-4" />
              Copy sign-in link for Safari
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full cursor-pointer rounded-full bg-[#7D52F4] py-2.5 font-medium text-white transition-colors hover:bg-[#6A3FD1] active:scale-[0.98]"
          >
            Got it
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f3eeff] text-xs font-bold text-[#7D52F4]">
      {n}
    </span>
  );
}

/**
 * "Install app" button + install flow. Only renders on mobile web before
 * install. On Chromium it fires the real native install prompt (captured early
 * in the root layout); everywhere else it shows platform-aware manual steps.
 */
export function InstallAppButton({
  className,
  label = "Install app",
}: {
  className?: string;
  label?: string;
}) {
  const shouldShow = useShouldShowInstall();
  const installPrompt = useInstallPrompt();
  const [showInstructions, setShowInstructions] = useState(false);
  const { user } = useUser();
  const copySignInLink = useCopySignInLink();

  if (!shouldShow) return null;

  const handleClick = async () => {
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

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          className ??
          "inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#E1E4EA] px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        }
      >
        <Download className="h-4 w-4" />
        {label}
      </button>

      <AnimatePresence>
        {showInstructions && (
          <InstallInstructionsModal
            key="install-instructions"
            onClose={() => setShowInstructions(false)}
            onCopySignInLink={user && isIOS() ? copySignInLink : undefined}
          />
        )}
      </AnimatePresence>
    </>
  );
}
