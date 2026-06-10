"use client";

import { createElement, useEffect, useRef, useState } from "react";
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

/** iOS-in-a-non-Safari-browser can't install — point them to Safari. */
function IOSNonSafariModal({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full rounded-2xl bg-white p-6 text-center shadow-2xl sm:max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3eeff] text-[#7D52F4]">
          <Download className="h-6 w-6" />
        </div>
        <h3 className="mb-1 text-lg font-bold">Install {APP_CONFIG.APP_NAME}</h3>
        <p className="mb-5 text-sm text-gray-500">
          To install on your iPhone, open this page in Safari first.
        </p>
        <ol className="mb-6 space-y-3 text-left text-sm text-gray-600">
          <li className="flex gap-3">
            <Step n={1} /> Open it in <b>Safari</b>.
          </li>
          <li className="flex gap-3">
            <Step n={2} /> Tap the{" "}
            <Share className="inline-block h-4 w-4 align-text-bottom" /> Share
            button.
          </li>
          <li className="flex gap-3">
            <Step n={3} /> Choose <b>“Add to Home Screen”</b>.
          </li>
        </ol>
        <button
          onClick={onClose}
          className="w-full cursor-pointer rounded-full bg-[#7D52F4] py-2.5 font-medium text-white transition-colors hover:bg-[#6A3FD1]"
        >
          Got it
        </button>
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
  const showIosInstructions = open && isIOS() && !isSafari();

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

      {showIosInstructions && <IOSNonSafariModal onClose={() => setOpen(false)} />}
      {open && !showIosInstructions && (
        <PwaInstallElement onClose={() => setOpen(false)} />
      )}
    </>
  );
}
