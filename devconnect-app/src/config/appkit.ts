"use client";
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { OAuthMethod } from "@getpara/react-sdk";
import { paraConnector } from "@getpara/wagmi-v2-integration";
import { para } from "./para";
import { CreateConnectorFn } from "wagmi";
import { QueryClient } from "@tanstack/react-query";
import { base } from "wagmi/chains";

import { APP_NAME, APP_DESCRIPTION } from './config';

export const chains = [base] as const;

export const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

if (!projectId) {
  throw new Error("NEXT_PUBLIC_WC_PROJECT_ID is not set");
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});

const metadata = {
  name: APP_NAME,
  description: APP_DESCRIPTION,
  url: "https://devconnect.org",
  icons: ["https://partner-assets.beta.getpara.com/icons/7766a9b6-0afd-477e-9501-313f384e3e19/key-logos/Devconnect%20Project-icon.jpg"],
};

const connector = paraConnector({
  para: para,
  chains: [base],
  appName: APP_NAME,
  logo: "https://partner-assets.beta.getpara.com/icons/7766a9b6-0afd-477e-9501-313f384e3e19/key-logos/Devconnect%20Project-icon.jpg",
  queryClient,
  oAuthMethods: [] as OAuthMethod[],
  theme: {
    foregroundColor: "#2D3648",
    backgroundColor: "#FFFFFF",
    accentColor: "#0066CC",
    darkForegroundColor: "#E8EBF2",
    darkBackgroundColor: "#1A1F2B",
    darkAccentColor: "#4D9FFF",
    mode: "light",
    borderRadius: "none" as const,
    font: "Inter",
  },
  onRampTestMode: true,
  disableEmailLogin: false,
  disablePhoneLogin: true,
  authLayout: ["AUTH:FULL", "EXTERNAL:FULL"],
  recoverySecretStepEnabled: true,
  twoFactorAuthEnabled: false,
  options: {},
});

const connectors: CreateConnectorFn[] = [
  connector as CreateConnectorFn,
];

export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  networks: [base],
  projectId,
  connectors,
});

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [base],
  projectId,
  metadata,
  features: {
    analytics: true,
    email: false,
    socials: false,
    emailShowWallets: false,
  },
  themeMode: "light",
  // enableEIP6963: false,
  // enableInjected: false,
  // enableWalletConnect: false,
  // enableCoinbase: false,
  // allowUnsupportedChain: false,
  // allWallets: "HIDE",
  featuredWalletIds: [
    // Zerion
    'ecc4036f814562b41a5268adc86270fba1365471402006302e70169465b7ac18',
    // Rainbow
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369',
    // MetaMask
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
    // Coinbase Wallet
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa',
  ],
  excludeWalletIds: ['82061ee410cab0e705cf38830db84ba965effc51a1e1bf43da6d39ff70ae94fb'],
}); 
