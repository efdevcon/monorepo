import { createClient } from '@supabase/supabase-js';
import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

// Define Para JWKS URLs based on environment
const PARA_JWKS_URLS = {
  sandbox: 'https://api.sandbox.getpara.com/.well-known/jwks.json',
  beta: 'https://api.beta.getpara.com/.well-known/jwks.json',
  prod: 'https://api.getpara.com/.well-known/jwks.json',
};

// Type for request body
interface ExchangeRequestBody {
  paraJwt: string;
}

// Type for Para JWT payload (based on your provided Para doc)
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

export async function POST(req: NextRequest) {
  try {
    const body: ExchangeRequestBody = await req.json();
    const { paraJwt } = body;

    if (!paraJwt) {
      return NextResponse.json({ error: 'Missing Para JWT' }, { status: 400 });
    }

    // Get JWKS URL based on environment
    const env = (process.env.PARA_ENVIRONMENT || 'prod') as keyof typeof PARA_JWKS_URLS;
    const jwksUrl = PARA_JWKS_URLS[env];
    const JWKS = createRemoteJWKSet(new URL(jwksUrl));

    // Verify Para JWT
    const { payload } = await jwtVerify<ParaJwtPayload>(paraJwt, JWKS, {
      algorithms: ['RS256'],  // Para likely uses RS256; confirm in docs if needed
    });

    // Extract key user details
    const externalId = payload.data.userId;
    const email = payload.data.email || `${externalId}@para-fallback.com`;  // Fallback if no email
    console.log('email', email);
    const walletData = payload.data.wallets?.[0] || null;  // Use first wallet if available

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let supabaseUser = null;

    // Try to find user by email first (more reliable)
    try {
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (!listError && users.users) {
        supabaseUser = users.users.find((u) => u.email === email);
        if (supabaseUser) {
          console.log('Found existing user by email:', email);
        }
      }
    } catch (emailLookupError) {
      console.log('No user found by email:', email);
    }

    // If not found by email, try to find by external_id in metadata
    if (!supabaseUser) {
      try {
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (!listError && users.users) {
          supabaseUser = users.users.find(
            (u) => u.user_metadata?.external_id === externalId
          );
          if (supabaseUser) {
            console.log('Found existing user by external_id:', externalId);
          }
        }
      } catch (listError) {
        console.log('Error listing users:', listError);
      }
    }

    // If found by email, update the user's metadata to include external_id
    if (supabaseUser && !supabaseUser.user_metadata?.external_id) {
      try {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          supabaseUser.id,
          {
            user_metadata: {
              ...supabaseUser.user_metadata,
              external_id: externalId,
              para_auth_type: payload.data.authType,
              wallet_address: walletData?.address,
              wallet_type: walletData?.type,
            },
          }
        );
        if (updateError) {
          console.error('Error updating user metadata:', updateError);
        } else {
          console.log('Updated user metadata with Para info');
        }
      } catch (updateError) {
        console.error('Error updating user metadata:', updateError);
      }
    }

    // Create user if not found by either method
    if (!supabaseUser) {
      try {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            external_id: externalId,
            para_auth_type: payload.data.authType,
            wallet_address: walletData?.address,
            wallet_type: walletData?.type,
          },
        });
        if (createError) throw createError;
        supabaseUser = newUser.user;
        console.log('Created new user for Para:', externalId);
      } catch (createError: any) {
        // If user creation fails due to email already existing, try to get the user again
        if (createError.message?.includes('already been registered') || createError.code === 'email_exists') {
          console.log('User creation failed (user exists), trying to get existing user again');
          console.log('Looking for email:', email);
          console.log('Looking for external_id:', externalId);

          try {
            // Wait a moment for database consistency
            await new Promise(resolve => setTimeout(resolve, 100));

            const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
            if (listError) {
              console.error('Error listing users:', listError);
              throw new Error(`Failed to list users: ${listError.message}`);
            }

            if (!users || !users.users) {
              throw new Error('No users data returned from Supabase');
            }

            console.log(`Found ${users.users.length} total users, searching...`);

            // Try to find by email (case-insensitive)
            const userByEmail = users.users.find((u) =>
              u.email?.toLowerCase() === email.toLowerCase()
            );

            // Try to find by external_id
            const userByExternalId = users.users.find((u) =>
              u.user_metadata?.external_id === externalId
            );

            supabaseUser = userByEmail || userByExternalId;

            if (supabaseUser) {
              console.log('✅ Retrieved existing user after creation failure:', {
                id: supabaseUser.id,
                email: supabaseUser.email,
                foundBy: userByEmail ? 'email' : 'external_id'
              });
            } else {
              console.error('❌ User not found in list. Available emails:',
                users.users.map(u => u.email).slice(0, 10)
              );

              // The user exists (creation failed) but we can't find it in the list
              // This might be due to pagination or the user being created through another flow
              // Since we know the user exists (creation failed), let's try with pagination
              console.log('⚠️ Attempting paginated search for user...');
              
              let foundUser = null;
              let page = 1;
              const perPage = 1000;
              
              try {
                // Search through paginated results
                while (!foundUser && page <= 10) { // Limit to 10 pages max
                  const { data: paginatedUsers, error: pageError } = await supabaseAdmin.auth.admin.listUsers({
                    page,
                    perPage
                  });
                  
                  if (pageError) {
                    console.error(`Page ${page} error:`, pageError);
                    break;
                  }
                  
                  if (!paginatedUsers?.users || paginatedUsers.users.length === 0) {
                    console.log(`No more users at page ${page}`);
                    break;
                  }
                  
                  console.log(`Searching page ${page} (${paginatedUsers.users.length} users)...`);
                  
                  foundUser = paginatedUsers.users.find((u) => 
                    u.email?.toLowerCase() === email.toLowerCase() ||
                    u.user_metadata?.external_id === externalId
                  );
                  
                  if (foundUser) {
                    console.log(`✅ Found user on page ${page}`);
                    break;
                  }
                  
                  page++;
                }
                
                if (foundUser) {
                  supabaseUser = foundUser;
                  console.log('✅ Found user via paginated search:', supabaseUser.id);
                  
                  // Update their metadata to link to Para
                  try {
                    await supabaseAdmin.auth.admin.updateUserById(
                      supabaseUser.id,
                      {
                        user_metadata: {
                          ...supabaseUser.user_metadata,
                          external_id: externalId,
                          para_auth_type: payload.data.authType,
                          wallet_address: walletData?.address,
                          wallet_type: walletData?.type,
                        },
                      }
                    );
                    console.log('✅ Updated user metadata with Para info');
                  } catch (updateErr) {
                    console.warn('Failed to update metadata:', updateErr);
                  }
                } else {
                  throw new Error('User not found even with paginated search');
                }
              } catch (finalError: any) {
                console.error('Final user lookup failed:', finalError);
                throw new Error(`User exists but cannot be retrieved: ${finalError.message}`);
              }
            }
          } catch (getError: any) {
            console.error('Error retrieving existing user:', getError);
            throw new Error(`User exists but cannot be retrieved: ${getError.message || 'Unknown error'}`);
          }
        } else {
          console.error('User creation failed with unexpected error:', createError);
          throw createError;
        }
      }
    }

    if (!supabaseUser) {
      throw new Error('Failed to find or create user');
    }

    const supabaseUserId = supabaseUser.id;

    console.log('supabaseUser', supabaseUser);

    // Sign Supabase JWT (HS256)
    const jwtSecret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!);
    const now = Math.floor(Date.now() / 1000);
    const supabaseJwt = await new SignJWT({
      sub: supabaseUserId,
      aud: 'authenticated',
      role: 'authenticated',
      email: supabaseUser.email,
      // Add custom claims if needed (e.g., from Para)
      para_user_id: externalId,
      iat: now,
      exp: now + 60 * 60,  // 1 hour expiry; sync with Para's default 30min if preferred
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .sign(jwtSecret);

    return NextResponse.json({ supabaseJwt }, { status: 200 });
  } catch (error: any) {
    console.error('Token exchange error:', error);
    return NextResponse.json({ error: error.message || 'Token exchange failed' }, { status: 500 });
  }
}
