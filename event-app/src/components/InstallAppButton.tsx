"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, MoreVertical } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import APP_CONFIG from "@/CONFIG";

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

function isStandalone(): boolean {
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
function InstallInstructionsModal({ onClose }: { onClose: () => void }) {
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
          />
        )}
      </AnimatePresence>
    </>
  );
}
