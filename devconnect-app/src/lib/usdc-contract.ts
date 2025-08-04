import { ethers } from 'ethers';

// USDC contract address on Base
export const USDC_CONTRACT_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
export const USDC_DECIMALS = 6;

// EIP-712 domain for USDC contract
export const USDC_DOMAIN = {
  name: 'USD Coin',
  version: '2',
  chainId: 8453, // Base mainnet
  verifyingContract: USDC_CONTRACT_ADDRESS
};

// EIP-712 types for transferWithAuthorization
export const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' }
  ]
};

// USDC contract ABI for relevant functions
export const USDC_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'transferWithAuthorization',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'authorizationState',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'nonce', type: 'bytes32' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
] as const;

// Parse USDC amount to wei (6 decimals)
export function parseUSDCAmount(amount: string | number): bigint {
  const amountNumber = typeof amount === 'string' ? parseFloat(amount) : amount;
  return BigInt(Math.floor(amountNumber * Math.pow(10, USDC_DECIMALS)));
}

// Format USDC amount from wei to human readable
export function formatUSDCAmount(amountWei: bigint): string {
  const amountNumber = Number(amountWei) / Math.pow(10, USDC_DECIMALS);
  return amountNumber.toFixed(USDC_DECIMALS);
}

// Create USDC contract instance
export function createUSDCContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, signerOrProvider);
}

// Get USDC balance for an address
export async function getUSDCBalance(address: string): Promise<{
  value: bigint;
  formatted: string;
  decimals: number;
}> {
  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org');
  const contract = createUSDCContract(provider);
  
  const balance = await contract.balanceOf(address);
  return {
    value: balance,
    formatted: formatUSDCAmount(balance),
    decimals: USDC_DECIMALS
  };
}

// Generate unique nonce for authorization
export async function generateUniqueNonce(from: string): Promise<string> {
  // For simplicity, we'll use a timestamp-based nonce
  // In production, you might want to use a more sophisticated nonce generation
  const timestamp = Date.now();
  const randomBytes = ethers.randomBytes(16);
  return ethers.keccak256(ethers.concat([
    ethers.toUtf8Bytes(from),
    ethers.toUtf8Bytes(timestamp.toString()),
    randomBytes
  ]));
}

// Check if nonce has been used
export async function isNonceUsed(from: string, nonce: string): Promise<boolean> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org');
    const contract = createUSDCContract(provider);
    
    // For USDC transferWithAuthorization, we need to check if the authorization has been used
    // The authorization state is tracked by the contract internally
    // We'll try to call a view function to check, but if it fails, we'll let the contract handle it
    try {
      // Try to check authorization state - this might not work for all USDC implementations
      const isUsed = await contract.authorizationState(from, from, nonce);
      return isUsed;
    } catch (authError) {
      console.log('Authorization state check failed, letting contract handle validation');
      // If the authorization state check fails, we'll let the contract handle the validation
      // The transferWithAuthorization call will revert if the nonce has already been used
      return false;
    }
  } catch (error) {
    console.error('Error checking nonce usage:', error);
    // If we can't check, assume it's not used to be safe
    return false;
  }
}

// Create EIP-712 message for transferWithAuthorization
export function createTransferAuthorizationMessage(params: {
  from: string;
  to: string;
  value: bigint;
  validAfter: number;
  validBefore: number;
  nonce: string;
}) {
  const { from, to, value, validAfter, validBefore, nonce } = params;
  
  return {
    domain: USDC_DOMAIN,
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    message: {
      from,
      to,
      value,
      validAfter,
      validBefore,
      nonce
    }
  };
} 
