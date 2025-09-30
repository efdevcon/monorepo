import { chains } from './networks';

// Token addresses by network
const tokenAddresses: Record<string, Record<number, string>> = {
  ETH: {
    // 1: '0x0000000000000000000000000000000000000000', // Ethereum mainnet (native)
    // 42161: '0x0000000000000000000000000000000000000000', // Arbitrum (native)
    8453: '0x0000000000000000000000000000000000000000', // Base (native)
    10: '0x0000000000000000000000000000000000000000', // Optimism (native)
    // // 42220: '0xd221812de1bd094f35587ee8e174b07b6167d9af', // Celo (bridged)
    // // 137: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619', // Polygon (bridged)
    // 480: '0x0000000000000000000000000000000000000000', // World Chain (native)
  },
  // https://app.zerion.io/tokens/USDC-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
  // https://zapper.xyz/token/ethereum/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48/USDC/details
  USDC: {
    1: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // Ethereum mainnet
    8453: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // Base
    10: '0x0b2c639c533813f4aa9d7837caf62653d097ff85', // Optimism
    // 42161: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // Arbitrum
    // 42220: '0xceba9300f2b948710d2653dd7b07f33a8b32118c', // Celo
    137: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', // Polygon (native) // bridged: 0x2791bca1f2de4661ed88a30c99a7a9449aa84174
    // 480: '0x79a02482a880bce3f13e09da970dc34db4cd24d1', // World Chain
  },
  // https://app.zerion.io/tokens/USDT-0xdac17f958d2ee523a2206206994597c13d831ec7
  // USDT0: https://zapper.xyz/token/optimism/0x01bff41798a0bcf287b996046ca68b395dbc1071/USD%25E2%2582%25AE0/details
  USDT: {
    // 1: '0xdac17f958d2ee523a2206206994597c13d831ec7', // Ethereum mainnet
    // 8453: '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2', // Base (bridged)
    // 10: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', // Optimism (bridged) // native: 0x01bff41798a0bcf287b996046ca68b395dbc1071
    // 42161: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', // Arbitrum (native)
    // 42220: '0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e', // Celo
    137: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // Polygon (native)
  },
  // wARS: {
  //   480: '0x0dc4f92879b7670e5f4e4e6e3c801d229129d90d', // World Chain only
  // },
};

// Dynamic network names for logo URLs derived from chains
const networkNames: Record<number, string> = chains.reduce((acc, chain) => {
  acc[chain.id] = chain.name.toLowerCase().replace(/\s+/g, '')?.replace('arbitrumone', 'arbitrum')?.replace('opmainnet', 'optimism');
  return acc;
}, {} as Record<number, string>);

// Helper function to get token logo URL
const getTokenLogoUrl = (tokenSymbol: string, chainId: number): string => {
  if (tokenSymbol === 'wARS') {
    return `/images/wARS.png`;
  }

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
    // TODO: remove this once we have more networks
    isDefault: true, // Default token that works with all networks
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    addresses: tokenAddresses.USDT,
  },
  // wARS: {
  //   symbol: 'wARS',
  //   name: 'Wrapped ARS',
  //   decimals: 18,
  //   addresses: tokenAddresses.wARS,
  //   networks: [480], // World Chain only
  // },
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
      // @ts-expect-error: networks is not in all tokens
      return token.networks.includes(chainId as any);
    }
    return token.addresses[chainId] !== undefined;
  });
};

export const getDefaultToken = () => {
  return Object.values(tokens).find(token => 'isDefault' in token && token.isDefault) || tokens.USDC;
};
