"use client";

import { useState, useCallback, ReactNode } from "react";
import { NativeNavigationContext } from "@/routing";

interface NativeRouterProps {
  children: (href: string) => ReactNode;
}

export function NativeRouter({ children }: NativeRouterProps) {
  const [href, setHref] = useState("/");
  const [history, setHistory] = useState<string[]>([]);

  const navigate = useCallback(
    (newHref: string) => {
      setHistory((prev) => [...prev, href]);
      setHref(newHref);
    },
    [href]
  );

  const goBack = useCallback(() => {
    const prev = history[history.length - 1];
    if (prev) {
      setHistory((h) => h.slice(0, -1));
      setHref(prev);
    }
  }, [history]);

  const canGoBack = history.length > 0;

  return (
    <NativeNavigationContext.Provider value={{ navigate, goBack, canGoBack }}>
      {children(href)}
    </NativeNavigationContext.Provider>
  );
}
