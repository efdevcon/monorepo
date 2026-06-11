"use client";

import { createElement, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Download, Share } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import APP_CONFIG from "@/CONFIG";

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

/** iOS has no programmatic install — Safari requires the user to tap
 *  Share → Add to Home Screen, and other iOS browsers can't install at all
 *  (so they must reopen the page in Safari first). Either way we render our
 *  own instructions rather than relying on the install web component, which
 *  has no reliable Apple flow. */
function IOSInstallModal({ onClose }: { onClose: () => void }) {
  const safari = isSafari();

  const steps: ReactNode[] = [
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
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full overflow-hidden rounded-3xl bg-white shadow-2xl sm:max-w-sm"
        onClick={(e) => e.stopPropagation()}
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
          <p className="mb-5 mt-1 text-sm text-gray-500">
            {safari
              ? "Add this app to your Home Screen for the full experience."
              : "To install on your iPhone, open this page in Safari first."}
          </p>
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
      </div>
    </div>,
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

/** The @khmyznikov/pwa-install web component (Android + iOS Safari).
 *  The package defines a custom element at import time and touches browser
 *  globals (HTMLElement / customElements) with no SSR guard, so we load it
 *  dynamically on the client only — never at module top level. */
function PwaInstallElement({ onClose }: { onClose: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    import("@khmyznikov/pwa-install").then(() => {
      if (!cancelled) ref.current?.showDialog?.(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("pwa-install-success-event", onClose);
    el.addEventListener("pwa-user-choice-result-event", onClose);
    return () => {
      el.removeEventListener("pwa-install-success-event", onClose);
      el.removeEventListener("pwa-user-choice-result-event", onClose);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    createElement("pwa-install", {
      ref,
      "manifest-url": "/manifest.webmanifest",
      name: APP_CONFIG.APP_NAME,
      description: APP_CONFIG.APP_DESCRIPTION,
      icon: "/android-chrome-512x512.png",
      "manual-apple": "true",
      "manual-chrome": "true",
    }),
    document.body
  );
}

/**
 * "Install app" button + install flow, mirroring the lingodeck approach
 * (`@khmyznikov/pwa-install`). Only renders on mobile web before install.
 */
export function InstallAppButton({
  className,
  label = "Install app",
}: {
  className?: string;
  label?: string;
}) {
  const shouldShow = useShouldShowInstall();
  const [open, setOpen] = useState(false);
  // iOS (Safari or otherwise) can't install programmatically — always show our
  // own Share → Add to Home Screen instructions. The web component is only used
  // for Android, where `beforeinstallprompt` provides a real install flow.
  const showIosInstructions = open && isIOS();

  if (!shouldShow) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#E1E4EA] px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        }
      >
        <Download className="h-4 w-4" />
        {label}
      </button>

      {showIosInstructions && <IOSInstallModal onClose={() => setOpen(false)} />}
      {open && !showIosInstructions && (
        <PwaInstallElement onClose={() => setOpen(false)} />
      )}
    </>
  );
}
