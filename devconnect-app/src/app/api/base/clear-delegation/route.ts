import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

/**
 * Clear EIP-7702 delegation using the backend relayer
 * 
 * This endpoint:
 * 1. Receives a signed EIP-7702 authorization from the frontend
 * 2. Uses the backend relayer to execute the transaction
 * 3. Returns the transaction hash
 * 
 * Pattern: EOA signs authorization, relayer executes & pays gas
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { eoaAddress, signedAuthorization } = body;

    console.log('[CLEAR-DELEGATION-API] Request received');
    console.log('[CLEAR-DELEGATION-API] EOA address:', eoaAddress);
    console.log('[CLEAR-DELEGATION-API] Signed authorization:', signedAuthorization);

    // Validate inputs
    if (!eoaAddress || !signedAuthorization) {
      return NextResponse.json({
        error: 'Missing required parameters',
        details: 'eoaAddress and signedAuthorization are required'
      }, { status: 400 });
    }

    // Validate authorization structure
    if (!signedAuthorization.address || 
        signedAuthorization.chainId === undefined ||
        signedAuthorization.nonce === undefined ||
        !signedAuthorization.r ||
        !signedAuthorization.s ||
        signedAuthorization.yParity === undefined) {
      return NextResponse.json({
        error: 'Invalid authorization structure',
        details: 'Authorization must include: address, chainId, nonce, r, s, yParity'
      }, { status: 400 });
    }

    // Check if authorization is to zero address (clearing)
    if (signedAuthorization.address.toLowerCase() !== '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({
        error: 'Invalid authorization address',
        details: 'To clear delegation, authorization must be to zero address (0x0000...0000)'
      }, { status: 400 });
    }

    // Get relayer private key from environment
    const relayerPrivateKey = process.env.PRIVATE_KEY;
    
    if (!relayerPrivateKey) {
      console.error('[CLEAR-DELEGATION-API] Missing PRIVATE_KEY environment variable');
      return NextResponse.json({
        error: 'Server configuration error',
        details: 'Relayer not configured'
      }, { status: 500 });
    }

    // Get RPC URL (use same as execute-transfer)
    const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';

    console.log('[CLEAR-DELEGATION-API] Using RPC:', rpcUrl.includes('alchemy') ? 'Alchemy' : 'Base');

    // Create relayer account
    // Ensure private key has 0x prefix (viem requires this format)
    const formattedPrivateKey = relayerPrivateKey.startsWith('0x') 
      ? relayerPrivateKey 
      : `0x${relayerPrivateKey}`;
    
    const relayerAccount = privateKeyToAccount(formattedPrivateKey as `0x${string}`);
    console.log('[CLEAR-DELEGATION-API] Relayer address:', relayerAccount.address);

    // Create clients
    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    const walletClient = createWalletClient({
      account: relayerAccount,
      chain: base,
      transport: http(rpcUrl),
    });

    // Check relayer balance
    const relayerBalance = await publicClient.getBalance({
      address: relayerAccount.address,
    });

    console.log('[CLEAR-DELEGATION-API] Relayer balance:', relayerBalance.toString(), 'wei');

    if (relayerBalance === BigInt(0)) {
      return NextResponse.json({
        error: 'Relayer has insufficient funds',
        details: `Relayer address ${relayerAccount.address} has 0 ETH`
      }, { status: 500 });
    }

    // Prepare authorization list
    const authList = [{
      address: signedAuthorization.address as `0x${string}`,
      chainId: Number(signedAuthorization.chainId),
      nonce: Number(signedAuthorization.nonce),
      r: signedAuthorization.r as `0x${string}`,
      s: signedAuthorization.s as `0x${string}`,
      yParity: Number(signedAuthorization.yParity) as 0 | 1,
    }];

    console.log('[CLEAR-DELEGATION-API] Authorization list prepared');
    console.log('[CLEAR-DELEGATION-API] Sending transaction with authorizationList...');

    // Relayer sends transaction with EOA's authorization
    // This is the proper EIP-7702 pattern: EOA signs, relayer executes
    const txHash = await walletClient.sendTransaction({
      account: relayerAccount, // Relayer account executes and pays gas
      to: eoaAddress as `0x${string}`, // Send to EOA
      value: BigInt(0), // 0 value
      data: '0x', // Empty data
      authorizationList: authList as any, // EOA's signed authorization to zero address
    });

    console.log('[CLEAR-DELEGATION-API] Transaction sent:', txHash);
    console.log('[CLEAR-DELEGATION-API] Waiting for confirmation...');

    // Wait for transaction to be mined
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash: txHash,
      timeout: 30000, // 30 second timeout
    });

    if (receipt.status === 'success') {
      console.log('[CLEAR-DELEGATION-API] ✅ Delegation cleared successfully!');
      console.log('[CLEAR-DELEGATION-API] Block:', receipt.blockNumber);
      console.log('[CLEAR-DELEGATION-API] Gas used:', receipt.gasUsed.toString());

      return NextResponse.json({
        success: true,
        txHash,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        message: 'EIP-7702 delegation cleared successfully'
      });
    } else {
      console.error('[CLEAR-DELEGATION-API] Transaction failed');
      return NextResponse.json({
        error: 'Transaction failed',
        txHash,
        details: 'Transaction was mined but failed. Check block explorer for details.'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[CLEAR-DELEGATION-API] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      error: 'Failed to clear delegation',
      details: errorMessage
    }, { status: 500 });
  }
}

