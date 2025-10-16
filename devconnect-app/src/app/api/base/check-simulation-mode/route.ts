import { NextRequest, NextResponse } from 'next/server';
import { AUTHORIZED_SPONSOR_ADDRESSES } from '@/config/config';
import { COINBASE_CONFIG } from '@/config/coinbase-config';

/**
 * API endpoint to check if the system is in simulation mode
 * GET /api/base/check-simulation-mode?wallet=0x...
 * 
 * Returns whether the system is configured for real transactions or simulation mode
 * 
 * When Coinbase Smart Wallet is enabled:
 * - Always returns isSimulationMode: false (real transactions via Paymaster)
 * - No authorization checks needed (any EOA can request transfers)
 * 
 * When using legacy EOA relayer:
 * - Requires PRIVATE_KEY configured
 * - Wallet address must match authorized sponsor address
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    // If Coinbase Smart Wallet is enabled, always allow real transactions
    if (COINBASE_CONFIG.ENABLED) {
      return NextResponse.json({
        success: true,
        isSimulationMode: false,
        mode: 'coinbase-smart-wallet',
        hasPrivateKey: true,
        isCorrectWallet: true,
        walletAddress,
        message: 'System is configured for gasless transactions via Coinbase Smart Wallet',
        paymasterEnabled: true,
        timestamp: new Date().toISOString()
      });
    }

    // Legacy EOA relayer checks
    const privateKey = process.env.PRIVATE_KEY;
    const hasPrivateKey = !!privateKey;
    const isCorrectWallet = walletAddress && AUTHORIZED_SPONSOR_ADDRESSES.some(
      address => address.toLowerCase() === walletAddress.toLowerCase()
    );

    const isSimulationMode = !hasPrivateKey || !isCorrectWallet;

    let message = '';
    if (!hasPrivateKey) {
      message = 'System is in simulation mode - no PRIVATE_KEY configured';
    } else if (!isCorrectWallet) {
      message = `System is in simulation mode - wallet ${walletAddress} is not authorized. Only authorized sponsor addresses can execute real transactions.`;
    } else {
      message = 'System is configured for real transactions';
    }

    return NextResponse.json({
      success: true,
      isSimulationMode,
      mode: 'legacy-eoa-relayer',
      hasPrivateKey,
      isCorrectWallet,
      walletAddress,
      authorizedSponsorAddresses: AUTHORIZED_SPONSOR_ADDRESSES,
      message,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error checking simulation mode:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check simulation mode',
      details: error instanceof Error ? error.message : 'Unknown error',
      isSimulationMode: true, // Default to simulation mode on error
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 
