"use client";

import {Suspense} from "react";
import { usePathname } from "next/navigation";
import DevaBot from "@/components/ai/DevaBot";
import { setDevaBotOpen, useDevaBotOpen } from "@/components/ai/devaBotState";
import { Nav } from "@/components/Nav";
import { AppHeader } from "@/components/AppHeader";
import { IntroSplash } from "@/components/IntroSplash";
import { TabPanes } from "@/components/TabPanes";
import { PushOnboardingSheet } from "@/components/onboarding/PushOnboardingSheet";
import { PushProvider } from "@/data/push/PushProvider";

/**
 * `useSearchParams` needs a Suspense boundary on statically rendered routes.
 * The fallback is never visible: the whole page tree already renders only
 * after the DataProvider gate on the client.
 */
export default function PageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <PageLayoutInner>{children}</PageLayoutInner>
    </Suspense>
  );
}

function PageLayoutInner({ children }: { children: React.ReactNode }) {
  // Opened from the EF internal tools (My Devcon); closed by the panel itself.
  const devaBotOpen = useDevaBotOpen();
  const pathname = usePathname();

  // Full-screen room-screen kiosk: no app chrome (it's shown on a TV).
  const isKiosk = pathname.startsWith("/room-screens/");
  // The embedded hub sheet sizes itself to the space above the bottom bar
  // (see community-hubs.tsx), so that page needs no clearance padding.
  const bottomPad = pathname.startsWith("/community-hubs") ? "pb-0" : "pb-28";

  return (
    // One shared push state for the header, inbox and onboarding sheet.
    <PushProvider>
    <IntroSplash>
      {/* Fixed gradient underlay behind all pages (Figma page background). */}
      <div className="app-bg" aria-hidden />
      <AppHeader />
      {/* `section` restrains content width (centered column + gutters);
          bottom padding on mobile clears the bottom nav bar, which stays on
          session and speaker pages too. */}
      <div className={`section ${bottomPad} lg:pb-0`}>
        {/* Bottom-bar tabs stay mounted across switches (TabPanes); their
            route pages render nothing. Other routes render as children. */}
        <TabPanes pathname={pathname} />
        {children}
      </div>
      <Nav />
      {!isKiosk && (
        <DevaBot
          toggled={devaBotOpen}
          onToggle={(visible) => setDevaBotOpen(visible)}
        />
      )}
      {/* One-time "turn on notifications" ask after install (not on the TV kiosk). */}
      {!isKiosk && <PushOnboardingSheet />}
    </IntroSplash>
    </PushProvider>
  );
}
