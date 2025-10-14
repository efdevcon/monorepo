'use client';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ParaProvider } from '@getpara/react-sdk';
import { wagmiAdapter } from '@/config/appkit';
import { AppKitProvider as LocalAppKitProvider } from '@/context/AppKitProvider';
import { APP_CONFIG } from '@/config/config';

export function WalletsProviders({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();

  // Convert string environment to Para SDK Environment enum
  const paraEnvironment =
    APP_CONFIG.PARA_ENVIRONMENT === 'PROD' ? 'PROD' : 'BETA';

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ParaProvider
          paraClientConfig={{
            apiKey: APP_CONFIG.PARA_API_KEY,
            env: paraEnvironment as any,
          }}
          config={{
            appName: 'Devconnect App',
            disableEmbeddedModal: true,
          }}
          paraModalConfig={{
            disableEmailLogin: false,
            disablePhoneLogin: false,
            authLayout: ['AUTH:FULL', 'EXTERNAL:FULL'],
            oAuthMethods: [
              'APPLE',
              'DISCORD',
              'FACEBOOK',
              'FARCASTER',
              'GOOGLE',
              'TWITTER',
            ],
            onRampTestMode: true,
            theme: {
              foregroundColor: '#222222',
              backgroundColor: '#FFFFFF',
              accentColor: '#1b6fae',
              darkForegroundColor: '#EEEEEE',
              darkBackgroundColor: '#111111',
              darkAccentColor: '#AAAAAA',
              mode: 'light',
              borderRadius: 'sm',
              font: 'Inter',
            },
            recoverySecretStepEnabled: true,
            twoFactorAuthEnabled: false,
          }}
        >
          <LocalAppKitProvider>{children}</LocalAppKitProvider>
        </ParaProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
} 
