import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { 
  getUSDCBalance, 
  generateUniqueNonce, 
  createTransferAuthorizationMessage,
  parseUSDCAmount,
  USDC_DOMAIN,
  TRANSFER_WITH_AUTHORIZATION_TYPES
} from '@/lib/usdc-contract';

/**
 * API endpoint to prepare EIP-712 authorization message for USDC transfers
 * POST /api/base/prepare-authorization
 * 
 * Flow:
 * 1. Validates transfer parameters (from, to, amount)
 * 2. Checks sender has sufficient USDC balance
 * 3. Generates unique nonce for the authorization
 * 4. Creates EIP-712 message for user to sign
 * 5. Returns domain, types, and message for frontend signing
 */
export async function POST(request: NextRequest) {
  try {
    const { from, to, amount } = await request.json();

    // Validate required parameters
    if (!from || !to || !amount) {
      return NextResponse.json({
        error: 'Missing required parameters: from, to, amount'
      }, { status: 400 });
    }

    // Validate Ethereum addresses
    if (!ethers.isAddress(from)) {
      return NextResponse.json({
        error: 'Invalid sender address format'
      }, { status: 400 });
    }

    if (!ethers.isAddress(to)) {
      return NextResponse.json({
        error: 'Invalid recipient address format'
      }, { status: 400 });
    }

    // Validate amount
    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      return NextResponse.json({
        error: 'Invalid amount. Must be a positive number.'
      }, { status: 400 });
    }

    // Check sender's USDC balance
    const senderBalance = await getUSDCBalance(from);
    const requiredAmount = parseFloat(amount);
    const availableAmount = parseFloat(senderBalance.formatted);

    if (availableAmount < requiredAmount) {
      return NextResponse.json({
        error: `Insufficient USDC balance. Required: ${requiredAmount}, Available: ${availableAmount}`,
        details: {
          required: requiredAmount,
          available: availableAmount,
          shortfall: requiredAmount - availableAmount
        }
      }, { status: 400 });
    }

    // Generate unique nonce for this authorization
    const nonce = await generateUniqueNonce(from);

    // Set validity window (authorization valid for 10 minutes)
    const now = Math.floor(Date.now() / 1000);
    const validAfter = now - 60; // Valid from 1 minute ago (to account for clock skew)
    const validBefore = now + 600; // Valid until 10 minutes from now

    // Convert amount to wei (USDC has 6 decimals)
    const valueWei = parseUSDCAmount(amount);

    // Create EIP-712 message structure
    const authorizationMessage = createTransferAuthorizationMessage({
      from,
      to,
      value: valueWei,
      validAfter,
      validBefore,
      nonce
    });

    console.log(`Prepared USDC authorization: ${from} -> ${to}, ${amount} USDC`);
    console.log(`Nonce: ${nonce}, Valid until: ${new Date(validBefore * 1000).toISOString()}`);

    return NextResponse.json({
      success: true,
      authorization: {
        domain: authorizationMessage.domain,
        types: authorizationMessage.types,
        message: {
          ...authorizationMessage.message,
          value: valueWei.toString(), // Convert BigInt to string
        },
        
        // Additional metadata for the frontend
        metadata: {
          nonce,
          validAfter,
          validBefore,
          validUntil: new Date(validBefore * 1000).toISOString(),
          amount: {
            formatted: amount,
            wei: valueWei.toString(), // Convert BigInt to string
            decimals: senderBalance.decimals
          },
          sender: {
            address: from,
            balance: senderBalance.formatted,
            balanceWei: senderBalance.value.toString() // Convert BigInt to string
          },
          recipient: {
            address: to
          }
        }
      },
      instructions: {
        message: 'Sign this authorization message with your wallet to approve the USDC transfer',
        note: 'This signature only authorizes the transfer - the relayer will execute it for you',
        expiration: `This authorization expires at ${new Date(validBefore * 1000).toLocaleString()}`
      }
    });

  } catch (error) {
    console.error('Error preparing USDC authorization:', error);
    
    let errorMessage = 'Failed to prepare USDC authorization';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('network') || error.message.includes('connection')) {
        errorMessage = 'Failed to connect to Base network. Please try again.';
        statusCode = 503;
      } else if (error.message.includes('nonce')) {
        errorMessage = 'Failed to generate unique authorization nonce. Please try again.';
        statusCode = 409;
      } else if (error.message.includes('balance')) {
        errorMessage = 'Failed to check USDC balance. Please try again.';
        statusCode = 503;
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: statusCode });
  }
} 
