import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { CreateConnectorFn } from "wagmi";
import { mainnet } from "wagmi/chains";
import { injected, metaMask, walletConnect } from "wagmi/connectors";

export const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'your-project-id';

const metadata = {
  name: "Devconnect Perks",
  description: "Devconnect ARG",
  url: process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : process.env.NEXT_PUBLIC_APP_URL || "https://devconnect.org",
  icons: ["https://devconnect.org/favicon.ico"],
};

// Configure connectors
const connectors: CreateConnectorFn[] = [
  injected(),
//   metaMask(),
//   walletConnect({
//     projectId,
//   }),
];

// Create wagmi adapter with all connectors
export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  networks: [mainnet],
  projectId,
  connectors,
});

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [mainnet],
  projectId,
  metadata,
  features: {
    analytics: true,
    email: false,
    socials: false,
    emailShowWallets: false,
  },
  themeMode: "light",
  enableEIP6963: true, // Enable EIP6963 for better injected wallet detection
  enableInjected: true,
  enableWalletConnect: true,
  enableCoinbase: true,
  allowUnsupportedChain: true,
  allWallets: "SHOW", // Show all wallets including injected ones
  featuredWalletIds: [
    // MetaMask
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
    // Coinbase Wallet
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa',
    // Rainbow
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369',
    // Zerion
    'ecc4036f814562b41a5268adc86270fba1365471402006302e70169465b7ac18',
  ],
}); 