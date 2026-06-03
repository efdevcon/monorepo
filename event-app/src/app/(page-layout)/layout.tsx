"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import DevaBot from "@/components/ai/DevaBot";
import { AuthGuard } from "@/components/AuthGuard";
import { Nav } from "@/components/Nav";
import { LoginTransitionProvider } from "@/components/LoginTransition";

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
    <LoginTransitionProvider>
      <AuthGuard>
        <Nav />
        {/* `section` restrains content width (centered column + gutters);
            bottom padding on mobile clears the floating nav bar. */}
        <div className="section pb-28 lg:pb-0">{children}</div>
        {!isKiosk && (
          <>
            <button
              onClick={() => setDevaBotOpen(!devaBotOpen)}
              className="fixed bottom-4 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              {devaBotOpen ? (
                <span className="text-xl">&times;</span>
              ) : (
                <span className="text-lg">AI</span>
              )}
            </button>
            <DevaBot
              toggled={devaBotOpen}
              onToggle={(visible) => setDevaBotOpen(visible)}
            />
          </>
        )}
      </AuthGuard>
    </LoginTransitionProvider>
  );
}
