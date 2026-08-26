"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import DevaBot from "@/components/ai/DevaBot";
import cn from "classnames";
import { Nav, isDetailView } from "@/components/Nav";
import { AppHeader } from "@/components/AppHeader";
import { IntroSplash } from "@/components/IntroSplash";

export default function PageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [devaBotOpen, setDevaBotOpen] = useState(false);
  const pathname = usePathname();

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
          isDetailView(pathname) ? "pb-8" : "pb-28"
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
