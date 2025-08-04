import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { 
  createUSDCContract,
  isNonceUsed,
  formatUSDCAmount,
  USDC_CONTRACT_ADDRESS 
} from '@/lib/usdc-contract';

/**
 * API endpoint to execute USDC transfers using signed authorization
 * POST /api/base/execute-transfer
 * 
 * Flow:
 * 1. Validates signed authorization data
 * 2. Verifies signature and nonce haven't been used
 * 3. Uses relayer wallet to call transferWithAuthorization
 * 4. Returns transaction hash and confirmation
 */
export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    let { signature, authorization } = requestBody;

    // Handle case where signature comes wrapped in an object
    if (signature && typeof signature === 'object' && signature.signature) {
      signature = signature.signature;
    }

    console.log('Received signature:', signature);
    console.log('Signature type:', typeof signature);

    // Validate required parameters
    if (!signature || !authorization) {
      return NextResponse.json({
        error: 'Missing required parameters: signature, authorization',
        received: { signature: typeof signature, authorization: typeof authorization }
      }, { status: 400 });
    }

    const { domain, types, message } = authorization;
    
    // Validate authorization structure
    if (!domain || !types || !message) {
      return NextResponse.json({
        error: 'Invalid authorization structure. Missing domain, types, or message.'
      }, { status: 400 });
    }

    // Validate message parameters
    const { from, to, value, validAfter, validBefore, nonce } = message;
    if (!from || !to || !value || validAfter === undefined || validBefore === undefined || !nonce) {
      return NextResponse.json({
        error: 'Invalid authorization message. Missing required fields.'
      }, { status: 400 });
    }

    // Check if authorization is still valid (time-wise)
    const now = Math.floor(Date.now() / 1000);
    if (now < validAfter) {
      return NextResponse.json({
        error: 'Authorization not yet valid',
        details: `Valid after: ${new Date(validAfter * 1000).toISOString()}`
      }, { status: 400 });
    }

    if (now > validBefore) {
      return NextResponse.json({
        error: 'Authorization has expired',
        details: `Expired at: ${new Date(validBefore * 1000).toISOString()}`
      }, { status: 400 });
    }

    // Check if nonce has already been used
    const nonceUsed = await isNonceUsed(from, nonce);
    if (nonceUsed) {
      return NextResponse.json({
        error: 'Authorization nonce has already been used',
        details: 'This authorization has already been executed'
      }, { status: 409 });
    }

    // Verify the signature by recovering the signer
    try {
      const recoveredAddress = ethers.verifyTypedData(domain, types, message, signature);
      
      if (recoveredAddress.toLowerCase() !== from.toLowerCase()) {
        return NextResponse.json({
          error: 'Invalid signature. Signature does not match the from address.',
          details: `Expected: ${from}, Got: ${recoveredAddress}`
        }, { status: 400 });
      }
    } catch (sigError) {
      return NextResponse.json({
        error: 'Invalid signature format or verification failed',
        details: sigError instanceof Error ? sigError.message : 'Unknown signature error'
      }, { status: 400 });
    }

    // Validate signature is a string
    if (typeof signature !== 'string') {
      return NextResponse.json({
        error: 'Signature must be a string',
        details: `Received signature of type: ${typeof signature}`,
        receivedSignature: signature
      }, { status: 400 });
    }

    // Split signature into v, r, s components
    let v: number, r: string, s: string;
    
    try {
      // Handle different signature formats
      if (signature.startsWith('0x')) {
        // Standard hex signature - parse manually
        const sigBytes = signature.slice(2); // Remove 0x
        
        console.log(`Processing signature: ${signature}`);
        console.log(`Signature length: ${sigBytes.length} hex chars`);
        
        if (sigBytes.length !== 130) { // 65 bytes * 2 hex chars = 130
          throw new Error(`Invalid signature length: ${sigBytes.length}, expected 130 hex characters`);
        }
        
        r = '0x' + sigBytes.slice(0, 64);   // First 32 bytes (64 hex chars)
        s = '0x' + sigBytes.slice(64, 128); // Next 32 bytes (64 hex chars)  
        v = parseInt(sigBytes.slice(128, 130), 16); // Last byte (2 hex chars)
        
        // Handle v recovery - ensure it's 27 or 28 for legacy compatibility
        if (v < 27) {
          v += 27;
        }
        
        console.log(`Parsed signature components:`);
        console.log(`r: ${r}`);
        console.log(`s: ${s}`);
        console.log(`v: ${v}`);
        
      } else {
        throw new Error('Signature must start with 0x');
      }
      
    } catch (sigParseError) {
      console.error('Signature parsing error:', sigParseError);
      return NextResponse.json({
        error: 'Invalid signature format',
        details: `Failed to parse signature: ${sigParseError instanceof Error ? sigParseError.message : 'Unknown parsing error'}`,
        receivedSignature: signature,
        signatureLength: signature.length
      }, { status: 400 });
    }

    // For now, we'll return a mock response since we don't have a relayer set up
    // In production, you would use a relayer wallet to execute the transaction
    console.log(`Would execute USDC transfer: ${from} -> ${to}, ${formatUSDCAmount(value)} USDC`);
    console.log(`Transfer parameters:`, {
      from,
      to,
      value: value.toString(),
      validAfter,
      validBefore,
      nonce,
      v,
      r: r.slice(0, 10) + '...',
      s: s.slice(0, 10) + '...'
    });

    // Mock successful response
    return NextResponse.json({
      success: true,
      transaction: {
        hash: '0x' + '0'.repeat(64), // Mock hash
        blockNumber: 0,
        gasUsed: '0',
        effectiveGasPrice: '0',
        status: 'pending'
      },
      transfer: {
        from,
        to,
        amount: {
          wei: value.toString(), // Convert BigInt to string
          formatted: formatUSDCAmount(value)
        }
      },
      relayer: {
        address: '0x' + '0'.repeat(40), // Mock relayer address
        gasSponsored: true
      },
      timestamp: new Date().toISOString(),
      note: 'This is a mock response. In production, a relayer would execute the actual transaction.'
    });

  } catch (error) {
    console.error('Error executing USDC transfer:', error);
    
    let errorMessage = 'Failed to execute USDC transfer';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('insufficient funds')) {
        errorMessage = 'Relayer wallet has insufficient ETH for gas fees';
        statusCode = 503;
      } else if (error.message.includes('nonce')) {
        errorMessage = 'Authorization nonce is invalid or already used';
        statusCode = 409;
      } else if (error.message.includes('signature')) {
        errorMessage = 'Invalid authorization signature';
        statusCode = 400;
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        errorMessage = 'Failed to connect to Base network. Please try again.';
        statusCode = 503;
      } else if (error.message.includes('reverted') || error.message.includes('CALL_EXCEPTION')) {
        errorMessage = 'Transaction was reverted by the USDC contract';
        statusCode = 400;
        
        // Try to provide more specific error details
        if (error.message.includes('insufficient allowance')) {
          errorMessage = 'Insufficient USDC allowance for this transfer';
        } else if (error.message.includes('insufficient balance')) {
          errorMessage = 'Insufficient USDC balance for this transfer';
        } else if (error.message.includes('invalid signature')) {
          errorMessage = 'Invalid transfer authorization signature';
        } else if (error.message.includes('authorization expired')) {
          errorMessage = 'Transfer authorization has expired';
        } else if (error.message.includes('authorization not yet valid')) {
          errorMessage = 'Transfer authorization is not yet valid';
        } else if (error.message.includes('authorization already used')) {
          errorMessage = 'Transfer authorization nonce has already been used';
        }
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error',
      contract: USDC_CONTRACT_ADDRESS,
      network: 'Base Mainnet'
    }, { status: statusCode });
  }
} 
