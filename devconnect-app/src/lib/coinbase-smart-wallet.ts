/**
 * Coinbase Server Smart Wallet (v2)
 * 
 * Uses CDP v2 API for smart accounts with:
 * - CDP-managed security (no private keys to manage!)
 * - Gas sponsorship via CDP Paymaster (up to $10k/month in Coinbase credits)
 * - EIP-3009 USDC transfers
 * 
 * Gas Sponsorship on Base Mainnet:
 * Requires CDP_PAYMASTER_URL and contract allowlist configuration.
 * Paymaster must have USDC contract (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
 * and transferWithAuthorization function (0xe3ee160e) in allowlist.
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
function getNetworkId(): 'base' {
  const networkId = process.env.CDP_NETWORK_ID || 'base-mainnet';
  
  // Map to CDP API format
  if (networkId === 'base-mainnet' || networkId === 'base') {
    return 'base';
  }
  
  throw new Error(`Invalid network: ${networkId}. Only 'base-mainnet' is supported.`);
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
  
  // Use fixed names for persistence across restarts
  const OWNER_NAME = `devconnect-owner-base-mainnet`;
  const SMART_ACCOUNT_NAME = `devconnect-smart-base-mainnet`;

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
    console.log('🔄 [CDP] Network: Base Mainnet');

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
  const paymasterUrl = process.env.CDP_PAYMASTER_URL;

  try {
    // Check Paymaster configuration
    if (!paymasterUrl) {
      console.log('⚠️  [CDP] No Paymaster configured!');
      console.log(`   Network: Base Mainnet (CDP API: ${networkId})`);
      console.log(`   Smart Account: ${smartAccount.address}`);
      console.log(`   💸 Gas payment: Smart account will pay (NOT sponsored)`);
      console.log(`   ⚠️  Set CDP_PAYMASTER_URL to enable gas sponsorship`);
    } else {
      console.log('🚀 [CDP] Sending UserOperation with Paymaster sponsorship...');
      console.log(`   Network: Base Mainnet (CDP API: ${networkId})`);
      console.log(`   Smart Account: ${smartAccount.address}`);
      console.log(`   💰 Gas sponsorship: CDP Paymaster (up to $10k/month in credits)`);
      console.log(`   Paymaster URL: ${paymasterUrl.substring(0, 50)}...`);
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

    // Send user operation with Paymaster sponsorship (if configured)
    const sendOptions: any = {
      network: networkId,
      calls,
    };

    // Add paymasterUrl if configured (enables sponsorship)
    if (paymasterUrl) {
      sendOptions.paymasterUrl = paymasterUrl;
    }

    const result = await smartAccount.sendUserOperation(sendOptions);

    console.log('⏳ [CDP] Waiting for confirmation...');
    console.log(`   UserOp Hash: ${result.userOpHash}`);
    console.log(`   Function: transferWithAuthorization (0xe3ee160e)`);
    console.log(`   Target Contract: ${USDC_CONFIG.address}`);

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

    // Log full error details for debugging
    console.error('📋 [CDP] Error Details:', {
      message: errorMsg,
      apiMessage: errorObj?.apiMessage,
      code: errorObj?.code,
      method: errorObj?.method,
    });

    // Handle Paymaster-specific errors
    if (errorMsg.includes('called method not in allowlist') || errorMsg.includes('method not in allowed methods')) {
      const methodSelector = errorMsg.match(/0x[a-fA-F0-9]{8}/)?.[0] || '0xe3ee160e';
      throw new Error(
        '❌ Paymaster Policy Error: Function not allowlisted!\n\n' +
        `The function "${methodSelector}" (transferWithAuthorization) is NOT in your Paymaster allowlist.\n\n` +
        'Fix:\n' +
        '1. Go to https://portal.cdp.coinbase.com/products/bundler-and-paymaster\n' +
        '2. Select "Base Mainnet" network\n' +
        '3. Find USDC contract: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913\n' +
        '4. Click "Add Function" and enter:\n' +
        '   transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)\n' +
        '5. Save and try again\n\n' +
        'OR leave functions empty to allow ALL functions on this contract.'
      );
    }

    if (errorMsg.includes('contract address is not allowed') || errorMsg.includes('target address not in allowed contracts') || errorObj?.apiMessage?.includes('contract address is not allowed')) {
      throw new Error(
        '❌ Paymaster Policy Error: Contract not allowlisted!\n\n' +
        'USDC contract is NOT in your Paymaster allowlist.\n\n' +
        'Fix:\n' +
        '1. Go to https://portal.cdp.coinbase.com/products/bundler-and-paymaster\n' +
        '2. Select "Base Mainnet" network\n' +
        '3. Click "Add" to add contract\n' +
        '4. Enter: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913\n' +
        '5. Add function (optional): transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)\n' +
        '6. Save and try again'
      );
    }

    if (errorMsg.includes('request denied') || errorMsg.includes('denied')) {
      throw new Error(
        '❌ Paymaster Request Denied!\n\n' +
        'Paymaster rejected this transaction. Possible causes:\n' +
        '- Contract not in allowlist\n' +
        '- Function not in allowlist (0xe3ee160e = transferWithAuthorization)\n' +
        '- Spending limits exceeded\n' +
        '- Paymaster not enabled\n\n' +
        'Check CDP Dashboard: https://portal.cdp.coinbase.com/products/bundler-and-paymaster\n' +
        'View logs at: Paymaster → Logs to see rejection reason'
      );
    }

    if (errorMsg.includes('insufficient balance') || errorMsg.includes('sender balance')) {
      const requiredWei = errorMsg.match(/at least (\d+)/)?.[1];
      const requiredEth = requiredWei ? (Number(requiredWei) / 1e18).toFixed(6) : '0.01';
      throw new Error(
        `Smart account needs ETH for EntryPoint collateral. ` +
        `Send ~${requiredEth} ETH to ${smartAccount.address} on Base Mainnet. ` +
        `Even with Paymaster gas sponsorship, smart accounts need ETH for EntryPoint operations.`
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
  console.log('');
  console.log('================================================================================');
  console.log('🎉 SMART ACCOUNT READY!');
  console.log('================================================================================');
  console.log('Smart Account Address:', smartAccount.address);
  console.log('Network: Base Mainnet');
  console.log('');
  console.log('💡 CDP manages keys securely - no manual configuration needed!');
  console.log('   Accounts are retrieved automatically by name on subsequent runs.');
  console.log('');
  console.log('⚠️  Configure CDP_PAYMASTER_URL for gas sponsorship');
  console.log('   See COINBASE_SETUP.md for allowlist configuration');
  console.log('================================================================================');
  console.log('');
  return smartAccount.address;
}
