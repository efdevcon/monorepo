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
        <Nav onOpenAI={() => setDevaBotOpen(true)} />
        {/* `section` restrains content width (centered column + gutters);
            bottom padding on mobile clears the floating nav bar. */}
        <div className="section pb-28 lg:pb-0">{children}</div>
        {!isKiosk && (
          <DevaBot
            toggled={devaBotOpen}
            onToggle={(visible) => setDevaBotOpen(visible)}
          />
        )}
      </AuthGuard>
    </LoginTransitionProvider>
  );
}
