import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // Server-side password check - not exposed to client
    const earlyAccessPassword = process.env.EARLY_ACCESS_PASSWORD;
    const betaAccessPassword = process.env.BETA_ACCESS_PASSWORD;

    // If no passwords are set, always deny access
    if (!earlyAccessPassword && !betaAccessPassword) {
      return NextResponse.json(
        { success: false, error: 'Early access is not configured' },
        { status: 403 }
      );
    }

    const isEarlyAccess = earlyAccessPassword && password.replace(/\s/g, '') === earlyAccessPassword.replace(/\s/g, '');
    const isBetaAccess = betaAccessPassword && password.replace(/\s/g, '') === betaAccessPassword.replace(/\s/g, '');

    if (isEarlyAccess || isBetaAccess) {
      // Create response with success
      const response = NextResponse.json({ success: true });
      
      // Set earlyAccess cookie for both types
      response.cookies.set('earlyAccess', password, {
        httpOnly: false, // Can be accessed by JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
      });

      // If beta access, also set betaAccess cookie
      if (isBetaAccess) {
        response.cookies.set('betaAccess', password, {
          httpOnly: false, // Can be accessed by JavaScript
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
        });
      }

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

