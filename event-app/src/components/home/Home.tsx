"use client";

import APP_CONFIG from "@/CONFIG";
import { AnnouncementsSection } from "../announcements/AnnouncementsSection";
import { HighlightsCarousel } from "../announcements/HighlightsCarousel";
import { InstallAppButton } from "../InstallAppButton";
import { Tickets } from "../Tickets";
import { FeaturedCard } from "./FeaturedCard";
import { Greeting } from "./Greeting";

/**
 * The home page (Figma home redesign): rotating greeting, featured
 * travel-guide card, announcements preview, highlights, tickets, and the
 * "Devcon 8 India" sign-off art. Escapes the 680px `.section` column to the
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
            {/* Styled to match SecondaryButton (Buttons.tsx), centered */}
            <InstallAppButton className="mx-auto mt-6 flex w-fit cursor-pointer items-center justify-center gap-2 rounded-full border border-dc-hairline bg-white/80 px-8 py-3.5 text-[16px] font-bold leading-none text-dc-fg2 transition-[scale,background-color] duration-150 ease-out hover:bg-dc-lavender motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97] motion-reduce:transition-none" />
          </div>
        </div>
      </div>
    </main>
  );
}
