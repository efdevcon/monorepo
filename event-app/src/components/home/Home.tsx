"use client";

import APP_CONFIG from "@/CONFIG";
import { AnnouncementsSection } from "../announcements/AnnouncementsSection";
import { HighlightsCarousel } from "../announcements/HighlightsCarousel";
import { InstallAppButton } from "../InstallAppButton";
import { InstallHeroCard } from "../InstallHeroCard";
import { NotificationsHeroCard } from "./NotificationsHeroCard";
import { Tickets } from "../Tickets";
import { FeaturedCard } from "./FeaturedCard";
import { Greeting } from "./Greeting";
import { LegalLinks } from "./LegalLinks";

/**
 * The home page (Figma home redesign): rotating greeting, the install nudge
 * (browser visitors only), the featured highlight hero, announcements
 * preview, highlights carousel, tickets, the legal links (same seven as the
 * devcon.org footer), and the "Devcon 8 India" sign-off art.
 *
 * FeaturedCard sits outside the ANNOUNCEMENTS_ENABLED gate on purpose: it owns
 * that check itself and renders nothing when there's no highlight to show. Escapes the 680px `.section` column to the
 * 1312px desktop content box (same pattern as Ticket.tsx / Schedule).
 */
export function Home() {
  return (
    <main className="expand py-6 lg:pb-16">
      <div className="px-4 lg:mx-auto lg:w-full lg:max-w-[1312px] lg:px-8 xl:px-0">
        {/* Visual title lives in AppHeader; keep a semantic h1 for AT */}
        <h1 className="sr-only">Home</h1>
        <Greeting />
        <div className="mt-8 flex flex-col gap-8 lg:gap-12">
          {/* One slot, two steps: browser visitors get the install nudge up
              top (the bottom button stays as a second chance); installed,
              signed in and push still off, the same slot asks to turn on
              notifications. Wrapper collapses when both are null so the
              stack's gap doesn't double up. */}
          <div className="flex flex-col gap-8 empty:hidden lg:gap-12">
            <InstallHeroCard />
            <NotificationsHeroCard />
          </div>
          <FeaturedCard />
          {APP_CONFIG.ANNOUNCEMENTS_ENABLED && (
            <>
              <AnnouncementsSection />
              <HighlightsCarousel />
            </>
          )}
          {/* HomeFooterArt ("Devcon 8 India") is parked for a design revisit —
              the component is kept, just not rendered. */}
          <div>
            <Tickets />
            {/* Styled to match SecondaryButton (Buttons.tsx), centered.
                Phones and tablets only: desktop's install story is the QR
                on the hero card (Didier, 2026-09-24). */}
            <InstallAppButton className="mx-auto mt-6 flex w-fit cursor-pointer lg:hidden items-center justify-center gap-2 rounded-full border border-dc-hairline bg-white/80 px-8 py-3.5 text-[16px] font-bold leading-none text-dc-fg2 transition-[scale,background-color] duration-150 ease-out hover:bg-dc-lavender motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97] motion-reduce:transition-none" />
          </div>
          <LegalLinks />
        </div>
      </div>
    </main>
  );
}
