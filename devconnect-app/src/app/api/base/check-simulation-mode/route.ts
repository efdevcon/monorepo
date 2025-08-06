import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to check if the system is in simulation mode
 * GET /api/base/check-simulation-mode?wallet=0x...
 * 
 * Returns whether the system is configured for real transactions or simulation mode
 * Only allows real transactions if:
 * 1. PRIVATE_KEY is configured
 * 2. Wallet address matches the required sponsor address
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    const privateKey = process.env.PRIVATE_KEY;
    const requiredSponsorAddress = '0x20c85697e4789d7a1570e78688567160426d4cdd';

    // Check if we have private key and wallet address matches required sponsor
    const hasPrivateKey = !!privateKey;
    const isCorrectWallet = walletAddress && walletAddress.toLowerCase() === requiredSponsorAddress.toLowerCase();

    const isSimulationMode = !hasPrivateKey || !isCorrectWallet;

    let message = '';
    if (!hasPrivateKey) {
      message = 'System is in simulation mode - no PRIVATE_KEY configured';
    } else if (!isCorrectWallet) {
      message = `System is in simulation mode - wallet ${walletAddress} is not authorized. Only ${requiredSponsorAddress} can execute real transactions.`;
    } else {
      message = 'System is configured for real transactions';
    }

    return NextResponse.json({
      success: true,
      isSimulationMode,
      hasPrivateKey,
      isCorrectWallet,
      walletAddress,
      requiredSponsorAddress,
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
