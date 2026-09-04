# Data Providers

A provider is the one place that knows how to *fetch* an event's catalogue. Everything else
(caching, offline persistence, sync timing, the read model) is owned by the EventStore in
`src/data/store/`, so a provider is tiny and the app can run on another event's data by
swapping it.

## Contract (`provider-interface.ts`)

```ts
interface IEventDataProvider {
  getVersion(dataset: Dataset): Promise<string>;      // cheap change probe (60 bytes on devcon-api)
  getBundle(dataset: Dataset): Promise<EventBundle>;  // the whole catalogue in one response
}
```

`EventBundle` (`src/data/store/types.ts`) is `{ version, event, rooms, speakers, sessions }` with
sessions referencing speakers and rooms by id (`speakerIds`, `slot_roomId`), never embedding them.
The store refetches the bundle only when `getVersion` returns something other than the stored
version.

## Implementations

- **`devcon-api.provider.ts`** (active, see `provider.ts`): `GET {api}/events/:id/version` and
  `GET {api}/events/:id/bundle`. The version probe is fetched with `cache: "no-cache"` so the browser
  revalidates instead of serving its own 60 s copy.
- **`dummy.provider.ts`**: a fixed three-session bundle for development and tests.

## Usage

Components never touch providers. Use the hooks from `@/data/hooks`:

```ts
import { useSessions, useSpeaker, useRooms, useEvent } from "@/data/hooks";
```

## Creating a new provider

```ts
import type { Dataset } from "../dataset";
import type { EventBundle } from "../store/types";
import type { IEventDataProvider } from "./provider-interface";

export class MyProvider implements IEventDataProvider {
  async getVersion(dataset: Dataset) {
    return (await fetch(`https://my.api/${dataset.eventId}/version`)).text();
  }
  async getBundle(dataset: Dataset): Promise<EventBundle> {
    return (await fetch(`https://my.api/${dataset.eventId}/bundle`)).json();
  }
}
```

Then point `provider.ts` at it. In development the bundle is validated with zod
(`BundleSchema`); in production a structural check (`isBundleShaped`) runs on every sync.
