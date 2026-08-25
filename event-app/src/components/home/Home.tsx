"use client";

import APP_CONFIG from "@/CONFIG";
import { AnnouncementsSection } from "../announcements/AnnouncementsSection";
import { HighlightsCarousel } from "../announcements/HighlightsCarousel";
import { InstallAppButton } from "../InstallAppButton";
import { Tickets } from "../Tickets";
import { FeaturedCard } from "./FeaturedCard";
import { Greeting } from "./Greeting";
import { HomeFooterArt } from "./HomeFooterArt";

/**
 * The home page (Figma home redesign): rotating greeting, featured
 * travel-guide card, announcements preview, highlights, tickets, and the
 * "Devcon 8 India" sign-off art. Escapes the 680px `.section` column to the
 * 1312px desktop content box (same pattern as Ticket.tsx / Schedule).
 */
export function Home() {
  return (
    <main className="expand py-6">
      <div className="px-4 lg:mx-auto lg:w-full lg:max-w-[1312px] lg:px-8 xl:px-0">
        <Greeting />
        <div className="mt-8 flex flex-col gap-8 lg:gap-12">
          <FeaturedCard />
          {APP_CONFIG.ANNOUNCEMENTS_ENABLED && (
            <>
              <AnnouncementsSection />
              <HighlightsCarousel />
            </>
          )}
          <div className="border-b border-dc-hairline pb-8 lg:pb-12">
            <Tickets />
            <InstallAppButton className="mt-4 inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-dc-hairline bg-white/80 px-4 py-2 font-heading text-sm font-bold text-dc-fg2 transition-colors hover:bg-white" />
          </div>
          <HomeFooterArt />
        </div>
      </div>
    </main>
  );
}
