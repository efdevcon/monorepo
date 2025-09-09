import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from './app/api/auth/middleware'

export function middleware(request: NextRequest) {
  // Only apply to API routes that start with /api/auth/
  if (!request.nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // Apply authentication
  return verifyAuth(request).then(authResult => {
    if (!authResult.success) {
      return authResult.error
    }
    
    // Add user info to request headers for the route handler
    const response = NextResponse.next()

    // Set headers with proper encoding for Netlify compatibility
    response.headers.set('x-user-id', encodeURIComponent(authResult.user.id))
    response.headers.set('x-user-email', encodeURIComponent(authResult.user.email || ''))

    // Also add as query params as fallback for Netlify
    const url = new URL(request.url)
    url.searchParams.set('_user_id', authResult.user.id)
    url.searchParams.set('_user_email', authResult.user.email || '')
    
    return NextResponse.rewrite(url)
  })
}

export const config = {
  matcher: [
    // Match all /api/auth/ routes
    '/api/auth/:path*'
  ]
}
