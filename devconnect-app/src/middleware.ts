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
    response.headers.set('x-user-id', authResult.user.id)
    response.headers.set('x-user-email', authResult.user.email || '')
    
    return response
  })
}

export const config = {
  matcher: [
    // Match all /api/auth/ routes
    '/api/auth/:path*'
  ]
}
