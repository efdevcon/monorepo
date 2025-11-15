import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // Server-side password check - not exposed to client
    const earlyAccessPassword = process.env.EARLY_ACCESS_PASSWORD;

    // If no password is set, always deny access
    if (!earlyAccessPassword) {
      return NextResponse.json(
        { success: false, error: 'Early access is not configured' },
        { status: 403 }
      );
    }

    const isEarlyAccess = password.replace(/\s/g, '').toLowerCase() === earlyAccessPassword.replace(/\s/g, '').toLowerCase();

    if (isEarlyAccess) {
      // Create response with success
      const response = NextResponse.json({ success: true });
      
      // Store password without spaces and lowercase for consistent comparison
      const normalizedPassword = password.replace(/\s/g, '').toLowerCase();
      
      // Set earlyAccess cookie
      response.cookies.set('earlyAccessV2', normalizedPassword, {
        httpOnly: false, // Can be accessed by JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
      });

      return response;
    } else {
      return NextResponse.json(
        { success: false, error: 'Incorrect password' },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}

