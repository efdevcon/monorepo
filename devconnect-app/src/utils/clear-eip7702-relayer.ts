import { Hash, createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import type { ParaWeb } from '@getpara/react-sdk';
import { customSignAuthorization } from '@/lib/para-signature-utils';

/**
 * Clear EIP-7702 delegation using the BACKEND RELAYER
 * This is the proper EIP-7702 pattern: EOA signs, backend relayer executes
 * 
 * Flow:
 * 1. Frontend: EOA signs authorization to zero address
 * 2. Frontend: Sends signed authorization to backend
 * 3. Backend: Relayer executes transaction and pays gas
 * 4. Frontend: Receives transaction hash
 */
export async function clearEIP7702WithRelayer(
  para: ParaWeb,
  eoaAddress: string,
  viemAccount: any,
  rpcUrl: string = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || 'https://mainnet.base.org'
): Promise<Hash> {
  
  console.log('[CLEAR-7702-RELAYER] Starting backend relayer-based clearing...');
  console.log('🔄 [CLEAR-7702-RELAYER] EOA address:', eoaAddress);
  console.log('💡 [CLEAR-7702-RELAYER] Using backend relayer (no ETH needed in EOA!)');

  if (!viemAccount) {
    throw new Error('Para Viem account not available for signing');
  }

  // Create public client for nonce lookup
  const publicClient = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  // Step 1: Get the EOA's current transaction nonce
  console.log('🔄 [CLEAR-7702-RELAYER] Fetching EOA nonce...');
  const eoaNonce = await publicClient.getTransactionCount({
    address: eoaAddress as `0x${string}`,
  });
  
  console.log('🔄 [CLEAR-7702-RELAYER] EOA nonce:', eoaNonce);

  // Step 2: EOA signs authorization to zero address (clears delegation)
  console.log('🔄 [CLEAR-7702-RELAYER] EOA signing authorization to zero address...');
  
  const authorization = {
    address: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    chainId: 8453, // Base mainnet
    nonce: eoaNonce,
  };

  const signedAuth = await customSignAuthorization(para, authorization);
  
  console.log('✅ [CLEAR-7702-RELAYER] EOA authorization signed successfully');
  console.log('🔍 [CLEAR-7702-RELAYER] Signed authorization:', {
    address: signedAuth.address,
    chainId: signedAuth.chainId,
    nonce: signedAuth.nonce,
    yParity: signedAuth.yParity,
  });

  // Step 3: Send signed authorization to backend for relayer execution
  console.log('🔄 [CLEAR-7702-RELAYER] Sending to backend relayer...');
  console.log('💰 [CLEAR-7702-RELAYER] Backend relayer will pay gas fees');

  try {
    const response = await fetch('/api/base/clear-delegation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eoaAddress,
        signedAuthorization: {
          address: signedAuth.address,
          chainId: Number(signedAuth.chainId),
          nonce: Number(signedAuth.nonce),
          r: signedAuth.r,
          s: signedAuth.s,
          yParity: Number(signedAuth.yParity),
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ [CLEAR-7702-RELAYER] Backend error:', errorData);
      throw new Error(errorData.details || errorData.error || 'Backend relayer failed');
    }

    const data = await response.json();
    
    console.log('✅ [CLEAR-7702-RELAYER] Backend relayer executed successfully!');
    console.log('🎉 Transaction hash:', data.txHash);
    console.log('📦 Block:', data.blockNumber);
    console.log('⛽ Gas used:', data.gasUsed);
    console.log('💰 Gas paid by backend relayer, EOA needed 0 ETH!');

    return data.txHash as Hash;

  } catch (error: any) {
    console.error('❌ [CLEAR-7702-RELAYER] Failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Backend relayer failed: ${errorMessage}`);
  }
}

