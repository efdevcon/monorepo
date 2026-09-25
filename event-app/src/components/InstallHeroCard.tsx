"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { deletePref, readPref, writePref } from "@/data/prefs";
import { Download, Smartphone, X } from "lucide-react";
import QRCode from "qrcode";
import { isIOS } from "@/utils/platform";
import { useUser } from "@/data/auth/useUser";
import { authHeader } from "@/data/push/usePushSubscription";
import { useRetryOnReconnect } from "@/hooks/useRetryOnReconnect";
import { PrimaryButton } from "./Buttons";
import { useInstallFlow, useShouldShowInstall } from "./InstallAppButton";

// Dismissal is shared and persisted: Home and My Devcon are persistent panes
// (TabPanes), both mounted at once, so a per-card useState would leave the
// other copy standing; and it must survive a reload (Didier, 2026-09-24), so
// it lives in the Dexie prefs table like the other nudge flags, mirrored in
// this module-level store for the panes. `null` until the first read.
const PREF_KEY = "home.installHero.dismissed";
let dismissed: boolean | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((cb) => cb());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function load() {
  if (dismissed !== null || loading) return;
  loading = readPref<boolean>(PREF_KEY).then((v) => {
    dismissed = v === true;
    loading = null;
    notify();
  });
}
function dismiss() {
  dismissed = true;
  notify();
  void writePref(PREF_KEY, true);
}

/** Undo the dismissal, here and on disk (EF internal tools: "reset nudges"). */
export function resetInstallHeroDismissal() {
  dismissed = false;
  notify();
  void deletePref(PREF_KEY);
}

/** Lifetime of the sign-in bridge inside the desktop QR, and how often it is re-minted. */
const QR_BRIDGE_TTL_MS = 10 * 60_000;
const QR_BRIDGE_REFRESH_MS = 8 * 60_000;

/**
 * The dismiss × over the art: a dark translucent disc with a white glyph,
 * legible on the phones visual's near-white sky (the old white-glass recipe
 * from the tickets banner vanished there, 2026-09-24).
 */
const glass =
  "bg-[#160b2b]/60 backdrop-blur-[1.5px] transition-[scale,background-color] duration-150 ease-out hover:bg-[#160b2b]/80 motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97] motion-reduce:transition-none";

/**
 * Whether the install hero is on screen right now: the install gate minus
 * the dismissal. `null` while the dismissal flag is still being read, so
 * callers can wait instead of flashing. Home's NotificationsHeroCard yields
 * to it, so the two steps of that slot never show together (Android Chrome
 * can push from a browser tab, so push "off" alone would not keep them
 * apart).
 */
export function useInstallHeroVisible(): boolean | null {
  const shouldShow = useShouldShowInstall();
  const isDismissed = useSyncExternalStore(
    subscribe,
    () => dismissed,
    () => null
  );
  useEffect(() => {
    load();
  }, []);
  if (!shouldShow) return false;
  return isDismissed === null ? null : !isDismissed;
}

/**
 * Top-of-page "install the app" hero for browser visitors, phones and
 * desktops alike since 2026-09-24 (the same gate as the bottom-of-page
 * buttons), on Home, and on My Devcon once signed in on desktop (phones get
 * InstallCompactCard there): a key-art band up top with the copy and CTA on
 * a white panel beneath it; from lg the art sits on the right beside the
 * copy — the HighlightCard shell, with a dismiss × on the art. On desktop
 * the CTA fires Chromium's native prompt when it has one, otherwise the
 * how-to modal explains the browser's own install path (address-bar icon or
 * menu in Chrome and Edge, Add to Dock in Safari, none in Firefox). Renders
 * nothing once installed, in the native shell, or after dismissal; hosts
 * wrap it in `empty:hidden`.
 */
export function InstallHeroCard({
  dismissible = true,
}: {
  /**
   * Home lets people close the card (remembered per device). My Devcon does
   * not: signed in, it is where installing matters most, so the card stays
   * whenever the install gate applies, whatever was dismissed on Home.
   */
  dismissible?: boolean;
} = {}) {
  const gate = useShouldShowInstall();
  const visible = useInstallHeroVisible();
  const { install, modal } = useInstallFlow();
  const { attempt, markFailed } = useRetryOnReconnect();
  // Desktop visitors get a QR code of this site instead of an install
  // button, since the app is at its best installed on a phone: scan, open,
  // install there. Not on phones or tablets (you are already on the device),
  // hence a UA check rather than a breakpoint. Encodes this deployment's own
  // origin, so a preview's card opens the preview. Signed in, the code
  // carries the sign-in bridge (the same link as "copy sign-in link"), so the
  // phone lands signed in: a 10-minute token, re-minted every 8 minutes while
  // the card is on screen, since a QR on a desk is easy to photograph and the
  // bridge is reusable until it expires. Signed out, or if minting fails, a
  // plain link to the app.
  const { user } = useUser();
  const [qr, setQr] = useState<string | null>(null);
  const [qrSignedIn, setQrSignedIn] = useState(false);
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (isIOS() || /Android/i.test(navigator.userAgent)) return;
    let cancelled = false;
    const origin = window.location.origin;
    const render = async () => {
      let link = `${origin}/`;
      let signedIn = false;
      if (user) {
        try {
          const res = await fetch("/api/manifest-bridge", {
            method: "POST",
            headers: { ...(await authHeader()), "Content-Type": "application/json" },
            body: JSON.stringify({ ttlMs: QR_BRIDGE_TTL_MS }),
          });
          const { bridgeToken } = res.ok ? await res.json() : {};
          if (bridgeToken) {
            link = `${origin}/api/auth/bridge?bridge=${encodeURIComponent(bridgeToken)}`;
            signedIn = true;
          }
        } catch {}
      }
      const url = await QRCode.toDataURL(link, { margin: 1, width: 512 }).catch(() => null);
      if (cancelled) return;
      setQr(url);
      setQrSignedIn(signedIn);
    };
    void render();
    const timer = user ? setInterval(() => void render(), QR_BRIDGE_REFRESH_MS) : null;
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [user]);

  if (dismissible ? visible !== true : !gate) return null;

  return (
    <section
      aria-label="Install the Devcon app"
      // DOM order is art first (mobile: on top); row-reverse puts it on the
      // right on desktop without reordering for AT.
      className="overflow-hidden rounded-xl border border-dc-hairline bg-white font-heading lg:flex lg:flex-row-reverse lg:min-h-[220px]"
    >
      {/* Art band. bg fallback keeps the band a solid surface if the art
          fails or is evicted; the img retries when the connection returns
          (see Tickets.tsx). White like the art's own edges: a dark fallback
          peeked out at the band's fractional-pixel edges and read as a
          border around the near-white phones visual. */}
      <div className="relative h-[180px] bg-white lg:h-auto lg:w-[42%] lg:shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={attempt}
          src="/home/install-phones.jpg"
          onError={markFailed}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        {dismissible && (
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className={`absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center rounded-full ${glass}`}
          >
            <X className="size-4 text-dc-purple-fg" />
          </button>
        )}
      </div>

      {/* Copy + CTA: stacked on mobile, one row on desktop. "Devcon app",
          not APP_NAME: the dev config's "Devcon App v2" read as "…App v2 app".
          Desktop adds the phone QR beside the copy. */}
      <div className="flex flex-col gap-4 p-4 lg:flex-1 lg:flex-row lg:items-center lg:gap-8 lg:p-8">
        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:gap-6">
          <div className="min-w-0">
            <h2 className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2 lg:text-2xl lg:font-extrabold lg:leading-[1.2]">
              Install the Devcon app
            </h2>
            <p className="mt-1 text-[14px] leading-5 text-dc-muted lg:mt-2 lg:max-w-[640px] lg:text-base lg:leading-6">
              Your schedule, tickets and notifications, offline and one tap away.
              Turn on push to hear about announcements and the sessions
              you&apos;re interested in.
            </p>
          </div>
          {/* Phones and tablets: the install control. Desktop: none; the QR
              is the whole action (the browser's own install path is still in
              the bottom-of-page button and the how-to). */}
          <PrimaryButton onClick={install} className="w-full shrink-0 lg:hidden">
            <Download className="size-4" />
            Install app
          </PrimaryButton>
        </div>
        {qr && (
          <div className="hidden shrink-0 flex-col items-center gap-2 lg:flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt="QR code that opens this app on your phone"
              className="size-[132px] rounded-lg border border-dc-hairline"
            />
            <p className="flex items-center gap-1 text-[12px] font-bold leading-4 text-dc-fg2">
              <Smartphone className="size-3.5 text-dc-purple" />
              Scan to open on your phone
            </p>
            {qrSignedIn && (
              <p className="text-[11px] leading-4 text-dc-muted">
                Signs you in there too
              </p>
            )}
          </div>
        )}
      </div>
      {modal}
    </section>
  );
}

/**
 * The phone-sized install nudge for My Devcon once signed in (desktop shows
 * InstallHeroCard's QR card instead; the page picks by `useIsDesktop`): one
 * row, a thumbnail crop of the same phones art, the title and one line of
 * copy, and the Install button. Not dismissible and independent of Home's
 * dismissal by decision (Scott, 2026-09-25): it is small enough to stay,
 * and the sign-in page itself never shows an install card. Same install
 * gate and flow as the hero; renders nothing once installed or in the
 * native shell, so hosts wrap it in `empty:hidden`.
 */
export function InstallCompactCard() {
  const gate = useShouldShowInstall();
  const { install, modal } = useInstallFlow();
  const { attempt, markFailed } = useRetryOnReconnect();

  if (!gate) return null;

  return (
    <section
      aria-label="Install the Devcon app"
      className="flex gap-4 rounded-xl border border-dc-hairline bg-white p-4 font-heading"
    >
      {/* Thumbnail: white fallback like the hero's band, retried on reconnect. */}
      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={attempt}
          src="/home/install-phones.jpg"
          onError={markFailed}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className="text-[16px] font-bold leading-6 text-dc-fg2">
          Install the Devcon app
        </h2>
        <p className="mt-0.5 text-[14px] leading-5 text-dc-muted">
          Your schedule, tickets and notifications, offline and one tap away.
        </p>
        <PrimaryButton onClick={install} className="mt-3 w-fit self-end">
          <Download className="size-4" />
          Install app
        </PrimaryButton>
      </div>
      {modal}
    </section>
  );
}
