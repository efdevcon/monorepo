import { mainnet, base, arbitrum, optimism, celo, polygon, worldchain } from '@reown/appkit/networks';

export const chains = [mainnet, arbitrum, base, celo, optimism, polygon, worldchain];

// Zapper network logos (high quality)
const zapperLogos: Record<number, string> = {
  1: 'https://storage.googleapis.com/zapper-fi-assets/networks/ethereum-icon.png',
  8453: 'https://storage.googleapis.com/zapper-fi-assets/networks/base-icon.png',
  10: 'https://storage.googleapis.com/zapper-fi-assets/networks/optimism-icon.png',
  42161: 'https://storage.googleapis.com/zapper-fi-assets/networks/arbitrum-icon.png',
  42220: 'https://storage.googleapis.com/zapper-fi-assets/networks/celo-icon.png',
  137: 'https://storage.googleapis.com/zapper-fi-assets/networks/polygon-icon.png',
  480: 'https://storage.googleapis.com/zapper-fi-assets/networks/worldchain-icon.png',
};

// Map chain IDs to Alchemy network names
export const CHAIN_ID_TO_ALCHEMY_NETWORK: Record<number, string> = {
  1: 'eth-mainnet',
  8453: 'base-mainnet',
  10: 'opt-mainnet',
  137: 'polygon-mainnet',
  42161: 'arb-mainnet',
};

// Network name to chain ID mapping for API responses
export const networkToChainId: Record<string, number> = {
  'BASE_MAINNET': 8453,
  'ETHEREUM_MAINNET': 1,
  'OPTIMISM_MAINNET': 10,
  'ARBITRUM_MAINNET': 42161,
  'CELO_MAINNET': 42220,
  'POLYGON_MAINNET': 137,
  'WORLDCHAIN_MAINNET': 480,
};

// Create a mapping from chain names to chain IDs using the chains from appkit
export const nameToChainId = chains.reduce((mapping, chain) => {
  // Map various name formats to chain ID
  const nameVariations = [
    chain.name,
    chain.name.toLowerCase(),
    chain.name.replace(' Mainnet', ''),
    chain.name.replace(' Mainnet', '').toLowerCase(),
    // Handle specific cases
    chain.name === 'Ethereum' ? 'ETHEREUM_MAINNET' : null,
    chain.name === 'Base' ? 'BASE_MAINNET' : null,
    chain.name === 'OP Mainnet' ? 'OPTIMISM_MAINNET' : null,
    chain.name === 'Arbitrum One' ? 'ARBITRUM_MAINNET' : null,
    // Map to our preferred display names
    chain.name === 'OP Mainnet' ? 'Optimism' : null,
  ].filter(Boolean);

  nameVariations.forEach(name => {
    if (name) {
      mapping[name] = chain.id;
    }
  });

  return mapping;
}, {} as Record<string, number>);

// Create reverse mapping from chain ID to standardized name
export const chainIdToName = chains.reduce((mapping, chain) => {
  mapping[chain.id] = chain.name;
  return mapping;
}, {} as Record<number, string>);

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
  const config = networkConfig[chainId];
  if (config) {
    // Use our centralized readable name instead of the raw chain name
    return {
      ...config,
      name: getReadableNetworkName(config.name),
    };
  }

  return {
    id: chainId,
    name: `Chain ${chainId}`,
    nativeCurrency: { name: 'Unknown', symbol: 'UNK', decimals: 18 },
    blockExplorers: {},
  };
};

export const getNetworkLogo = (chainId: number) => {
  return zapperLogos[chainId];
};

// Get readable network name from various input formats
export const getReadableNetworkName = (networkName: string): string => {
  // remove comments to use official names
  // // Check exact match first
  // if (nameToChainId[networkName]) {
  //   const chainId = nameToChainId[networkName];
  //   return chainIdToName[chainId];
  // }

  // Check if network name contains keywords (case insensitive)
  const lowerName = networkName.toLowerCase();
  if (lowerName.includes('ethereum') || lowerName.includes('eth')) {
    return 'Ethereum';
  }
  if (lowerName.includes('base')) {
    return 'Base';
  }
  if (lowerName.includes('optimism') || lowerName.includes('op')) {
    return 'Optimism';
  }
  if (lowerName.includes('arbitrum') || lowerName.includes('arb')) {
    return 'Arbitrum';
  }
  if (lowerName.includes('celo')) {
    return 'Celo';
  }
  if (lowerName.includes('polygon') || lowerName.includes('matic')) {
    return 'Polygon PoS';
  }
  if (lowerName.includes('worldchain')) {
    return 'World Chain';
  }

  return networkName;
};

// Get network logo by network name
export const getNetworkLogoByName = (networkName: string): string | undefined => {
  const readableName = getReadableNetworkName(networkName);

  // Find the chain ID for this readable name
  const chainId = Object.entries(chainIdToName).find(([_, name]) => name === readableName)?.[0];

  if (chainId) {
    return getNetworkLogo(parseInt(chainId));
  }

  return undefined;
};

// Get chain ID by network name
export const getChainIdByName = (networkName: string): number | undefined => {
  const readableName = getReadableNetworkName(networkName);
  return Object.entries(chainIdToName).find(([_, name]) => name === readableName)?.[0] ? parseInt(Object.entries(chainIdToName).find(([_, name]) => name === readableName)?.[0] || '0') : undefined;
};

// Convert network name to chain ID with lowercase start comparison
export const convertNetworkToChainId = (networkName: string | number): number => {
  // If already a number, return it
  if (typeof networkName === 'number') {
    return networkName;
  }

  // Check exact match first
  if (networkToChainId[networkName]) {
    return networkToChainId[networkName];
  }

  // Use lowercase start comparison for partial matches
  const lowerName = networkName.toLowerCase();
  if (lowerName.startsWith('base')) {
    return 8453;
  }
  if (lowerName.startsWith('ethereum') || lowerName.startsWith('eth')) {
    return 1;
  }
  if (lowerName.startsWith('optimism') || lowerName.startsWith('op')) {
    return 10;
  }
  if (lowerName.startsWith('arbitrum') || lowerName.startsWith('arb')) {
    return 42161;
  }
  if (lowerName.startsWith('celo')) {
    return 42220;
  }
  if (lowerName.startsWith('polygon') || lowerName.startsWith('matic')) {
    return 137;
  }
  if (lowerName.startsWith('worldchain')) {
    return 480;
  }

  // Try to parse as number
  const parsed = parseInt(networkName);
  return isNaN(parsed) ? 1 : parsed; // Default to Ethereum if unknown
};

