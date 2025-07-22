"use client";

import { ParaProvider as Provider } from "@getpara/react-sdk";
import { API_KEY, ENVIRONMENT } from "@/config/constants";
import { base } from "wagmi/chains";

export function ParaProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Provider
      paraClientConfig={{
        apiKey: API_KEY,
        env: ENVIRONMENT,
      }}
      externalWalletConfig={{
        wallets: ['METAMASK', 'COINBASE', 'RAINBOW', 'WALLETCONNECT', 'ZERION'],
        createLinkedEmbeddedForExternalWallets: [],
        evmConnector: {
          config: {
            chains: [base],
          },
        },
        walletConnect: {
          projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || '',
        },
      }}
      config={{ appName: 'Devconnect App' }}
      paraModalConfig={{
        disableEmailLogin: false,
        disablePhoneLogin: false,
        authLayout: ['EXTERNAL:FULL', 'AUTH:FULL'],
        oAuthMethods: [],
        onRampTestMode: true,
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
        logo: 'https://partner-assets.beta.getpara.com/icons/7766a9b6-0afd-477e-9501-313f384e3e19/key-logos/Devconnect%20Project-icon.jpg',
        recoverySecretStepEnabled: true,
        twoFactorAuthEnabled: false,
      }}
    >
      {children}
    </Provider>
  );
} 
