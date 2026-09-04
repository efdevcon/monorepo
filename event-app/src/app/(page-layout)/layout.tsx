"use client";

import { Suspense, useState } from "react";
import { usePathname } from "next/navigation";
import DevaBot from "@/components/ai/DevaBot";
import cn from "classnames";
import { Nav } from "@/components/Nav";
import { AppHeader } from "@/components/AppHeader";
import { IntroSplash } from "@/components/IntroSplash";
import { useDetailView } from "@/routing/detailParam";
import { TabPanes } from "@/components/TabPanes";

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
  const [devaBotOpen, setDevaBotOpen] = useState(false);
  const pathname = usePathname();
  const { kind: detailKind } = useDetailView();

  // Full-screen room-screen kiosk: no app chrome (it's shown on a TV).
  const isKiosk = pathname.startsWith("/room-screens/");

  return (
    <IntroSplash>
      {/* Fixed gradient underlay behind all pages (Figma page background). */}
      <div className="app-bg" aria-hidden />
      <AppHeader onOpenAI={() => setDevaBotOpen(true)} />
      {/* `section` restrains content width (centered column + gutters);
          bottom padding on mobile clears the bottom nav bar, except on detail
          views, where the bar is hidden and a slimmer breathing space is
          enough. */}
      <div
        className={cn(
          "section lg:pb-0",
          detailKind !== null
            ? "pb-[calc(2rem+env(safe-area-inset-bottom))]"
            : "pb-28"
        )}
      >
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
    </IntroSplash>
  );
}
