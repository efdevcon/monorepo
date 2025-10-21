import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Create response
    const response = NextResponse.json({ success: true });
    
    // Delete the cookie by setting it with an expired date
    response.cookies.delete('earlyAccess');

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to reset' },
      { status: 400 }
    );
  }
}

