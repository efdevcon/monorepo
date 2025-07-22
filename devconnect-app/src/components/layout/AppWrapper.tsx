"use client";

import { Header } from "./Header";

export function AppWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>{children}</main>
    </div>
  );
} 
