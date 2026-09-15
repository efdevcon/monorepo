"use client";

import { useSyncExternalStore } from "react";
import { Download, X } from "lucide-react";
import { useRetryOnReconnect } from "@/hooks/useRetryOnReconnect";
import { useInstallFlow, useShouldShowInstall } from "./InstallAppButton";

// Dismissal is session-scoped and shared: Home and My Devcon are persistent
// panes (TabPanes), both mounted at once, so a per-card useState would leave
// the other copy standing. In memory only, on purpose — the offline-first
// rule keeps user state out of ad-hoc localStorage, and a Dexie flag to
// survive reloads is a follow-up once the card's fate is decided.
let dismissed = false;
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function dismiss() {
  dismissed = true;
  listeners.forEach((cb) => cb());
}

/** The banner pill's glass recipe (Tickets.tsx), shared by CTA and dismiss. */
const glass =
  "bg-white/20 shadow-[inset_0_0_1px_rgba(255,255,255,0.66)] backdrop-blur-[1.5px] transition-[scale,background-color] duration-150 ease-out hover:bg-white/30 motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97] motion-reduce:transition-none";

/**
 * Top-of-page "install the app" hero for browser visitors (desktop included),
 * on Home and My Devcon. The key-art recipe of the home sign-in banner, one
 * size down, with a dismiss ×. Renders nothing once installed, in the native
 * shell, or after dismissal; hosts wrap it in `empty:hidden`.
 */
export function InstallHeroCard() {
  const shouldShow = useShouldShowInstall(true);
  const isDismissed = useSyncExternalStore(
    subscribe,
    () => dismissed,
    () => false
  );
  const { install, modal } = useInstallFlow();
  const { attempt, markFailed } = useRetryOnReconnect();

  if (!shouldShow || isDismissed) return null;

  return (
    <section
      aria-label="Install the Devcon app"
      // Content-sized on mobile (title may wrap to two lines beside the ×);
      // the Figma banner height on desktop.
      className="relative flex min-h-[208px] flex-col justify-end overflow-hidden rounded-xl bg-[#160b2b] p-5 font-heading lg:h-[160px] lg:flex-row lg:items-end lg:justify-between lg:gap-6 lg:p-6"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        // Retries itself when the connection returns (see Tickets.tsx); the
        // bg fallback keeps the text legible if the art fails or is evicted.
        key={attempt}
        src="/tickets-hero.jpg"
        onError={markFailed}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(22,11,43,0.9)] via-[rgba(22,11,43,0.5)] to-transparent" />
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        // z-10: the text column below is `relative` and later in the DOM, so
        // without it a wrapped title paints over (and blocks) the ×.
        className={`absolute right-4 top-4 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full ${glass}`}
      >
        <X className="size-4 text-dc-purple-fg" />
      </button>
      {/* pr-10 keeps a wrapped title clear of the × (mobile: the column
          runs the card's full width). "Devcon app", not APP_NAME: the dev
          config's "Devcon App v2" read as "…App v2 app". */}
      <div className="relative min-w-0 pr-10 [text-shadow:0_2px_4px_rgba(22,11,43,0.4)] lg:pr-0">
        <h2 className="text-2xl font-extrabold leading-[1.2] tracking-[-0.5px] text-dc-purple-fg">
          Install the Devcon app
        </h2>
        <p className="mt-1 text-base leading-6 text-dc-purple-fg">
          Your schedule, tickets and announcements — offline, one tap away.
        </p>
      </div>
      <button
        type="button"
        onClick={install}
        className={`relative mt-4 flex h-10 w-fit shrink-0 cursor-pointer items-center gap-2 rounded-full px-6 text-sm font-bold text-dc-purple-fg lg:mt-0 ${glass}`}
      >
        <Download className="size-4" />
        Install app
      </button>
      {modal}
    </section>
  );
}
