import { NextRequest, NextResponse } from 'next/server'
import { createClient, type User } from '@supabase/supabase-js'
import { jwtVerify, createRemoteJWKSet } from 'jose'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

// Define Para JWKS URLs based on environment
const PARA_JWKS_URLS = {
  sandbox: 'https://api.sandbox.getpara.com/.well-known/jwks.json',
  beta: 'https://api.beta.getpara.com/.well-known/jwks.json',
  prod: 'https://api.getpara.com/.well-known/jwks.json',
};

// Type for Para JWT payload
interface ParaJwtPayload {
  data: {
    userId: string;
    wallets?: Array<{
      id: string;
      type: string;
      address: string;
      publicKey: string;
    }>;
    email?: string;
    phone?: string;
    telegramUserId?: string;
    farcasterUsername?: string;
    externalWalletAddress?: string;
    authType: string;
    identifier: string;
    oAuthMethod?: string;
    externalWallet?: {
      address: string;
      type: string;
      provider: string;
    };
  };
  iat: number;
  exp: number;
  sub: string;
}

export type AuthResult =
  | { success: true; user: User }
  | { success: false; error: NextResponse }

export type AuthResultWithHeaders =
  | { success: true; user: User }
  | { success: false; error: string }

// Core verification logic that works with any headers-like object
async function verifyAuthCore(
  authHeader: string | null,
  authMethod: string | null
): Promise<AuthResultWithHeaders> {
  // Check Supabase configuration
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      success: false,
      error: 'Supabase configuration missing'
    }
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Authorization header required'
    }
  }

  const token = authHeader.replace('Bearer ', '')

  if (authMethod === 'para') {
    // Verify as Para JWT
    try {
      // Get JWKS URL based on environment
      const env = (process.env.PARA_ENVIRONMENT || 'prod') as keyof typeof PARA_JWKS_URLS;
      const jwksUrl = PARA_JWKS_URLS[env];
      const JWKS = createRemoteJWKSet(new URL(jwksUrl));

      // Verify Para JWT
      const { payload } = await jwtVerify<ParaJwtPayload>(token, JWKS, {
        algorithms: ['RS256'],
      });

      // If Para JWT verification succeeds, create a mock user object
      const email = payload.data.email || `${payload.data.userId}@para-fallback.com`;
      const paraUser: User = {
        id: payload.data.userId,
        email,
        user_metadata: {
          external_id: payload.data.userId,
          para_auth_type: payload.data.authType,
          wallet_address: payload.data.wallets?.[0]?.address,
          wallet_type: payload.data.wallets?.[0]?.type,
        },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('Para user:', paraUser);

      return {
        success: true,
        user: paraUser
      };
    } catch (paraError) {
      console.log('Para JWT verification failed:', paraError);
      return {
        success: false,
        error: 'Invalid or expired Para JWT token'
      }
    }
  } else {
    // Verify as Supabase JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return {
        success: false,
        error: 'Invalid or expired Supabase token'
      }
    }

    console.log('Supabase user:', user);

    return {
      success: true,
      user
    }
  }
}

// For use with NextRequest (API routes, middleware)
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization')
  const authMethod = request.headers.get('x-auth-method')

  const result = await verifyAuthCore(authHeader, authMethod)

  if (!result.success) {
    return {
      success: false,
      error: NextResponse.json({ error: result.error }, {
        status: result.error.includes('configuration') ? 500 : 401
      })
    }
  }

  return result
}

// For use with Headers from Server Components (layouts, pages)
export async function verifyAuthWithHeaders(
  headers: Headers
): Promise<AuthResultWithHeaders> {
  const authHeader = headers.get('authorization')
  const authMethod = headers.get('x-auth-method')

  return verifyAuthCore(authHeader, authMethod)
}
