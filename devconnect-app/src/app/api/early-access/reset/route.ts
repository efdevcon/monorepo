import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Create response
    const response = NextResponse.json({ success: true });
    
    // Delete the early access cookie
    response.cookies.delete('earlyAccessV2');

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to reset' },
      { status: 400 }
    );
  }
}

