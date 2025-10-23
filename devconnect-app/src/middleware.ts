import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from './app/api/auth/middleware';
import { validLocales } from './i18n/locales';
import { cookies } from 'next/headers';

const languageMiddleware = async (request: NextRequest) => {
  // Read locale from cookie
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE');

  // Validate and set header for app to read
  const validLocale =
    locale && validLocales.includes(locale?.value) ? locale?.value : 'en';

  // Pass locale to app via header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-locale', validLocale);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
};

const QRCodeRedirect = (request: NextRequest) => {
  const QRCodes = [
    {
      path: '/qr-code/1',
      redirect: '/map?filter=1',
    },
    {
      path: '/qr-code/2',
      redirect: '/map?filter=2',
    },
    {
      path: '/qr-code/3',
      redirect: '/map?filter=3',
    },
  ];

  const qrCode = QRCodes.find(
    (qrCode) => qrCode.path === request.nextUrl.pathname
  );

  // If QR code is found, perform redirect
  if (qrCode) {
    return NextResponse.redirect(new URL(qrCode.redirect, request.url));
  }

  // otherwise, continue with the request
  return NextResponse.next();
};

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/qr-code')) {
    return await QRCodeRedirect(request);
  }

  // Check if coming soon mode is enabled
  const isComingSoon = process.env.NEXT_PUBLIC_COMING_SOON === 'true';

  if (isComingSoon) {
    // Allow API routes through but let them continue through middleware
    // (they'll still go through auth checks below if needed)
    if (request.nextUrl.pathname.startsWith('/api/')) {
      // Don't return early - let it continue to auth middleware
    } else {
      // For non-API routes, apply coming soon logic

      // Allow manifest.json and other PWA files
      if (
        request.nextUrl.pathname === '/manifest.json' ||
        request.nextUrl.pathname.startsWith('/sw') ||
        request.nextUrl.pathname.startsWith('/workbox')
      ) {
        return NextResponse.next();
      }

      // Check for early access password in cookie
      const earlyAccessCookie = request.cookies.get('earlyAccess')?.value;
      const betaAccessCookie = request.cookies.get('betaAccess')?.value;
      const earlyAccessPassword = process.env.EARLY_ACCESS_PASSWORD;
      const betaAccessPassword = process.env.BETA_ACCESS_PASSWORD;

      // If either password matches and is configured, allow access
      const hasEarlyAccess = earlyAccessPassword && earlyAccessCookie === earlyAccessPassword;
      const hasBetaAccess = betaAccessPassword && betaAccessCookie === betaAccessPassword;

      if (hasEarlyAccess || hasBetaAccess) {
        return await languageMiddleware(request);
      }

      // Allow access only to the coming-soon page and static assets
      if (
        !request.nextUrl.pathname.startsWith('/coming-soon') &&
        !request.nextUrl.pathname.startsWith('/_next') &&
        !request.nextUrl.pathname.startsWith('/static') &&
        !request.nextUrl.pathname.match(
          /\.(ico|png|jpg|jpeg|svg|gif|webp|json)$/
        )
      ) {
        // Redirect all other routes to coming-soon page
        return NextResponse.redirect(new URL('/coming-soon', request.url));
      }

      // Allow the coming-soon page itself to load
      if (request.nextUrl.pathname.startsWith('/coming-soon')) {
        return NextResponse.next();
      }
    }
  }

  // Only apply to API that do not start with /api/auth
  if (!request.nextUrl.pathname.startsWith('/api/auth/')) {
    return await languageMiddleware(request);
  }

  // Apply authentication
  return verifyAuth(request).then((authResult) => {
    if (!authResult.success) {
      return authResult.error;
    }

    // For Netlify compatibility, try both approaches
    const url = new URL(request.url);
    url.searchParams.set('_user_id', authResult.user.id);
    url.searchParams.set('_user_email', authResult.user.email || '');

    // Try to rewrite to the modified URL
    const response = NextResponse.rewrite(url);

    // Also try setting headers as a fallback
    response.headers.set('x-user-id', authResult.user.id);
    response.headers.set('x-user-email', authResult.user.email || '');

    console.log('Middleware: Setting data for user:', authResult.user.email);
    console.log('Middleware: Modified URL:', url.toString());

    return response;
  });
}

export const config = {
  matcher: [
    // Match all routes except Next.js internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
    // '/api/auth/:path*',
  ],
};
