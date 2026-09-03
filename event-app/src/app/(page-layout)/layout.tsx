"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import DevaBot from "@/components/ai/DevaBot";
import cn from "classnames";
import { Nav, isDetailView } from "@/components/Nav";
import { AppHeader } from "@/components/AppHeader";
import { IntroSplash } from "@/components/IntroSplash";
import { recordPathname } from "@/routing/navHistory";

export default function PageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [devaBotOpen, setDevaBotOpen] = useState(false);
  const pathname = usePathname();

  // This layout stays mounted across every page, so it's the one place that
  // sees each pathname change (pages can't — they unmount).
  useEffect(() => {
    recordPathname(pathname);
  }, [pathname]);

  // Full-screen room-screen kiosk: no app chrome (it's shown on a TV).
  const isKiosk = pathname.startsWith("/room-screens/");

  return (
    <IntroSplash>
      {/* Fixed gradient underlay behind all pages (Figma page background). */}
      <div className="app-bg" aria-hidden />
      <AppHeader onOpenAI={() => setDevaBotOpen(true)} />
      {/* `section` restrains content width (centered column + gutters);
          bottom padding on mobile clears the bottom nav bar — except on
          detail views, where the bar is hidden and a slimmer breathing
          space is enough. */}
      <div
        className={cn(
          "section lg:pb-0",
          // Detail views hide the nav — the element that otherwise absorbs
          // the home-indicator inset — so their slimmer padding carries it.
          isDetailView(pathname)
            ? "pb-[calc(2rem+env(safe-area-inset-bottom))]"
            : "pb-28"
        )}
      >
        {children}
      </div>
      <Nav />
      {!isKiosk && (
        <DevaBot
          toggled={devaBotOpen}
          onToggle={(visible) => setDevaBotOpen(visible)}
        />
      )}
    </IntroSplash>
  );
}
