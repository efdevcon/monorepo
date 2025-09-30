import { chains } from './networks';

// Token addresses by network
const tokenAddresses: Record<string, Record<number, string>> = {
  ETH: {
    1: '0x0000000000000000000000000000000000000000', // Ethereum mainnet (native)
    8453: '0x0000000000000000000000000000000000000000', // Base (native)
    10: '0x0000000000000000000000000000000000000000', // Optimism (native)
    42161: '0x0000000000000000000000000000000000000000', // Arbitrum (native)
    42220: '0x0000000000000000000000000000000000000000', // Celo (native)
    137: '0x0000000000000000000000000000000000000000', // Polygon (native)
    480: '0x0000000000000000000000000000000000000000', // World Chain (native)
  },
  USDC: {
    1: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // Ethereum mainnet
    8453: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // Base
    10: '0x0b2c639c533813f4aa9d7837caf62653d097ff85', // Optimism
    42161: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // Arbitrum
    42220: '0xceba9300f2b968710c2658997312cde580ebc9c5', // Celo
    137: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // Polygon
    480: '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1', // World Chain
  },
  USDT: {
    1: '0xdac17f958d2ee523a2206206994597c13d831ec7', // Ethereum mainnet
    8453: '0x50c5725949a6f0c72e6c4a641f24049a917db0cb', // Base
    10: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', // Optimism
    42161: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', // Arbitrum
    42220: '0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e', // Celo
    137: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // Polygon
  },
  wARS: {
    480: '0x0dc4f92879b7670e5f4e4e6e3c801d229129d90d', // World Chain only
  },
};

// Dynamic network names for logo URLs derived from chains
const networkNames: Record<number, string> = chains.reduce((acc, chain) => {
  acc[chain.id] = chain.name.toLowerCase().replace(/\s+/g, '');
  return acc;
}, {} as Record<number, string>);

// Helper function to get token logo URL
const getTokenLogoUrl = (tokenSymbol: string, chainId: number): string => {
  const networkName = networkNames[chainId];
  const tokenAddress = tokenAddresses[tokenSymbol][chainId];
  
  if (!networkName || !tokenAddress) {
    return `https://storage.googleapis.com/zapper-fi-assets/tokens/${tokenSymbol.toLowerCase()}.png`;
  }
  
  return `https://storage.googleapis.com/zapper-fi-assets/tokens/${networkName}/${tokenAddress}.png`;
};

// Token metadata
export const tokens = {
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    addresses: tokenAddresses.ETH,
    isNative: true,
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    addresses: tokenAddresses.USDC,
    isDefault: true, // Default token that works with all networks
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    addresses: tokenAddresses.USDT,
  },
  wARS: {
    symbol: 'wARS',
    name: 'Wrapped ARS',
    decimals: 18,
    addresses: tokenAddresses.wARS,
    networks: [8453], // Base only
  },
} as const;

// Helper functions
export const getTokenAddress = (tokenSymbol: string, chainId: number): string | null => {
  const token = tokens[tokenSymbol as keyof typeof tokens];
  if (!token) return null;
  
  if ('isNative' in token && token.isNative) {
    return '0x0000000000000000000000000000000000000000';
  }
  
  return token.addresses[chainId] || null;
};

export const getTokenLogo = (tokenSymbol: string, chainId: number): string => {
  return getTokenLogoUrl(tokenSymbol, chainId);
};

export const getTokenInfo = (tokenSymbol: string, chainId: number) => {
  const token = tokens[tokenSymbol as keyof typeof tokens];
  if (!token) return null;
  
  return {
    ...token,
    address: getTokenAddress(tokenSymbol, chainId),
    logoUrl: getTokenLogo(tokenSymbol, chainId),
  };
};

export const getSupportedTokens = (chainId: number) => {
  return Object.values(tokens).filter(token => {
    if ('networks' in token && token.networks) {
      return token.networks.includes(chainId as any);
    }
    return token.addresses[chainId] !== undefined;
  });
};

export const getDefaultToken = () => {
  return Object.values(tokens).find(token => 'isDefault' in token && token.isDefault) || tokens.USDC;
};
