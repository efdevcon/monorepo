"use client";
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { CreateConnectorFn } from "wagmi";
import { injected } from "wagmi/connectors";
import { paraConnector } from "@getpara/wagmi-v2-integration";
import { para } from "./para";
import { APP_NAME } from './config';
import { queryClient } from "@/context/QueryProvider";
import { chains } from './networks';
import { base } from '@reown/appkit/networks';


export const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

if (!projectId) {
  throw new Error("NEXT_PUBLIC_WC_PROJECT_ID is not set");
}

const metadata = {
  name: APP_NAME,
  description: "Devconnect App",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://devconnect.org",
  icons: ["https://partner-assets.beta.getpara.com/icons/7766a9b6-0afd-477e-9501-313f384e3e19/key-logos/Devconnect%20Project-icon.jpg"],
};

// Add all connectors to AppKit's wagmi adapter
const connectors: CreateConnectorFn[] = [
  // Para connector for email authentication
  paraConnector({
    appName: APP_NAME,
    nameOverride: "Email (Para)",
    // wallets: ["METAMASK","PHANTOM","WALLETCONNECT","COINBASE","RAINBOW","ZERION","SAFE","RABBY","OKX","HAHA","BACKPACK","VALORA","GLOW","SOLFLARE","KEPLR","LEAP","COSMOSTATION"],
    authLayout: ["AUTH:FULL"],
    chains: [base],
    disableEmailLogin: false,
    disablePhoneLogin: true,
    logo: "https://partner-assets.beta.getpara.com/icons/7766a9b6-0afd-477e-9501-313f384e3e19/key-logos/Devconnect%20Project-icon.jpg",
    oAuthMethods: [],
    onRampTestMode: false,
    options: {},
    para,
    queryClient,
    // TEMP: disable recovery secret step
    // recoverySecretStepEnabled: true,
    theme: {
      accentColor: "#0066CC",
      backgroundColor: "#FFFFFF",
      borderRadius: "none",
      darkAccentColor: "#4D9FFF",
      darkBackgroundColor: "#1A1F2B",
      darkForegroundColor: "#E8EBF2",
      font: "Inter",
      foregroundColor: "#2D3648",
      mode: "light",
    },
    twoFactorAuthEnabled: false,
  }) as CreateConnectorFn,
  // Add injected connector explicitly
  injected(),
];

// Create wagmi adapter with all connectors
export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  networks: chains,
  projectId,
  connectors,
});

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: chains as [typeof base, ...typeof base[]],
  defaultNetwork: base,
  projectId,
  metadata,
  enableWallets: true,
  features: {
    analytics: true,
    email: false,
    socials: false,
    emailShowWallets: false,
    onramp: true,
    swaps: true,
    history: true,
    // allWallets: true,
    // multiWallet: true,
    // networkSwitch: true,
    // preferDeepLink: true,
  },
  themeMode: "light",
  enableEIP6963: true, // Enable EIP6963 for better injected wallet detection
  enableInjected: true,
  enableWalletConnect: true,
  enableCoinbase: true,
  allowUnsupportedChain: true,
  // multiWallet: true,
  allWallets: "SHOW", // Show all wallets including injected ones
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
  // Para
  excludeWalletIds: ['82061ee410cab0e705cf38830db84ba965effc51a1e1bf43da6d39ff70ae94fb'],
}); 
