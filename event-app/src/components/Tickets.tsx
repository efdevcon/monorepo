"use client";

import { useTickets } from "@/data/tickets/useTickets";
import { useUser } from "@/data/auth/useUser";
import { Link } from "@/routing";
import {
  RefreshTicketsButton,
  TicketSectionHeader,
  TicketSections,
} from "./ticket/TicketSections";
import { useRetryOnReconnect } from "@/hooks/useRetryOnReconnect";
import { useOnline } from "@/hooks/useOnline";
import { usePreviewState } from "@/hooks/usePreviewState";
import { TicketSkeleton } from "./Skeletons";

const purchaseLink = (
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
);

/** Full-width key-art banner linking to My Devcon (Figma home redesign):
 *  signed out it prompts sign-in, signed in with no ticket it prompts the
 *  attach flow. bg fallback keeps the white text legible if the art
 *  fails/evicts. */
function KeyArtBanner({ title, body, cta }: { title: string; body: string; cta: string }) {
  const { attempt, markFailed } = useRetryOnReconnect();
  return (
    <Link
      href="/ticket"
      className="group relative flex h-[400px] flex-col justify-end overflow-hidden rounded-xl bg-[#160b2b] p-5 transition-shadow duration-150 ease-out hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple lg:h-[243px] lg:p-6"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        // Retries itself when the connection returns; a static asset that
        // failed while offline otherwise stays blank for the page's life.
        key={attempt}
        src="/home/tickets-banner.webp"
        onError={markFailed}
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
        {cta}
      </div>
      <div className="relative [text-shadow:0_2px_4px_rgba(22,11,43,0.4)]">
        <h3 className="font-heading text-2xl font-extrabold leading-[1.2] tracking-[-0.5px] text-dc-purple-fg">
          {title}
        </h3>
        <p className="mt-1 font-heading text-base leading-6 text-dc-purple-fg">{body}</p>
      </div>
    </Link>
  );
}

/** Home-page tickets section: signed in it renders the shared My Devcon
 *  layout (TicketSections); signed out it becomes the key-art sign-in banner
 *  from the Figma home redesign. */
export function Tickets() {
  const { user } = useUser();
  const { tickets, primary, prompt, qrCodes, isLoading: ticketsLoading, isRefreshing, error, refresh } =
    useTickets();
  const preview = usePreviewState();
  const isLoading = ticketsLoading || preview === "loading";
  const online = useOnline();

  const hasTickets = tickets.length > 0;
  // Offline the choice cannot be made, so the saved tickets show as before.
  const askToChoose = prompt === "choose" && online;

  return (
    <section className="w-full text-left">
      {/* TicketSections carries its own headings (refresh control included);
          the "Your tickets" header only fronts the states that render without
          them, and keeps refresh reachable for signed-in users so a just-paid
          order can be refetched without a reload. */}
      {(isLoading || !user || !hasTickets || askToChoose) && (
        <div className="mb-4">
          <TicketSectionHeader
            title="Your tickets"
            action={
              user && (
                <RefreshTicketsButton
                  onRefresh={refresh}
                  isRefreshing={isRefreshing}
                  disabled={isLoading || isRefreshing}
                />
              )
            }
          />
        </div>
      )}

      {/* Order matters: isLoading folds in !hasInitialized (useTickets), so a
          signed-in cold load — or an OFFLINE user whose auth can't resolve
          yet — never flashes the signed-out banner over their cached
          tickets/QR codes. */}
      {isLoading ? (
        <TicketSkeleton />
      ) : !user ? (
        /* Signed out: full-width key-art banner prompting sign-in. */
        <>
          <KeyArtBanner
            title="Add your tickets to the Devcon app"
            body="Sign in with your ticket email to unlock the full experience, or with any email to sync Interests and get notifications."
            cta="Sign in"
          />
          {/* Keep a purchase path reachable while signed out */}
          {purchaseLink}
        </>
      ) : error && !hasTickets ? (
        <p className="text-sm text-dc-error">
          Couldn&apos;t load tickets: {error.message}
        </p>
      ) : askToChoose ? (
        /* Several tickets under this email and none chosen yet: the ticket
           tab asks which is theirs; no QR codes until then. */
        <div className="flex flex-col gap-3 rounded-xl border border-dc-hairline bg-white p-4">
          <h3 className="font-heading text-[16px] font-bold leading-6 text-dc-fg2">
            Which ticket is yours?
          </h3>
          <p className="text-[14px] leading-5 text-dc-fg2">
            Several tickets are under this email.{" "}
            <Link href="/ticket" className="font-bold text-dc-purple hover:underline">
              Pick yours
            </Link>{" "}
            to see its QR code.
          </p>
        </div>
      ) : !hasTickets ? (
        /* Signed in, nothing under this email: the same banner, pointing at
           the attach flow on My Devcon (ticket bought with another email or
           by someone else). */
        <>
          <KeyArtBanner
            title="No tickets for this email yet"
            body="Bought yours with another email, or got it from someone else? Attach it to see its QR code here."
            cta="Attach ticket"
          />
          {purchaseLink}
        </>
      ) : (
        <>
          {/* A failed revalidation must never hide cached tickets/QR codes —
              keep the sections and add a quiet notice instead. */}
          {error && (
            <p className="mb-2 text-xs text-dc-muted">
              Couldn&apos;t refresh tickets. Showing your saved ones.
            </p>
          )}
          {prompt === "choose" && !online && (
            <p className="mb-2 text-xs text-dc-muted">
              Pick which ticket is yours when you&apos;re back online.
            </p>
          )}
          <TicketSections
            tickets={tickets}
            qrCodes={qrCodes}
            primary={primary}
            onRefresh={refresh}
            isRefreshing={isRefreshing}
            refreshDisabled={isLoading || isRefreshing}
          />
        </>
      )}
    </section>
  );
}
