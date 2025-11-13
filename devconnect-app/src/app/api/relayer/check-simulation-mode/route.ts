import { NextRequest, NextResponse } from 'next/server';
import { COINBASE_CONFIG } from '@/config/coinbase-config';

/**
 * Public API endpoint to check if the system is in simulation mode
 * GET /api/relayer/check-simulation-mode?wallet=0x...
 * 
 * Note: Public endpoint (no auth required) - just checks system configuration
 * Returns whether the system is configured for real transactions
 * 
 * When Coinbase Smart Wallet is enabled:
 * - Always returns isSimulationMode: false (real transactions via Paymaster)
 * 
 * When using legacy EOA relayer:
 * - Requires ETH_RELAYER_PAYMENT_PRIVATE_KEY or ETH_RELAYER_SEND_PRIVATE_KEY
 * - No wallet restrictions - any authenticated user can request transfers
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
        walletAddress,
        message: 'System is configured for gasless transactions via Coinbase Smart Wallet',
        paymasterEnabled: true,
        timestamp: new Date().toISOString()
      });
    }

    // Legacy EOA relayer checks - only require at least one private key
    const paymentPrivateKey = process.env.ETH_RELAYER_PAYMENT_PRIVATE_KEY;
    const sendPrivateKey = process.env.ETH_RELAYER_SEND_PRIVATE_KEY;
    const hasPrivateKey = !!paymentPrivateKey || !!sendPrivateKey;

    const isSimulationMode = !hasPrivateKey;

    const message = hasPrivateKey
      ? 'System is configured for real transactions'
      : 'System is in simulation mode - no relayer private keys configured';

    return NextResponse.json({
      success: true,
      isSimulationMode,
      mode: 'legacy-eoa-relayer',
      hasPrivateKey,
      walletAddress,
      message,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error checking simulation mode:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check simulation mode',
      details: error instanceof Error ? error.message : 'Unknown error',
      isSimulationMode: false,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 
