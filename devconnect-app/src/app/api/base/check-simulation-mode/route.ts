import { NextResponse } from 'next/server';

/**
 * API endpoint to check if the system is in simulation mode
 * GET /api/base/check-simulation-mode
 * 
 * Returns whether the system is configured for real transactions or simulation mode
 */
export async function GET() {
  try {
    const privateKey = process.env.PRIVATE_KEY;
    const isSimulationMode = !privateKey;

    return NextResponse.json({
      success: true,
      isSimulationMode,
      message: isSimulationMode 
        ? 'System is in simulation mode - no PRIVATE_KEY configured'
        : 'System is configured for real transactions',
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
