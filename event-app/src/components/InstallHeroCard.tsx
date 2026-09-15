"use client";

import { useSyncExternalStore } from "react";
import { Download, X } from "lucide-react";
import { useRetryOnReconnect } from "@/hooks/useRetryOnReconnect";
import { PrimaryButton } from "./Buttons";
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

/** The banner pill's glass recipe (Tickets.tsx) — the dismiss × over the art. */
const glass =
  "bg-white/20 shadow-[inset_0_0_1px_rgba(255,255,255,0.66)] backdrop-blur-[1.5px] transition-[scale,background-color] duration-150 ease-out hover:bg-white/30 motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97] motion-reduce:transition-none";

/**
 * Top-of-page "install the app" hero for browser visitors (desktop included),
 * on Home and My Devcon: a key-art band up top with the copy and CTA on a
 * white panel beneath it (mobile), art on the right beside the copy (desktop)
 * — the HighlightCard shell, with a dismiss × on the art.
 * Renders nothing once installed, in the native shell, or after dismissal;
 * hosts wrap it in `empty:hidden`.
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
      // DOM order is art first (mobile: on top); row-reverse puts it on the
      // right on desktop without reordering for AT.
      className="overflow-hidden rounded-xl border border-dc-hairline bg-white font-heading lg:flex lg:flex-row-reverse lg:min-h-[220px]"
    >
      {/* Art band. bg fallback keeps the band a solid surface if the art
          fails or is evicted; the img retries when the connection returns
          (see Tickets.tsx). */}
      <div className="relative h-[160px] bg-[#160b2b] lg:h-auto lg:w-[42%] lg:shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={attempt}
          src="/tickets-hero.jpg"
          onError={markFailed}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_40%]"
        />
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className={`absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center rounded-full ${glass}`}
        >
          <X className="size-4 text-dc-purple-fg" />
        </button>
      </div>

      {/* Copy + CTA: stacked on mobile, one row on desktop. "Devcon app",
          not APP_NAME: the dev config's "Devcon App v2" read as "…App v2 app". */}
      <div className="flex flex-col gap-4 p-4 lg:flex-1 lg:justify-center lg:gap-6 lg:p-8">
        <div className="min-w-0">
          <h2 className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2 lg:text-2xl lg:font-extrabold lg:leading-[1.2]">
            Install the Devcon app
          </h2>
          <p className="mt-1 text-[14px] leading-5 text-dc-muted lg:mt-2 lg:max-w-[640px] lg:text-base lg:leading-6">
            Your schedule, tickets and announcements — offline, one tap away.
          </p>
        </div>
        <PrimaryButton onClick={install} className="w-full shrink-0 lg:w-fit">
          <Download className="size-4" />
          Install app
        </PrimaryButton>
      </div>
      {modal}
    </section>
  );
}
