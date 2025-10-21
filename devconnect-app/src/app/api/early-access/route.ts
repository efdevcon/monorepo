import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // Server-side password check - not exposed to client
    const correctPassword = process.env.EARLY_ACCESS_PASSWORD;

    // If no password is set, always deny access
    if (!correctPassword) {
      return NextResponse.json(
        { success: false, error: 'Early access is not configured' },
        { status: 403 }
      );
    }

    if (password === correctPassword) {
      // Create response with success
      const response = NextResponse.json({ success: true });
      
      // Set cookie with the password itself
      response.cookies.set('earlyAccess', password, {
        httpOnly: true, // Can't be accessed by JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
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

