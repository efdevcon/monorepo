# Authentication & Wallet System

## Overview

The app uses a **dual authentication system**:
1. **Supabase** - User accounts and email verification
2. **Para SDK** - Embedded wallet creation and management
3. **AppKit/Wagmi** - External wallet connections (EOA)

## Architecture

### Provider Hierarchy
```
WagmiProvider (wagmi config)
└── QueryClientProvider (@tanstack/react-query)
    └── ParaProvider (@getpara/react-sdk)
        └── AppKitProvider (wallet connection UI)
```

### Key Components

#### 1. `WalletsProviders` (`src/context/WalletProviders.tsx`)
- Root provider that wraps the entire app
- Configures Para SDK with API key and environment
- Sets up Wagmi for blockchain interactions
- Defines authentication layout and OAuth methods

#### 2. `useUser` Hook (`src/hooks/useUser.ts`)
- Manages Supabase authentication
- Handles OTP email sending and verification
- Provides user session management
- Returns: `user`, `loading`, `sendOtp`, `verifyOtp`, `signOut`

#### 3. `Onboarding` Component (`src/components/Onboarding.tsx`)
- Main authentication UI
- Orchestrates both authentication flows
- Manages state transitions between screens

## Authentication Flows

### Flow 1: Embedded Wallet (Default)

```
1. User enters email → signUpOrLogIn()
   ↓
2. Para sends verification code
   ↓
3. User enters 6-digit code → verifyNewAccount()
   ↓
4. Para creates embedded wallet automatically
   ↓
5. User connected with wallet address
```

**Para Auth Methods:**
- **Passkey** - WebAuthn biometric authentication
- **Password** - Traditional password
- **PIN** - Numeric PIN code
- **Email** - Magic link/OTP

### Flow 2: External Wallet (EOA Flow)

```
1. User enters email → sendOtp() (Supabase)
   ↓
2. User receives OTP in email
   ↓
3. User enters 6-digit code → verifyOtp()
   ↓
4. User connects external wallet via AppKit
   ↓
5. Wallet connection established (MetaMask, Rainbow, etc.)
```

**Enable EOA Flow:** Add `?eoa=true` to URL

## State Management

### Authentication States (Para SDK)

```typescript
authState = {
  stage: 'verify' | 'signup' | 'login',
  loginUrl?: string,         // URL for passkey/password flow
  passkeyUrl?: string,       // Passkey authentication
  passwordUrl?: string,      // Password authentication
  pinUrl?: string,           // PIN authentication
  nextStage: 'signup' | 'login',
  isPasskeySupported: boolean
}
```

### User States

1. **Unauthenticated** - No email, no wallet
2. **Email Sent** - Waiting for verification code
3. **Verified** - Code verified, wallet being created
4. **Connected** - Wallet ready, user authenticated
5. **Skipped** - User skipped login (limited access)

## Key Hooks & Methods

### Para SDK Hooks (from `@getpara/react-sdk`)

```typescript
useSignUpOrLogIn()              // Start auth flow
useVerifyNewAccount()            // Verify email code
useWaitForLogin()               // Poll for login completion
useWaitForWalletCreation()      // Poll for wallet creation
useAccount()                    // Get connection status
useLogout()                     // Log out user
```

### Supabase Methods

```typescript
sendOtp(email)                  // Send OTP to email
verifyOtp(email, token)         // Verify OTP code
signOut()                       // Sign out from Supabase
```

### AppKit Methods

```typescript
open()                          // Open wallet connection modal
```

## Configuration

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Para SDK
NEXT_PUBLIC_PARA_API_KEY=      # Auto-detects PROD/BETA by prefix

# WalletConnect
NEXT_PUBLIC_WC_PROJECT_ID=

# RPC
NEXT_PUBLIC_INFURA_APIKEY=
```

### Para Configuration (`src/context/WalletProviders.tsx`)

```typescript
paraModalConfig: {
  disableEmailLogin: false,
  disablePhoneLogin: false,
  authLayout: ['AUTH:FULL', 'EXTERNAL:FULL'],
  oAuthMethods: ['APPLE', 'DISCORD', 'FACEBOOK', 
                 'FARCASTER', 'GOOGLE', 'TWITTER'],
  recoverySecretStepEnabled: true,
  twoFactorAuthEnabled: false,
}
```

## User Journey

### Initial State
- User lands on `/onboarding`
- Sees email input and "Continue with Email" button
- Can skip to browse with limited features

### Embedded Wallet Path
1. Enter email
2. Receive code (in-app or email)
3. Select auth method (Passkey/Password/PIN)
4. Wallet auto-created in background
5. Recovery secret provided (optional)
6. Redirected to app with full access

### External Wallet Path
1. Enter email (required for ticketing data)
2. Verify email with OTP
3. Connect external wallet (MetaMask, etc.)
4. Wallet + email linked
5. Full access to app features

## Polling Mechanism

Para SDK requires polling to detect when wallet creation completes:

```typescript
waitForWalletCreation({
  isCanceled: () => shouldCancelPolling.current
}, {
  onSuccess: ({ recoverySecret }) => {
    // Wallet ready, optionally show recovery secret
  }
})
```

**Cancellation:** Set `shouldCancelPolling.current = true` when:
- User clicks back
- User logs out
- Component unmounts

## Features

### Auto-Submit OTP
- Automatically submits when 6 digits entered
- 100ms delay for UX smoothness

### Paste Support
- Paste 6-digit code in any input
- Auto-fills all fields
- Focuses last input

### Skip Option
- Sets `loginIsSkipped` in localStorage
- Allows browsing without full authentication
- Can still connect later

### Logout
- Clears both Para and Supabase sessions
- Resets local state
- Removes skip flag
- Redirects to onboarding

## Error Handling

### Email Validation
- Checks for valid email format (`includes('@')`)
- Shows inline error messages
- Clears error on input change

### Verification Errors
- Invalid code
- Expired code
- Account already exists
- Server errors (500)

### Network Errors
- Supabase connection failures
- Para API timeouts
- RPC provider issues

## Security

### Recovery Secret
- Generated during wallet creation
- Optionally shown to user
- Required for wallet recovery if device lost

### Session Management
- Supabase handles JWT tokens
- Auto-refresh on expiration
- Para manages wallet session separately

### Authorized Sponsors
- List of addresses allowed to sponsor transactions
- Defined in `src/config/config.ts`
- Used for gasless transactions (EIP-7702)

## Debugging

### Console Logs
The `Onboarding` component includes debug logging:
- `[EMAIL_SUBMIT]` - Email submission flow
- `[ONBOARDING]` - General onboarding state
- Email value changes (when mounted)

### State Inspection
Key state variables:
- `authState` - Para authentication state
- `user` - Supabase user object
- `isConnected` - Wallet connection status
- `otpSent` / `otpVerified` - Email verification flow

## Troubleshooting

### "Button disabled even with valid email"
- Check `mounted` state (hydration issue)
- Verify email includes `@` character
- Check if `isSigningUpOrLoggingIn` is stuck

### "Wallet not creating"
- Ensure polling hasn't been cancelled
- Check Para API key is valid
- Verify network connectivity

### "Email not sending"
- Check Supabase configuration
- Verify email template settings
- Look for rate limiting

### "Modal not showing"
- Para widget is hidden by CSS (intentional)
- Use custom UI in Onboarding component
- AppKit modal controlled by `open()` method

## Authentication Verification Flow

Once a user is logged in, here's how the system verifies they're authenticated:

### 1. **Token Storage** (Client-Side)

**Para Users:**

- Para SDK stores authentication session
- Can issue JWT tokens via `issueJwtAsync()`

**Supabase Users:**

- Supabase stores JWT in browser (localStorage/cookies)
- Managed by Supabase client automatically

**Auto-Exchange (Para → Supabase):**

```typescript
// src/hooks/useAutoParaJwtExchange.ts
// Automatically triggered when Para wallet connects
1. Para connects → issueJwtAsync() → Get Para JWT
2. POST /api/exchange-token → Exchange for Supabase JWT  
3. supabase.auth.setSession() → Set Supabase session
4. Now user has BOTH Para and Supabase authentication
```

### 2. **Making API Requests** (Client-Side)

```typescript
// src/services/apiClient.ts
// When frontend calls a protected endpoint:

fetchAuth('/api/auth/user-data')
  ↓
1. authService.generateToken() - Smart token selection:
   - Try Supabase first (if user session exists)
   - Fallback to Para (if para.issueJwt available)
   
2. Add headers:
   - Authorization: Bearer <token>
   - X-Auth-Method: 'supabase' | 'para'
   
3. Send request to backend
```

### 3. **Authentication Verification** (Server-Side)

```typescript
// src/middleware.ts
// Global middleware intercepts ALL /api/auth/* routes

Request to /api/auth/tickets
  ↓
middleware.ts
  ↓
verifyAuth(request) 
  ↓
app/api/auth/middleware.ts
```

**Verification Logic:**

```typescript
// src/app/api/auth/middleware.ts

verifyAuth(request) {
  1. Extract headers:
     - authorization: "Bearer <token>"
     - x-auth-method: "supabase" | "para"
  
  2. Route based on auth method:
  
     If x-auth-method === 'para':
       → Verify Para JWT with Para's JWKS
       → Check signature, expiry
       → Extract user data from Para JWT
       → Return mock User object
       
     If x-auth-method === 'supabase' (or not set):
       → Verify Supabase JWT
       → Call supabase.auth.getUser(token)
       → Return Supabase User object
  
  3. If verification succeeds:
     → Inject user data into request:
       - Query params: ?_user_id=xxx&_user_email=xxx
       - Headers: x-user-id, x-user-email
     → Forward to route handler
     
  4. If verification fails:
     → Return 401 Unauthorized
}
```

### 4. **Protected Route Access**

```typescript
// src/app/api/auth/user-data/route.ts

export async function GET(request: NextRequest) {
  // User is already authenticated by middleware!
  const userEmail = request.headers.get('x-user-email') ||
                    request.nextUrl.searchParams.get('_user_email');
  
  // Safe to use - middleware guarantees valid user
  const userData = await ensureUser(userEmail);
  
  return NextResponse.json(userData);
}
```

### 5. **JWT Verification Details**

**Para JWT Verification:**

```typescript
// Uses JWKS (JSON Web Key Set) from Para's public keys
JWKS_URLS = {
  sandbox: 'https://api.sandbox.getpara.com/.well-known/jwks.json',
  beta: 'https://api.beta.getpara.com/.well-known/jwks.json',
  prod: 'https://api.getpara.com/.well-known/jwks.json'
}

// Verify with jose library
jwtVerify<ParaJwtPayload>(token, JWKS, { algorithms: ['RS256'] })

// Para JWT Payload Structure:
{
  data: {
    userId: string,
    email?: string,
    wallets?: [{ address, type, ... }],
    authType: 'EMAIL' | 'PASSKEY' | 'PASSWORD' | 'PIN',
    ...
  },
  exp: timestamp,
  iat: timestamp,
  sub: userId
}
```

**Supabase JWT Verification:**

```typescript
// Supabase client handles verification internally
const { data: { user }, error } = await supabase.auth.getUser(token)

// Checks:
// - JWT signature (HS256 with SUPABASE_JWT_SECRET)
// - Expiration
// - User exists in Supabase auth database
```

### 6. **Authentication State in Frontend**

```typescript
// src/hooks/useWalletManager.ts

const hasValidSupabaseAuth = supabaseInitialized && !!supabaseUser;

// This determines if RequiresAuthHOC allows access
// Even Para users need Supabase session (via auto-exchange)

useEffect(() => {
  console.log('👤 [USER_AUTH_STATE]', {
    para: {
      isConnected,
      canIssueJwt,  // Can generate Para JWT
    },
    supabase: {
      hasUser,       // Has Supabase session
    },
    unified: {
      hasValidSupabaseAuth,  // ✅ This determines authentication
    }
  });
}, [...]);
```

## Dual Authentication System

The app cleverly uses **TWO authentication layers**:

| Layer | Purpose | Storage |
|-------|---------|---------|
| **Para** | Wallet authentication, biometric security | Para SDK session |
| **Supabase** | Backend user management, database access | JWT in browser |

**Why Both?**

1. **Para**: Creates and manages wallets, handles secure authentication
2. **Supabase**: Provides traditional auth for database operations, easier backend integration

**Auto-Exchange Bridge:**

- Para users automatically get Supabase sessions
- Backend can accept EITHER Para JWT or Supabase JWT
- Frontend prioritizes Supabase for consistency

## Authentication Flow Diagram

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ├─ Para Connected?
       │  ├─ Yes → Auto-exchange Para JWT → Supabase session
       │  └─ No  → Direct Supabase OTP login
       │
       ▼
   [Has Supabase Session]
       │
       ├─ API Call: fetchAuth('/api/auth/tickets')
       │
       ▼
┌──────────────────────────────────────────┐
│  Smart Token Selection (authService)     │
│  1. Try Supabase token (if session)      │
│  2. Fallback to Para JWT (if available)  │
└──────────────┬───────────────────────────┘
               │
               ├─ Headers: Authorization + X-Auth-Method
               │
               ▼
┌──────────────────────────────────────────┐
│  Next.js Middleware (src/middleware.ts)  │
│  Intercepts /api/auth/* routes           │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  verifyAuth() (middleware.ts)            │
│  - Verify JWT (Para or Supabase)         │
│  - Extract user data                     │
│  - Inject into request headers           │
└──────────────┬───────────────────────────┘
               │
               ├─ Success → Forward with user headers
               │
               ▼
┌──────────────────────────────────────────┐
│  Protected Route Handler                 │
│  - Read x-user-email, x-user-id          │
│  - Process request with verified user    │
└──────────────────────────────────────────┘
```

## Security Features

### Token Expiry

- **Supabase JWT**: 1 hour (auto-refresh handled by client)
- **Para JWT**: 30 minutes (can be refreshed via `issueJwt()`)

### Biometric Security (Para)

- Para can require biometric verification before issuing JWT
- Adds extra security layer for sensitive operations
- User must verify fingerprint/face ID to get fresh token

### JWKS Verification (Para)

- Backend verifies Para JWT signature using public keys
- Cannot be forged without Para's private key
- Rotated keys supported via JWKS endpoint

### Supabase RLS (Row Level Security)

- Database has user policies based on JWT claims
- Even with valid JWT, users can only access their own data
- Additional security layer at database level

## Code References

| File | Purpose |
|------|---------|
| **Authentication Core** ||
| `src/components/Onboarding.tsx` | Main auth UI and flow orchestration |
| `src/hooks/useUser.ts` | Supabase authentication |
| `src/hooks/useWalletManager.ts` | Unified wallet + auth state |
| `src/hooks/useAutoParaJwtExchange.ts` | Automatic Para → Supabase JWT exchange |
| **API Client** ||
| `src/services/apiClient.ts` | Authenticated API requests |
| `src/services/authService.ts` | Token generation and management |
| **Backend Verification** ||
| `src/middleware.ts` | Global auth middleware for /api/auth/* |
| `src/app/api/auth/middleware.ts` | JWT verification logic |
| `src/app/api/exchange-token/route.ts` | Para → Supabase JWT exchange |
| `src/app/api/auth/user-data/route.ts` | Example protected endpoint |
| **Configuration** ||
| `src/context/WalletProviders.tsx` | Provider setup |
| `src/config/appkit.ts` | AppKit/Wagmi configuration |
| `src/config/para.ts` | Para SDK initialization |
| `src/config/config.ts` | Environment variables |

