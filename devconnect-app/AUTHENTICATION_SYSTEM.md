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

## Code References

| File | Purpose |
|------|---------|
| `src/components/Onboarding.tsx` | Main auth UI and flow orchestration |
| `src/hooks/useUser.ts` | Supabase authentication |
| `src/context/WalletProviders.tsx` | Provider setup |
| `src/config/appkit.ts` | AppKit/Wagmi configuration |
| `src/config/para.ts` | Para SDK initialization |
| `src/config/config.ts` | Environment variables |

