"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { ParaProvider as ParaSDKProvider } from '@getpara/react-sdk';
import { base } from 'wagmi/chains';
import { APP_NAME, APP_CONFIG } from '@/config/config';
import { wagmiAdapter } from '@/config/appkit';
import { AppKitProvider } from './AppKitProvider';
import '@/config/appkit'; // Initialize AppKit

// Setup query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});

const API_KEY = APP_CONFIG.PARA_API_KEY;
const ENVIRONMENT = APP_CONFIG.PARA_ENVIRONMENT;

if (!API_KEY || !ENVIRONMENT) {
  throw new Error(
    'API key is not defined. Please set NEXT_PUBLIC_PARA_API_KEY in your environment variables.'
  );
}

export function UnifiedProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AppKitProvider>
          <ParaSDKProvider
            paraClientConfig={{
              apiKey: API_KEY,
              env: ENVIRONMENT,
            }}
            externalWalletConfig={{
              wallets: [],
              evmConnector: {
                config: {
                  chains: [base],
                  // Use AppKit's wagmi config for external wallet connections
                  wagmiConfig: wagmiAdapter.wagmiConfig,
                },
              },
              walletConnect: {
                projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || '',
              },
            }}
            config={{
              appName: APP_NAME,
            }}
            paraModalConfig={{
              disableEmailLogin: false,
              disablePhoneLogin: true,
              authLayout: ['AUTH:FULL', 'EXTERNAL:FULL'],
              oAuthMethods: [],
              onRampTestMode: true,
              logo: 'https://partner-assets.beta.getpara.com/icons/7766a9b6-0afd-477e-9501-313f384e3e19/key-logos/Devconnect%20Project-icon.jpg',
              theme: {
                foregroundColor: '#2D3648',
                backgroundColor: '#FFFFFF',
                accentColor: '#0066CC',
                darkForegroundColor: '#E8EBF2',
                darkBackgroundColor: '#1A1F2B',
                darkAccentColor: '#4D9FFF',
                mode: 'light',
                borderRadius: 'none',
                font: 'Inter',
              },
              recoverySecretStepEnabled: true,
              twoFactorAuthEnabled: false,
            }}
          >
            {children}
          </ParaSDKProvider>
        </AppKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
} 
