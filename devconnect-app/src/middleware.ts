import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from './app/api/auth/middleware';
import { validLocales } from './i18n/locales';
import { cookies } from 'next/headers';
import { poisData } from './data/pois';
import { POI } from './types/api-data';

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
  const qrCode = request.nextUrl.pathname.replace('/qr-code/', 'qr-code-');
  const poi = poisData.find((poi: POI) => poi.layerName === qrCode);

  // If QR code is found, perform redirect
  if (poi && poi.websiteLink) {
    return NextResponse.redirect(new URL(poi.websiteLink, request.url));
  }

  // otherwise, continue with the request
  return NextResponse.next();
};

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/qr-code')) {
    return await QRCodeRedirect(request);
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
