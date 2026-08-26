"use client";

import { useState } from "react";
import cn from "classnames";
import { RefreshCw } from "lucide-react";
import { useTickets } from "@/data/tickets/useTickets";
import { useUser } from "@/data/auth/useUser";
import { Link } from "@/routing";
import { QrLightbox, TicketCard, type QrTarget } from "./TicketCards";
import { useRetryOnReconnect } from "@/hooks/useRetryOnReconnect";

/** Renders the user's tickets as cards with QR codes. Signed out, it becomes
 *  the key-art sign-in banner from the Figma home redesign. */
export function Tickets() {
  const {
    attempt: bannerAttempt,
    markFailed: markBannerFailed,
  } = useRetryOnReconnect();
  const { user } = useUser();
  const { tickets, qrCodes, isLoading, isRefreshing, error, refresh } =
    useTickets();
  const [lightbox, setLightbox] = useState<QrTarget | null>(null);

  const allTickets = tickets.flatMap((order) =>
    order.tickets.map((ticket) => ({ ticket, eventName: order.eventName }))
  );

  return (
    <section className="w-full text-left">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
          Your tickets
        </h2>
        {/* Text CTA, unified with the "View all" link style */}
        {user && (
          <button
            onClick={refresh}
            disabled={isLoading || isRefreshing}
            className="flex cursor-pointer items-center gap-1.5 font-heading text-base font-bold text-dc-purple underline-offset-2 enabled:hover:underline disabled:cursor-default disabled:opacity-50"
          >
            <RefreshCw
              className={cn("size-4", isRefreshing && "animate-spin")}
            />
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
        )}
      </div>

      {/* Order matters: isLoading folds in !hasInitialized (useTickets), so a
          signed-in cold load — or an OFFLINE user whose auth can't resolve
          yet — never flashes the signed-out banner over their cached
          tickets/QR codes. */}
      {isLoading ? (
        <p className="text-sm text-dc-muted">Loading tickets…</p>
      ) : !user ? (
        /* Signed out: full-width key-art banner prompting sign-in.
           bg fallback keeps the white text legible if the art fails/evicts. */
        <>
          <Link
            href="/ticket"
            className="group relative flex h-[400px] flex-col justify-end overflow-hidden rounded-xl bg-[#160b2b] p-5 transition-shadow duration-150 ease-out hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple lg:h-[243px] lg:p-6"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              // Retries itself when the connection returns; a static asset that
              // failed while offline otherwise stays blank for the page's life.
              key={bannerAttempt}
              src="/home/tickets-banner.webp"
              onError={markBannerFailed}
              alt=""
              // Mobile: horizontal crop keeps the moon toward the top-left
              // (Figma crop ~72% of the art's width). Desktop: lower band
              // through gateway + bridge. Hover pans the art in gently (the
              // card itself doesn't scale).
              className="absolute inset-0 h-full w-full object-cover object-[72%_center] transition-transform duration-500 ease-out motion-safe:group-hover:scale-105 lg:object-[center_88%]"
            />
          {/* Mobile-only legibility gradient under the text (Figma 5017:5545) */}
          <div className="absolute inset-x-0 bottom-0 h-[134px] bg-gradient-to-t from-[rgba(22,11,43,0.9)] to-transparent lg:hidden" />
          {/* The whole card is the link, so the pill scales on the card's
              hover/press (group-*) rather than its own. */}
          <div className="absolute right-6 top-6 flex h-10 items-center rounded-full bg-white/20 px-6 font-heading text-sm font-bold text-dc-purple-fg shadow-[inset_0_0_1px_rgba(255,255,255,0.66)] backdrop-blur-[1.5px] transition-[scale,background-color] duration-150 ease-out group-hover:bg-white/30 motion-safe:group-hover:scale-[1.03] motion-safe:group-active:scale-[0.97] motion-reduce:transition-none">
            Sign in
          </div>
            <div className="relative [text-shadow:0_2px_4px_rgba(22,11,43,0.4)]">
              <h3 className="font-heading text-2xl font-extrabold leading-[1.2] tracking-[-0.5px] text-dc-purple-fg">
                Add your tickets to the Devcon app
              </h3>
              <p className="mt-1 font-heading text-base leading-6 text-dc-purple-fg">
                Sign in using your ticket purchase email to unlock the full
                experience.
              </p>
            </div>
          </Link>
          {/* Keep a purchase path reachable while signed out */}
          <p className="mt-3 text-sm text-dc-muted">
            Don&apos;t have a ticket yet?{" "}
            <a
              href="https://devcon.org/tickets"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-dc-purple underline-offset-2 hover:underline"
            >
              Get tickets ↗
            </a>
          </p>
        </>
      ) : error && allTickets.length === 0 ? (
        <p className="text-sm text-dc-error">
          Couldn&apos;t load tickets: {error.message}
        </p>
      ) : allTickets.length === 0 ? (
        <div className="relative overflow-hidden rounded-xl p-6 text-white">
          {/* Real banner art from devcon.org/tickets + gradient for legibility */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tickets-hero.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1b0a45]/90 via-[#1b0a45]/60 to-transparent" />
          <div className="relative min-w-0">
            <h3 className="font-heading text-lg font-bold">Welcome!</h3>
            <p className="mt-1 max-w-xs text-sm text-white/80">
              We couldn&apos;t find any tickets for your email yet.
            </p>
            <a
              href="https://devcon.org/tickets"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-full bg-white px-5 py-2.5 font-heading text-sm font-semibold text-dc-purple transition-colors hover:bg-white/90"
            >
              Get tickets
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* A failed revalidation must never hide cached tickets/QR codes —
              keep the grid and add a quiet notice instead. */}
          {error && (
            <p className="mb-2 text-xs text-dc-muted">
              Couldn&apos;t refresh tickets — showing your saved ones.
            </p>
          )}
          <div className="grid gap-3 lg:grid-cols-2">
            {allTickets.map(({ ticket, eventName }) => (
              <TicketCard
                key={ticket.secret}
                ticket={ticket}
                eventName={eventName}
                qrCodes={qrCodes}
                onQrClick={setLightbox}
              />
            ))}
          </div>
        </>
      )}

      <QrLightbox target={lightbox} onClose={() => setLightbox(null)} />
    </section>
  );
}
