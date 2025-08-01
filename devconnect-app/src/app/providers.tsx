'use client';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiAdapter } from '@/config/appkit';
import { AppKitProvider as LocalAppKitProvider } from '@/context/AppKitProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <LocalAppKitProvider>
          {children}
        </LocalAppKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
} 
