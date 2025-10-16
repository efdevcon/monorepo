/**
 * Coinbase Server Smart Wallet (v2)
 * 
 * Uses CDP v2 API for smart accounts with:
 * - CDP-managed security (no private keys to manage!)
 * - Gas sponsorship via Paymaster
 * - EIP-3009 USDC transfers
 */

import { CdpClient } from '@coinbase/cdp-sdk';
import { base } from 'viem/chains';
import { encodeFunctionData } from 'viem';

// USDC Contract Configuration (Base Mainnet)
const USDC_CONFIG = {
  address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const,
  decimals: 6,
  chainId: 8453,
} as const;

// EIP-3009 transferWithAuthorization ABI
const TRANSFER_WITH_AUTH_ABI = [
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    name: 'transferWithAuthorization',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

let cdpClient: CdpClient | null = null;
let smartAccountInstance: any | null = null;

/**
 * Initialize CDP client (v2)
 */
function getCdpClient(): CdpClient {
  if (cdpClient) return cdpClient;

  const apiKeyId = process.env.CDP_API_KEY_ID;
  const apiKeySecret = process.env.CDP_API_KEY_SECRET;
  const walletSecret = process.env.CDP_WALLET_SECRET;

  if (!apiKeyId || !apiKeySecret || !walletSecret) {
    throw new Error(
      'Missing CDP credentials. Set CDP_API_KEY_ID, CDP_API_KEY_SECRET, and CDP_WALLET_SECRET'
    );
  }

  cdpClient = new CdpClient({
    apiKeyId,
    apiKeySecret,
    walletSecret,
  });

  console.log('✅ [CDP] v2 Client initialized');
  return cdpClient;
}

/**
 * Get network ID from env and map to CDP API format
 */
function getNetworkId(): 'base' | 'base-sepolia' {
  const networkId = process.env.CDP_NETWORK_ID || 'base-sepolia';
  
  // Map to CDP API format
  if (networkId === 'base-mainnet') {
    return 'base';
  } else if (networkId === 'base-sepolia') {
    return 'base-sepolia';
  }
  
  throw new Error(`Invalid network: ${networkId}. Use 'base-mainnet' or 'base-sepolia'`);
}

/**
 * EIP-3009 Authorization
 */
export interface EIP3009Authorization {
  from: string;
  to: string;
  value: string | bigint;
  validAfter: number | bigint;
  validBefore: number | bigint;
  nonce: string;
  v: number;
  r: string;
  s: string;
}

/**
 * Transfer Result
 */
export interface TransferResult {
  transactionHash: string;
  transactionLink: string;
  status: 'pending' | 'complete' | 'failed';
  from: string;
  to: string;
  amount: string;
  gasSponsored: boolean;
  relayerAddress: string;
}

/**
 * Get or create smart account (v2)
 * Uses persistent names so CDP can retrieve existing accounts
 */
async function getOrCreateSmartAccount(): Promise<any> {
  if (smartAccountInstance) return smartAccountInstance;

  const cdp = getCdpClient();
  const networkId = getNetworkId();
  const envNetwork = process.env.CDP_NETWORK_ID || 'base-sepolia';
  
  // Use fixed names for persistence across restarts
  const OWNER_NAME = `devconnect-owner-${envNetwork}`;
  const SMART_ACCOUNT_NAME = `devconnect-smart-${envNetwork}`;

  try {
    // Get or create owner account with persistent name
    const owner = await cdp.evm.getOrCreateAccount({ name: OWNER_NAME });
    console.log('🔄 [CDP] Owner account:', owner.address);

    // Get or create smart account with persistent name
    const smartAccount = await cdp.evm.getOrCreateSmartAccount({ 
      name: SMART_ACCOUNT_NAME,
      owner 
    });
    
    console.log('🔄 [CDP] Using smart account:', smartAccount.address);

    smartAccountInstance = smartAccount;
    return smartAccount;
  } catch (error) {
    console.error('❌ [CDP] Failed to get/create smart account:', error);
    throw error;
  }
}

/**
 * Execute USDC transfer using EIP-3009 authorization via CDP v2
 */
export async function executeUSDCTransferWithAuth(
  auth: EIP3009Authorization
): Promise<TransferResult> {
  console.log('🔄 [CDP] Executing USDC transfer via Smart Account...');
  console.log(`   From: ${auth.from}`);
  console.log(`   To: ${auth.to}`);
  console.log(`   Amount: ${auth.value} USDC (raw)`);

  const cdp = getCdpClient();
  const smartAccount = await getOrCreateSmartAccount();
  const networkId = getNetworkId();
  const envNetwork = process.env.CDP_NETWORK_ID || 'base-sepolia';
  const paymasterUrl = process.env.CDP_PAYMASTER_URL;

  try {
    console.log('🚀 [CDP] Sending UserOperation with Paymaster...');
    console.log(`   Network: ${envNetwork} (CDP API: ${networkId})`);
    console.log(`   Smart Account: ${smartAccount.address}`);
    if (paymasterUrl) {
      console.log(`   Paymaster: ${paymasterUrl.substring(0, 50)}...`);
    }

    // Prepare call data for transferWithAuthorization
    const callData = encodeFunctionData({
      abi: TRANSFER_WITH_AUTH_ABI,
      functionName: 'transferWithAuthorization',
      args: [
        auth.from as `0x${string}`,
        auth.to as `0x${string}`,
        BigInt(auth.value),
        BigInt(auth.validAfter),
        BigInt(auth.validBefore),
        auth.nonce as `0x${string}`,
        auth.v,
        auth.r as `0x${string}`,
        auth.s as `0x${string}`,
      ],
    });

    const calls = [
      {
        to: USDC_CONFIG.address as `0x${string}`,
        value: BigInt(0),
        data: callData,
      },
    ];

    // Send user operation (CDP v2 API)
    const result = await cdp.evm.sendUserOperation({
      smartAccount,
      network: networkId, // 'base' or 'base-sepolia'
      calls,
      ...(paymasterUrl && { paymasterUrl }),
    });

    console.log('⏳ [CDP] Waiting for confirmation...');
    console.log(`   UserOp Hash: ${result.userOpHash}`);

    // Wait for transaction
    const userOp = await smartAccount.waitForUserOperation({
      userOpHash: result.userOpHash,
    });

    console.log('✅ [CDP] UserOperation confirmed!');
    console.log(`   Status: ${userOp.status}`);

    if (userOp.status === 'complete' && userOp.transactionHash) {
      console.log(`   Transaction: ${userOp.transactionHash}`);
      const amountStr = typeof auth.value === 'bigint' ? auth.value.toString() : auth.value;
      
      return {
        transactionHash: userOp.transactionHash,
        transactionLink: `${base.blockExplorers.default.url}/tx/${userOp.transactionHash}`,
        status: 'complete',
        from: auth.from,
        to: auth.to,
        amount: amountStr,
        gasSponsored: true,
        relayerAddress: smartAccount.address,
      };
    } else {
      throw new Error(`UserOperation failed with status: ${userOp.status}`);
    }
  } catch (error) {
    console.error('❌ [CDP] UserOperation failed:', error);

    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorObj = error as any;

    // Handle specific errors
    if (errorMsg.includes('contract address is not allowed') || errorObj?.apiMessage?.includes('contract address is not allowed')) {
      throw new Error(
        'Gas policy error: USDC contract not allowlisted. ' +
        'Add 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 to your gas policy at https://portal.cdp.coinbase.com/products/bundler-and-paymaster'
      );
    }

    if (errorMsg.includes('insufficient balance') || errorMsg.includes('sender balance')) {
      const requiredWei = errorMsg.match(/at least (\d+)/)?.[1];
      const requiredEth = requiredWei ? (Number(requiredWei) / 1e18).toFixed(6) : '0.01';
      throw new Error(
        `Smart account needs ETH for gas. ` +
        `Send ~${requiredEth} ETH to ${smartAccount.address} on Base ${envNetwork === 'base-mainnet' ? 'mainnet' : 'testnet'}. ` +
        `Even with Paymaster, smart accounts need initial ETH for deployment/operations.`
      );
    }

    if (errorMsg.includes('authorization is not yet valid') || errorMsg.includes('authorization is expired')) {
      throw new Error('Transfer authorization timestamp invalid (expired or not yet valid).');
    }

    if (errorMsg.includes('authorization is used or canceled')) {
      throw new Error('Authorization nonce already used or invalid.');
    }

    throw error;
  }
}

/**
 * Get smart account address
 */
export async function getSmartWalletAddress(): Promise<string> {
  const smartAccount = await getOrCreateSmartAccount();
  const envNetwork = process.env.CDP_NETWORK_ID || 'base-sepolia';
  console.log('');
  console.log('================================================================================');
  console.log('🎉 SMART ACCOUNT READY!');
  console.log('================================================================================');
  console.log('Smart Account Address:', smartAccount.address);
  console.log('Network:', envNetwork);
  console.log('');
  console.log('💡 CDP manages keys securely - no manual configuration needed!');
  console.log('   Accounts are retrieved automatically by name on subsequent runs.');
  console.log('================================================================================');
  console.log('');
  return smartAccount.address;
}
