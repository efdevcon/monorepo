"use client";

import { paraConnector } from "@getpara/wagmi-v2-integration";
import { para } from "./para";
import { APP_NAME, APP_CONFIG } from "./config";
import { queryClient } from "@/context/QueryProvider";
import { createConfig, CreateConfigParameters, http, cookieStorage, createStorage } from "wagmi";
import { coinbaseWallet, injected, metaMask, walletConnect } from "wagmi/connectors";
import { base } from "wagmi/chains";

const WALLET_CONNECT_PROJECT_ID = APP_CONFIG.WC_PROJECT_ID;
const BASE_RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";

if (!WALLET_CONNECT_PROJECT_ID) {
  throw new Error("NEXT_PUBLIC_WC_PROJECT_ID is not set");
}

const connector = paraConnector({
  appName: APP_NAME,
  authLayout: ["AUTH:FULL", "EXTERNAL:FULL"],
  chains: [base],
  disableEmailLogin: false,
  disablePhoneLogin: true,
  logo: "https://partner-assets.beta.getpara.com/icons/7766a9b6-0afd-477e-9501-313f384e3e19/key-logos/Devconnect%20Project-icon.jpg",
  oAuthMethods: [],
  onRampTestMode: true,
  options: {},
  para,
  queryClient,
  recoverySecretStepEnabled: true,
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
});

const config = {
  chains: [base],
  connectors: [
    connector,
    walletConnect({
      projectId: WALLET_CONNECT_PROJECT_ID,
    }),
    injected(),
    metaMask(),
    coinbaseWallet(),
  ],
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
  transports: {
    [base.id]: http(BASE_RPC_URL),
  },
} as CreateConfigParameters;

export const wagmiConfig = createConfig(config); 
