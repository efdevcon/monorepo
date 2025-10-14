import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { 
  createUSDCContract,
  isNonceUsed,
  formatUSDCAmount,
  USDC_CONTRACT_ADDRESS 
} from '@/lib/usdc-contract';
import { AUTHORIZED_SPONSOR_ADDRESSES } from '@/config/config';
import { validateSponsorshipPolicy } from '@/config/sponsor-policy';

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

    // ⭐ NEW: Validate sponsorship policy
    console.log('🔒 [POLICY] Validating sponsorship policy...');
    const policyCheck = validateSponsorshipPolicy(from, BigInt(value), USDC_CONTRACT_ADDRESS);
    if (!policyCheck.allowed) {
      console.log('❌ [POLICY] Policy violation:', policyCheck.reason);
      return NextResponse.json({
        error: 'Sponsorship policy violation',
        details: policyCheck.reason,
        policy: {
          reason: policyCheck.reason,
          action: 'Transaction rejected'
        }
      }, { status: 403 });
    }
    console.log('✅ [POLICY] Policy checks passed');

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

    // Get private key from environment and check wallet authorization
    const privateKey = process.env.PRIVATE_KEY;

    // Check if we have private key and the 'from' address matches any authorized sponsor
    const hasPrivateKey = !!privateKey;
    const isCorrectWallet = AUTHORIZED_SPONSOR_ADDRESSES.some(
      address => address.toLowerCase() === from.toLowerCase()
    );

    if (!hasPrivateKey || !isCorrectWallet) {
      // Simulation mode - either no private key or unauthorized wallet
      const reason = !hasPrivateKey ? 'no private key available' : 'wallet not authorized';
      console.log(`${reason}, generating simulation transaction`);

      // Create provider for simulation
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org');

      // Create a dummy wallet for simulation (this won't actually execute)
      const dummyWallet = new ethers.Wallet(ethers.hexlify(ethers.randomBytes(32)), provider);

      console.log(`Simulation mode - Dummy wallet address: ${dummyWallet.address}`);
      console.log(`Simulating USDC transfer: ${from} -> ${to}, ${formatUSDCAmount(value)} USDC`);

      // Create USDC contract instance for simulation
      const usdcContract = createUSDCContract(dummyWallet);

      // Estimate gas for the transaction
      let gasEstimate: bigint;
      try {
        gasEstimate = await usdcContract.transferWithAuthorization.estimateGas(
          from,
          to,
          value,
          validAfter,
          validBefore,
          nonce,
          v,
          r,
          s
        );
        console.log(`Simulation - Estimated gas: ${gasEstimate.toString()}`);
      } catch (gasError) {
        console.error('Simulation - Gas estimation failed:', gasError);
        return NextResponse.json({
          error: 'Transaction would fail - gas estimation failed',
          details: gasError instanceof Error ? gasError.message : 'Unable to estimate gas',
          possibleCauses: [
            'Insufficient USDC balance',
            'Invalid signature',
            'Nonce already used',
            'Authorization expired'
          ]
        }, { status: 400 });
      }

      // Get current gas price data
      const feeData = await provider.getFeeData();
      const maxFeePerGas = feeData.maxFeePerGas || ethers.parseUnits('0.1', 'gwei');
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits('0.05', 'gwei');

      // Calculate estimated cost using max fee per gas
      const estimatedCost = gasEstimate * maxFeePerGas;

      console.log(`Simulation completed - Estimated gas: ${gasEstimate.toString()}`);
      console.log(`Estimated cost: ${ethers.formatEther(estimatedCost)} ETH`);

      const simulationReason = !hasPrivateKey
        ? 'No PRIVATE_KEY configured'
        : `Wallet ${from} is not authorized. Only authorized sponsor addresses can execute real transactions.`;

      return NextResponse.json({
        success: true,
        simulation: true,
        transaction: {
          hash: '0x' + '0'.repeat(64), // Dummy hash for simulation
          blockNumber: 0,
          gasUsed: gasEstimate.toString(),
          effectiveGasPrice: maxFeePerGas.toString(),
          status: 'simulation'
        },
        transfer: {
          from,
          to,
          amount: {
            wei: value.toString(),
            formatted: formatUSDCAmount(value)
          }
        },
        relayer: {
          address: dummyWallet.address,
          gasSponsored: true
        },
        simulationDetails: {
          estimatedGas: gasEstimate.toString(),
          estimatedCost: ethers.formatEther(estimatedCost),
          gasPrice: ethers.formatUnits(maxFeePerGas, 'gwei') + ' gwei',
          success: true,
          message: `Transaction simulation successful - ${simulationReason}`,
          reason: simulationReason,
          hasPrivateKey,
          isCorrectWallet,
          authorizedSponsorAddresses: AUTHORIZED_SPONSOR_ADDRESSES
        },
        timestamp: new Date().toISOString()
      });
    }

    // Real execution mode - private key available
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org');
    const relayerWallet = new ethers.Wallet(privateKey, provider);

    console.log(`Relayer wallet address: ${relayerWallet.address}`);
    console.log(`Executing USDC transfer: ${from} -> ${to}, ${formatUSDCAmount(value)} USDC`);

    // Create USDC contract instance with relayer wallet
    const usdcContract = createUSDCContract(relayerWallet);

    // Estimate gas for the transaction
    let gasEstimate: bigint;
    try {
      gasEstimate = await usdcContract.transferWithAuthorization.estimateGas(
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
        v,
        r,
        s
      );
      console.log(`Estimated gas: ${gasEstimate.toString()}`);
    } catch (gasError) {
      console.error('Gas estimation failed:', gasError);
      return NextResponse.json({
        error: 'Transaction would fail - gas estimation failed',
        details: gasError instanceof Error ? gasError.message : 'Unable to estimate gas',
        possibleCauses: [
          'Insufficient USDC balance',
          'Invalid signature',
          'Nonce already used',
          'Authorization expired'
        ]
      }, { status: 400 });
    }

    // Add 20% buffer to gas estimate
    const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);
    console.log(`Using gas limit: ${gasLimit.toString()} (estimated: ${gasEstimate.toString()})`);

    // Get current gas price data
    const feeData = await provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas || ethers.parseUnits('0.1', 'gwei');
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits('0.05', 'gwei');

    console.log(`Gas pricing - Max Fee: ${ethers.formatUnits(maxFeePerGas, 'gwei')} gwei, Priority Fee: ${ethers.formatUnits(maxPriorityFeePerGas, 'gwei')} gwei`);

    // Execute transferWithAuthorization with optimized gas settings
    const tx = await usdcContract.transferWithAuthorization(
      from,
      to,
      value,
      validAfter,
      validBefore,
      nonce,
      v,
      r,
      s,
      {
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas
      }
    );

    console.log(`Transaction sent: ${tx.hash}`);

    // Wait for transaction to be mined
    const receipt = await tx.wait();

    console.log(`Transaction confirmed in block ${receipt?.blockNumber}`);
    console.log(`Gas used: ${receipt?.gasUsed?.toString()}`);

    return NextResponse.json({
      success: true,
      simulation: false,
      transaction: {
        hash: tx.hash,
        blockNumber: receipt?.blockNumber || 0,
        gasUsed: receipt?.gasUsed?.toString() || '0',
        effectiveGasPrice: receipt?.effectiveGasPrice?.toString() || '0',
        status: receipt?.status === 1 ? 'success' : 'failed'
      },
      transfer: {
        from,
        to,
        amount: {
          wei: value.toString(),
          formatted: formatUSDCAmount(value)
        }
      },
      relayer: {
        address: relayerWallet.address,
        gasSponsored: true
      },
      timestamp: new Date().toISOString()
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
