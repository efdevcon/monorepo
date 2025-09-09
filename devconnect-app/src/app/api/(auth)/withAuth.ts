import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, type AuthResult } from './middleware'
import { type User } from '@supabase/supabase-js'

export type AuthenticatedRequest = NextRequest & {
  user: User
}

export type AuthenticatedHandler = (
  request: AuthenticatedRequest
) => Promise<NextResponse> | NextResponse

/**
 * Higher-order function that wraps API route handlers with authentication
 * Automatically verifies auth and provides authenticated user to the handler
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Verify authentication
    const authResult = await verifyAuth(request)
    
    if (!authResult.success) {
      return authResult.error
    }

    // Create authenticated request with user attached
    const authenticatedRequest = request as AuthenticatedRequest
    authenticatedRequest.user = authResult.user

    // Call the original handler with authenticated request
    return handler(authenticatedRequest)
  }
}
