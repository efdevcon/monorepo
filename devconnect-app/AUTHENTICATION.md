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
| `src/app/api/auth/middleware.ts` | JWT verification + user provisioning |
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

```typescript
// src/app/api/auth/middleware.ts
// Automatically verifies JWT and injects user info

export async function GET(request: NextRequest) {
  const email = request.headers.get('x-user-email');
  // User is authenticated by middleware
}
```

## Key Optimizations

✅ **Race Condition Fixed**: SWR pauses until Para JWT ready  
✅ **Console Spam Reduced**: Only essential logs  
✅ **Direct JWT**: No exchange endpoint needed  
✅ **Auto-provisioning**: devconnect_app_user created on-the-fly

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

### Para not authenticating
- Check: `[PARA_JWT_INIT] Para JWT obtained successfully!` in console
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

