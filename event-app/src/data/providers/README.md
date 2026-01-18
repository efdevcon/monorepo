# Data Providers

The adapter system enforces data contracts and optionally validates responses using Zod schemas.

## Purpose

Adapters fetch data from various sources (APIs, databases, static files) and ensure all data conforms to the defined models through (optional) runtime validation.

The structure allows us to easily switch out the data provider so long as it conforms to the models, with the goal of democraticing the event app/let users easily fork and run the app for their own events using their own data sources.

## Architecture

- **`adapter.types.ts`** - Defines the `IEventDataAdapter` interface
- **`base.adapter.ts`** - Base class with Zod validation helpers
- **`adapter.ts`** - Singleton adapter instance (currently `DummyAdapter`)
- **`dummy.adapter.ts`** - Sample implementation with hardcoded data

## Usage

Components don't use adapters directly. Instead, use the hooks from `@/data/hooks`:

```typescript
import { useSessions, useSpeakers, useRooms } from "@/data/hooks";
```

The hooks handle adapter interaction, caching, and data fetching automatically.

## Creating a New Adapter

Extend `BaseAdapter` and implement the required methods:

```typescript
import { BaseAdapter, type SessionFilters } from "./adapter-interface";

class MyAdapter extends BaseAdapter {
  async getSessions(filters?: SessionFilters) {
    const rawData = await fetch("/api/sessions").then((r) => r.json());
    return this.validateSessions(rawData); // Zod validation
  }

  // Implement other required methods...
}
```

Then update `adapter.ts` to use your new adapter:

```typescript
export const adapter = new MyAdapter();
```
