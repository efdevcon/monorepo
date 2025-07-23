"use client";

import { ParaProvider as Provider } from "@getpara/react-sdk";
import { Environment } from "@getpara/react-sdk";
import { base } from "wagmi/chains";

const API_KEY = process.env.NEXT_PUBLIC_PARA_API_KEY ?? "";
const ENVIRONMENT = (process.env.NEXT_PUBLIC_PARA_ENVIRONMENT as Environment) || Environment.BETA;

if (!API_KEY) {
  throw new Error(
    "API key is not defined. Please set NEXT_PUBLIC_PARA_API_KEY in your environment variables."
  );
}

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
        wallets: ["METAMASK", "COINBASE", "WALLETCONNECT", "RAINBOW", "ZERION", "RABBY"],
        createLinkedEmbeddedForExternalWallets: ["METAMASK"],
        evmConnector: {
          config: {
            chains: [base],
          },
        },
        walletConnect: {
          projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "",
        },
      }}
      config={{ appName: "Devconnect App" }}
      paraModalConfig={{
        disableEmailLogin: false,
        disablePhoneLogin: true,
        authLayout: ["AUTH:FULL"],
        oAuthMethods: [],
        onRampTestMode: true,
        theme: {
          foregroundColor: "#2D3648",
          backgroundColor: "#FFFFFF",
          accentColor: "#0066CC",
          darkForegroundColor: "#E8EBF2",
          darkBackgroundColor: "#1A1F2B",
          darkAccentColor: "#4D9FFF",
          mode: "light",
          borderRadius: "none",
          font: "Inter",
        },
        recoverySecretStepEnabled: true,
        twoFactorAuthEnabled: false,
      }}>
      {children}
    </Provider>
  );
} 
