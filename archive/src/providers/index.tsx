"use client";

import { QueryProvider } from "./query";
import { Suspense } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <QueryProvider>{children}</QueryProvider>
    </Suspense>
  );
}
