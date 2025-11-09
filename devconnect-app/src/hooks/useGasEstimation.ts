import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/context/WalletContext';
import { APP_CONFIG } from '@/config/config';
import { getTokenAddress } from '@/config/tokens';
import { CHAIN_ID_TO_ALCHEMY_NETWORK, getNetworkConfig } from '@/config/networks';
import { encodeFunctionData, parseUnits } from 'viem';

// ERC20 Transfer ABI
const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

interface GasEstimation {
  gasLimit: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  estimatedCostWei: bigint;
  estimatedCostNative: string; // Amount in native token (ETH, POL, etc.)
  nativeTokenSymbol: string; // Symbol of native token
  estimatedCostUsd: string | null;
}

interface UseGasEstimationReturn {
  gasEstimation: GasEstimation | null;
  loading: boolean;
  error: string | null;
  estimateGas: (
    recipient: string,
    amount: string,
    token: string,
    chainId: number
  ) => Promise<void>;
}

// Native token to USD price cache
const priceCache: { [key: string]: { price: number; timestamp: number } } = {};
const PRICE_CACHE_DURATION = 60000; // 1 minute

// Map chain IDs to CoinGecko token IDs
const CHAIN_TO_COINGECKO_ID: Record<number, string> = {
  1: 'ethereum',      // Ethereum
  8453: 'ethereum',   // Base (uses ETH)
  10: 'ethereum',     // Optimism (uses ETH)
  42161: 'ethereum',  // Arbitrum (uses ETH)
  137: 'polygon-ecosystem-token',     // Polygon (uses POL)
  42220: 'celo',      // Celo (uses CELO)
  84532: 'ethereum',  // Base Sepolia (uses ETH)
};

async function getNativeTokenPrice(chainId: number): Promise<number | null> {
  const coingeckoId = CHAIN_TO_COINGECKO_ID[chainId] || 'ethereum';
  
  // Check cache first
  if (priceCache[coingeckoId] && Date.now() - priceCache[coingeckoId].timestamp < PRICE_CACHE_DURATION) {
    console.log(`[Price] Using cached price for ${coingeckoId}: $${priceCache[coingeckoId].price}`);
    return priceCache[coingeckoId].price;
  }

  try {
    // Use CoinGecko's public API (no key required)
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`;
    console.log(`[Price] Fetching price for ${coingeckoId}:`, url);
    const response = await fetch(url);
    const data = await response.json();
    console.log(`[Price] CoinGecko response for ${coingeckoId}:`, data);
    const price = data[coingeckoId]?.usd;
    
    if (price) {
      console.log(`[Price] Got price for ${coingeckoId}: $${price}`);
      priceCache[coingeckoId] = { price, timestamp: Date.now() };
      return price;
    }
    console.warn(`[Price] No price data for ${coingeckoId} in response:`, data);
    return null;
  } catch (error) {
    console.error(`[Price] Failed to fetch ${coingeckoId} price:`, error);
    return null;
  }
}

export function useGasEstimation(): UseGasEstimationReturn {
  const { address } = useWallet();
  const [gasEstimation, setGasEstimation] = useState<GasEstimation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estimateGas = useCallback(
    async (recipient: string, amount: string, token: string, chainId: number) => {
      if (!address) {
        setError('Wallet not connected');
        return;
      }

      if (!APP_CONFIG.ALCHEMY_APIKEY) {
        setError('Alchemy API key not configured');
        return;
      }

      const alchemyNetwork = CHAIN_ID_TO_ALCHEMY_NETWORK[chainId];

      if (!alchemyNetwork) {
        console.error(`[Gas Estimation] Unsupported chain ID: ${chainId}`);
        setError(`Unsupported chain ID: ${chainId}`);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const rpcUrl = `https://${alchemyNetwork}.g.alchemy.com/v2/${APP_CONFIG.ALCHEMY_APIKEY}`;
        console.log(`[Gas Estimation] Estimating gas for ${token} on chain ${chainId} (${alchemyNetwork})`);

        // Get token address - null/0x0 means native token (ETH, MATIC, etc.)
        const tokenAddress = getTokenAddress(token, chainId);
        const isNativeToken = !tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000';

        let gasLimit: bigint;
        
        if (isNativeToken) {
          // For native tokens, estimate a simple ETH transfer
          const amountWei = parseUnits(amount, 18); // Native tokens use 18 decimals
          
          const gasEstimateResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_estimateGas',
              params: [
                {
                  from: address,
                  to: recipient,
                  value: '0x' + amountWei.toString(16), // Convert to hex string
                },
              ],
              id: 1,
            }),
          });

          const gasEstimateData = await gasEstimateResponse.json();

          if (gasEstimateData.error) {
            // If estimation fails due to insufficient balance,
            // use a reasonable default for native token transfers
            const errorMessage = gasEstimateData.error.message || '';
            if (errorMessage.includes('insufficient') || errorMessage.includes('exceeds balance')) {
              console.warn('Gas estimation failed due to balance, using default estimate');
              gasLimit = BigInt(21000); // Standard ETH transfer gas limit
            } else {
              throw new Error(errorMessage || 'Gas estimation failed');
            }
          } else {
            gasLimit = BigInt(gasEstimateData.result);
          }
        } else {
          // For ERC20 tokens, estimate token transfer
          // Get token decimals (most stablecoins use 6, but we'll check)
          const decimalsResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_call',
              params: [
                {
                  to: tokenAddress,
                  data: '0x313ce567', // decimals() function selector
                },
                'latest',
              ],
              id: 1,
            }),
          });

          const decimalsData = await decimalsResponse.json();
          const decimals = parseInt(decimalsData.result || '0x12', 16); // Default to 18 if not found

          // Parse amount with correct decimals
          const amountWei = parseUnits(amount, decimals);

          // Encode transfer function data
          const transferData = encodeFunctionData({
            abi: ERC20_TRANSFER_ABI,
            functionName: 'transfer',
            args: [recipient as `0x${string}`, amountWei],
          });

          // Estimate gas using eth_estimateGas
          const gasEstimateResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_estimateGas',
              params: [
                {
                  from: address,
                  to: tokenAddress,
                  data: transferData,
                },
              ],
              id: 1,
            }),
          });

          const gasEstimateData = await gasEstimateResponse.json();

          if (gasEstimateData.error) {
            // If estimation fails due to insufficient balance or other reasons,
            // use a reasonable default for ERC20 transfers
            const errorMessage = gasEstimateData.error.message || '';
            if (errorMessage.includes('insufficient') || errorMessage.includes('exceeds balance')) {
              console.warn('Gas estimation failed due to balance, using default estimate');
              gasLimit = BigInt(65000); // Typical ERC20 transfer gas limit
            } else {
              throw new Error(errorMessage || 'Gas estimation failed');
            }
          } else {
            gasLimit = BigInt(gasEstimateData.result);
          }
        }

        // Get current gas price data using eth_feeHistory (EIP-1559)
        const feeHistoryResponse = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_feeHistory',
            params: [
              '0x1', // 1 block
              'latest',
              [50], // 50th percentile priority fee
            ],
            id: 1,
          }),
        });

        const feeHistoryData = await feeHistoryResponse.json();

        // Parse fee data
        const baseFeePerGas = BigInt(
          feeHistoryData.result?.baseFeePerGas?.[1] || '0x0'
        );
        const priorityFeePerGas = BigInt(
          feeHistoryData.result?.reward?.[0]?.[0] || '0x0'
        );

        // Calculate maxFeePerGas (base fee * 2 + priority fee for buffer)
        const maxFeePerGas = baseFeePerGas * BigInt(2) + priorityFeePerGas;
        const maxPriorityFeePerGas = priorityFeePerGas;

        // Get native token symbol from network config
        const networkConfig = getNetworkConfig(chainId);
        const nativeTokenSymbol = networkConfig.nativeCurrency?.symbol || 'ETH';

        // Calculate estimated cost
        const estimatedCostWei = gasLimit * maxFeePerGas;
        const estimatedCostNative = (
          Number(estimatedCostWei) / 1e18
        ).toFixed(8);

        // Get native token price for USD conversion
        const nativePrice = await getNativeTokenPrice(chainId);
        console.log(`[Gas Estimation] Native token price for chain ${chainId}: $${nativePrice}`);
        let estimatedCostUsd: string | null = null;
        if (nativePrice) {
          const usdAmount = parseFloat(estimatedCostNative) * nativePrice;
          // Show "<$0.001" for very small amounts, otherwise show actual value
          if (usdAmount < 0.001) {
            estimatedCostUsd = '<0.001';
          } else if (usdAmount < 0.01) {
            estimatedCostUsd = usdAmount.toFixed(4);
          } else {
            estimatedCostUsd = usdAmount.toFixed(3);
          }
          console.log(`[Gas Estimation] Estimated cost: ${estimatedCostNative} ${nativeTokenSymbol} = $${estimatedCostUsd} USD`);
        } else {
          console.warn(`[Gas Estimation] Could not get price for chain ${chainId}, falling back to native token display`);
        }

        setGasEstimation({
          gasLimit,
          maxFeePerGas,
          maxPriorityFeePerGas,
          estimatedCostWei,
          estimatedCostNative,
          nativeTokenSymbol,
          estimatedCostUsd,
        });
      } catch (err) {
        console.error(`[Gas Estimation] Failed for chain ${chainId}:`, err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  return {
    gasEstimation,
    loading,
    error,
    estimateGas,
  };
}

