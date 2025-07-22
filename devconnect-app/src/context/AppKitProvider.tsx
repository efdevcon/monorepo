"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { State, WagmiProvider } from "wagmi";
import { wagmiAdapter } from "@/config/appkit";

// Setup query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});

export function AppKitProvider({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState?: State;
}) {
  return (
    <WagmiProvider 
      config={wagmiAdapter.wagmiConfig} 
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
} 
