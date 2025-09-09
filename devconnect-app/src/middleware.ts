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

    // For Netlify compatibility, try both approaches
    const url = new URL(request.url)
    url.searchParams.set('_user_id', authResult.user.id)
    url.searchParams.set('_user_email', authResult.user.email || '')

    // Try to rewrite to the modified URL
    const response = NextResponse.rewrite(url)

    // Also try setting headers as a fallback
    response.headers.set('x-user-id', authResult.user.id)
    response.headers.set('x-user-email', authResult.user.email || '')

    console.log('Middleware: Setting data for user:', authResult.user.email)
    console.log('Middleware: Modified URL:', url.toString())

    return response
  })
}

export const config = {
  matcher: [
    // Match all /api/auth/ routes
    '/api/auth/:path*'
  ]
}
