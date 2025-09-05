import { chains } from './appkit';

// Zapper network logos (high quality)
const zapperLogos: Record<number, string> = {
  1: 'https://storage.googleapis.com/zapper-fi-assets/networks/ethereum-icon.png',
  8453: 'https://storage.googleapis.com/zapper-fi-assets/networks/base-icon.png',
  10: 'https://storage.googleapis.com/zapper-fi-assets/networks/optimism-icon.png',
  42161: 'https://storage.googleapis.com/zapper-fi-assets/networks/arbitrum-icon.png',
};



// Dynamic network configuration based on chains from appkit
export const networkConfig = chains.reduce((config, chain) => {
  config[chain.id] = {
    id: chain.id,
    name: chain.name,
    logoUrl: zapperLogos[chain.id],
    nativeCurrency: chain.nativeCurrency,
    blockExplorers: chain.blockExplorers,
  };
  return config;
}, {} as Record<number, {
  id: number;
  name: string;
  logoUrl?: string;
  nativeCurrency: any;
  blockExplorers: any;
}>);

// Helper functions
export const getNetworkConfig = (chainId: number) => {
  return networkConfig[chainId] || {
    id: chainId,
    name: `Chain ${chainId}`,
    nativeCurrency: { name: 'Unknown', symbol: 'UNK', decimals: 18 },
    blockExplorers: {},
  };
};

export const getNetworkLogo = (chainId: number) => {
  return zapperLogos[chainId];
};

// Export the chains for convenience
export { chains };
