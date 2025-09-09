# Protected API Routes

All routes in this directory are automatically protected by authentication middleware.

## How it works

- Global middleware automatically protects all `/api/auth/*` routes
- Routes read user info from headers set by middleware
- No manual configuration needed

## Usage

### Add Protected Route

Just create your route in the `auth` directory:

```bash
# Create new protected route
mkdir src/app/api/auth/profile
touch src/app/api/auth/profile/route.ts
```

The middleware will automatically:

- ✅ Protect the route
- ✅ Inject user headers
- ✅ Handle authentication

### Route Handler

```typescript
// src/app/api/auth/profile/route.ts
export async function GET(request: NextRequest) {
  // verified user email
  const userEmail = request.headers.get('x-user-email')
  const userId = request.headers.get('x-user-id')
  
  // Your logic here
}
```

### Frontend

```typescript
import { fetchAuth } from '@/services/apiClient'
const response = await fetchAuth('/api/auth/tickets')
```

## Files

- `middleware.ts` - Auth verification logic
- `tickets/route.ts` - Example protected route
