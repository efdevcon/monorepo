# Authentication System

## Quick Start

The app uses **direct Para JWT authentication** by default. No configuration needed!

```bash
# Para users: JWT verified directly by backend
# EOA users: Supabase OTP → Connect wallet
```

## Architecture

```
Para SDK       →  JWT  →  Middleware  →  devconnect_app_user
EOA Wallet     →  OTP  →  Supabase   →  auth.users + devconnect_app_user
```

### Key Files

| File | Purpose |
|------|---------|
| `src/hooks/useWalletManager.ts` | Unified wallet state (Para + EOA) |
| `src/hooks/useServerData.ts` | SWR data fetching (user, tickets, favorites) |
| `src/services/authService.ts` | Token generation |
| `src/services/apiClient.ts` | fetchAuth helper (authenticated API calls) |
| `src/middleware.ts` | Root middleware - applies auth to `/api/auth/*` |
| `src/app/api/auth/middleware.ts` | JWT verification + user provisioning |
| `src/app/api/auth/relayer/*` | Gas sponsoring relayer (authenticated) |
| `src/context/WalletContext.tsx` | Context provider - use `useWallet()` hook |

## Authentication Flow

### Para Users (Default)

```
1. Connect → Para SDK creates wallet
2. Frontend → Sends Para JWT directly to API
3. Middleware → Verifies JWT + ensures devconnect_app_user exists
4. ✅ Authenticated
```

### EOA Users

```
1. Enter email → Supabase sends OTP
2. Verify code → Supabase session created
3. Connect wallet → AppKit/Wagmi
4. ✅ Authenticated
```

## Configuration

### Default (Recommended)

```bash
# .env.local - NO CONFIG NEEDED!
# Para JWTs sent directly, no auto-exchange
```

### Legacy Fallback (If Needed)

```bash
# .env.local
NEXT_PUBLIC_ENABLE_AUTO_JWT_EXCHANGE=true
NEXT_PUBLIC_USE_LEGACY_AUTH_PRIORITY=true
```

## Data Fetching (SWR)

```typescript
// Automatic caching, deduplication, revalidation
import { useUserData, useTickets, useFavorites } from '@/hooks/useServerData';

function MyComponent() {
  const { userData, email, loading } = useUserData();
  const { tickets, qrCodes } = useTickets();
  const { favorites, updateFavorite } = useFavorites();
}
```

**Benefits**: 90% fewer API calls, automatic cache management

## Wallet State

```typescript
// Use context hook, not useWalletManager directly
import { useWallet } from '@/context/WalletContext';

function MyComponent() {
  const { 
    isConnected,
    address,
    isPara,
    disconnect 
  } = useWallet();
}
```

## Protected Routes

All routes under `/api/auth/*` are automatically authenticated by `src/middleware.ts`:

```typescript
// src/middleware.ts applies verifyAuth to /api/auth/*
// Sets x-user-email and x-user-id headers

export async function POST(request: NextRequest) {
  const email = request.headers.get('x-user-email');
  const userId = request.headers.get('x-user-id');
  // User is authenticated by middleware
}
```

**Protected Routes:**

All routes under `/api/auth/*` require authentication using `fetchAuth()`:

- `/api/auth/user-data` - User profile data
- `/api/auth/tickets` - User tickets
- `/api/auth/favorites` - User favorites
- `/api/auth/relayer/prepare-authorization` - Prepare USDC transfer
- `/api/auth/relayer/execute-transfer` - Execute USDC transfer
- `/api/auth/relayer/clear-delegation` - Clear EIP-7702 delegation

```typescript
import { fetchAuth } from '@/services/apiClient';

// Automatically includes auth headers (JWT + X-Auth-Method)
const result = await fetchAuth('/api/auth/relayer/prepare-authorization', {
  method: 'POST',
  body: JSON.stringify({ from, to, amount })
});
```

**Public Routes:**

- `/api/relayer/check-simulation-mode` - System status check (no auth needed)

## Key Optimizations

✅ **Race Condition Fixed**: SWR pauses until Para JWT ready  
✅ **Console Spam Reduced**: Only essential logs  
✅ **Direct JWT**: No exchange endpoint needed  
✅ **Auto-provisioning**: devconnect_app_user created on-the-fly  
✅ **Hardcoded JWKS**: Para public keys embedded (zero network latency)  

- Instant verification (~0ms)
- Perfect for serverless/edge functions
- Auto-fallback to remote if keys rotate

✅ **JWT Persistence**: Para JWT stored in localStorage  

- 30-day expiration (Para default)
- Survives page refreshes
- Auto-cleared on logout
- Expiration validation before use

## Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_PARA_API_KEY=
NEXT_PUBLIC_WC_PROJECT_ID=

# Optional (legacy behavior)
NEXT_PUBLIC_ENABLE_AUTO_JWT_EXCHANGE=false  # Default
NEXT_PUBLIC_USE_LEGACY_AUTH_PRIORITY=false  # Default
```

## Troubleshooting

### Para not authenticating after logout/reconnect

**Symptom**: User data doesn't load after logging out and back in  
**Cause & Fix**:

- ✅ **JWT cache check**: Now checks for valid cached JWT (both memory and localStorage), not just if `issueJwt` function exists
- This prevents re-initialization when a valid JWT is already available
- Re-initialization only happens when JWT is expired or missing

**Verify it's working**:

- Check: `[PARA_JWT_INIT] Para JWT obtained successfully!` in console after reconnect
- Verify: `window.__paraJwt` is set
- Confirm: Biometric/OTP verification completed

### Still seeing /api/exchange-token
- Remove or set to `false`: `NEXT_PUBLIC_ENABLE_AUTO_JWT_EXCHANGE`
- Restart dev server
- Check console: `[AUTO_JWT_EXCHANGE] Disabled by default`

### User data not loading
- Verify JWT in Network tab: `Authorization: Bearer <token>`
- Check middleware logs: `[Para Auth] Verified Para JWT for user`
- Confirm database: `SELECT * FROM devconnect_app_user WHERE email = '...'`

## Security

- **Para JWT**: RS256 signature verified via JWKS
- **Supabase JWT**: HS256 verified by Supabase client
- **Token Expiry**: Para 30min, Supabase 1hr (auto-refresh)
- **RLS**: Database row-level security based on JWT claims

## EOA Flow Toggle

Add `?eoa=true` to URL to use external wallet flow instead of Para.

