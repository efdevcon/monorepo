# Data Providers

The provider system enforces data contracts and optionally validates responses using Zod schemas.

## Purpose

Providers fetch data from various sources (APIs, databases, static files) and ensure all data conforms to the defined models through (optional) runtime validation.

The structure allows us to easily switch out the data provider so long as it conforms to the models, with the goal of democraticing the event app/let users easily fork and run the app for their own events using their own data sources.

## Architecture

- **`provider-interface.ts`** - Defines the `IEventDataProvider` interface and `BaseProvider` class
- **`provider.ts`** - Singleton provider instance (currently `DummyProvider`)
- **`dummy.provider.ts`** - Sample implementation with hardcoded data

## Usage

Components don't use providers directly. Instead, use the hooks from `@/data/hooks`:

```typescript
import { useSessions, useSpeakers, useRooms } from "@/data/hooks";
```

The hooks handle provider interaction, caching, and data fetching automatically.

## Creating a New Provider

Extend `BaseProvider` and implement the required methods:

```typescript
import { BaseProvider, type SessionFilters } from "./provider-interface";

class MyProvider extends BaseProvider {
  async getSessions(filters?: SessionFilters) {
    const rawData = await fetch("/api/sessions").then((r) => r.json());
    return this.validateSessions(rawData); // Zod validation
  }

  // Implement other required methods...
}
```

Then update `provider.ts` to use your new provider:

```typescript
export const provider = new MyProvider();
```
