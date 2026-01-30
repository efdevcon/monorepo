"use client";

import { useState } from "react";
import DevaBot from "lib/components/ai/overlay";

export default function PageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [devaBotOpen, setDevaBotOpen] = useState(false);

  return (
    <>
      {children}
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
        botVersion="devcon-app"
        toggled={devaBotOpen}
        onToggle={(visible) => setDevaBotOpen(Boolean(visible))}
      />
    </>
  );
}
