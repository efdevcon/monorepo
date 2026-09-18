// Regression proof for EventStore catalogue persistence.
// Run: pnpm exec tsx scripts/test-event-store-persistence.ts

import type { Dataset } from "../src/data/dataset";
import type { IEventDataProvider } from "../src/data/providers/provider-interface";
import type {
  EventBundle,
  EventMetaRow,
  RoomRow,
  SessionRow,
  SpeakerRow,
} from "../src/data/store/types";

class FakeTable<T extends { eventId: string }> {
  constructor(public rows: T[]) {}

  where() {
    return {
      equals: (eventId: string) => ({
        toArray: async () => this.rows.filter((row) => row.eventId === eventId),
        delete: async () => {
          this.rows = this.rows.filter((row) => row.eventId !== eventId);
        },
      }),
    };
  }

  async bulkAdd(rows: T[]) {
    this.rows.push(...rows);
  }
}

class FakeMetaTable {
  constructor(public rows = new Map<string, EventMetaRow>()) {}

  async get(eventId: string) {
    return this.rows.get(eventId);
  }

  async put(row: EventMetaRow) {
    this.rows.set(row.eventId, { ...row });
  }
}

class FakeCatalogueDb {
  eventSessions: FakeTable<SessionRow>;
  eventSpeakers: FakeTable<SpeakerRow>;
  eventRooms: FakeTable<RoomRow>;
  eventMeta: FakeMetaTable;
  failNextTransaction = false;

  constructor(rows: {
    sessions: SessionRow[];
    speakers: SpeakerRow[];
    rooms: RoomRow[];
    meta: EventMetaRow;
  }) {
    this.eventSessions = new FakeTable(rows.sessions);
    this.eventSpeakers = new FakeTable(rows.speakers);
    this.eventRooms = new FakeTable(rows.rooms);
    this.eventMeta = new FakeMetaTable(new Map([[rows.meta.eventId, rows.meta]]));
  }

  async transaction(_mode: string, _tables: unknown[], work: () => Promise<void>) {
    if (this.failNextTransaction) {
      this.failNextTransaction = false;
      throw new Error("simulated IndexedDB write failure");
    }
    await work();
  }
}

const EVENT_ID = "devcon-7";
const T0 = Date.UTC(2024, 10, 13, 8, 30);
const dataset: Dataset = {
  key: EVENT_ID,
  label: "Devcon 7",
  apiUrl: "https://api.devcon.org",
  eventId: EVENT_ID,
  startDate: "2024-11-12T00:00:00Z",
  timezone: "Asia/Bangkok",
};

const oldRows = {
  sessions: [
    {
      eventId: EVENT_ID,
      id: "old-session",
      title: "Old persisted schedule",
      description: "",
      track: "",
      type: "Talk",
      expertise: "",
      tags: [],
      slotStart: T0,
      slotEnd: T0 + 30 * 60_000,
      speakerIds: [],
    },
  ],
  speakers: [],
  rooms: [],
  meta: {
    eventId: EVENT_ID,
    version: "v1",
    syncedAt: 1,
    checkedAt: 1,
    title: "Devcon 7",
  },
} satisfies {
  sessions: SessionRow[];
  speakers: SpeakerRow[];
  rooms: RoomRow[];
  meta: EventMetaRow;
};

const newBundle: EventBundle = {
  version: "v2",
  event: { id: EVENT_ID, title: "Devcon 7" },
  sessions: [
    {
      id: "new-session",
      title: "New remote schedule",
      slot_start: T0 + 60 * 60_000,
      slot_end: T0 + 90 * 60_000,
      speakerIds: [],
    },
  ],
  speakers: [],
  rooms: [],
};

class FakeProvider implements IEventDataProvider {
  bundleReads = 0;

  constructor(
    public version: string,
    public bundle: EventBundle
  ) {}

  async getVersion() {
    return this.version;
  }

  async getBundle() {
    this.bundleReads++;
    return this.bundle;
  }
}

async function main() {
  // cache-db creates its singleton only when window exists. Its Dexie tables are
  // replaced below before any IndexedDB operation is attempted.
  Object.defineProperty(globalThis, "window", {
    value: { location: { search: "" } },
    configurable: true,
  });

  const [{ cacheDB }, { EventStore }] = await Promise.all([
    import("../src/data/cache/cache-db"),
    import("../src/data/store/event-store"),
  ]);

  const installDb = (db: FakeCatalogueDb) => {
    for (const key of ["eventSessions", "eventSpeakers", "eventRooms", "eventMeta"] as const) {
      Object.defineProperty(cacheDB, key, { value: db[key], configurable: true });
    }
    Object.defineProperty(cacheDB, "transaction", {
      value: db.transaction.bind(db),
      configurable: true,
    });
  };

  let failed = 0;
  const check = (label: string, ok: boolean) => {
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  };

  {
    const v2Rows = structuredClone(oldRows);
    v2Rows.sessions[0].id = "v2-session";
    v2Rows.sessions[0].title = "Version 2 persisted schedule";
    v2Rows.meta.version = "v2";
    const db = new FakeCatalogueDb(v2Rows);
    installDb(db);

    const staleProvider = new FakeProvider("v2", newBundle);
    const storeA = new EventStore(staleProvider);
    await storeA.hydrate(dataset);

    const v3Bundle: EventBundle = {
      ...newBundle,
      version: "v3",
      sessions: newBundle.sessions.map((session) => ({
        ...session,
        id: "v3-session",
        title: "Version 3 persisted schedule",
      })),
    };
    const currentProvider = new FakeProvider("v3", v3Bundle);
    const storeB = new EventStore(currentProvider);
    await storeB.hydrate(dataset);
    await storeB.sync(dataset);

    await storeA.sync(dataset);

    const persistedMeta = await db.eventMeta.get(EVENT_ID);
    const persistedSessions = await db.eventSessions.where().equals(EVENT_ID).toArray();
    const reload = new EventStore(currentProvider);
    await reload.hydrate(dataset);

    check(
      "stale store cannot overwrite a newer catalogue's metadata",
      staleProvider.bundleReads === 0 &&
        persistedMeta?.version === "v3" &&
        persistedSessions[0]?.id === "v3-session" &&
        reload.getState().meta?.version === "v3" &&
        reload.getState().snapshot.sessions[0]?.id === "v3-session"
    );
  }

  {
    const db = new FakeCatalogueDb(structuredClone(oldRows));
    installDb(db);
    const provider = new FakeProvider("v2", newBundle);
    const firstLoad = new EventStore(provider);
    await firstLoad.hydrate(dataset);

    db.failNextTransaction = true;
    await firstLoad.sync(dataset);
    await firstLoad.sync(dataset);

    const beforeReloadMeta = await db.eventMeta.get(EVENT_ID);
    const beforeReloadSessions = await db.eventSessions.where().equals(EVENT_ID).toArray();
    const reload = new EventStore(provider);
    await reload.hydrate(dataset);
    await reload.sync(dataset);
    const afterReloadMeta = await db.eventMeta.get(EVENT_ID);
    const afterReloadSessions = await db.eventSessions.where().equals(EVENT_ID).toArray();

    check(
      "failed persist does not advance metadata alone",
      beforeReloadMeta?.version === "v1" && beforeReloadSessions[0]?.id === "old-session"
    );
    check(
      "reload refetches and repairs stale persisted rows",
      provider.bundleReads === 2 &&
        reload.getState().snapshot.sessions[0]?.id === "new-session" &&
        afterReloadMeta?.version === "v2" &&
        afterReloadSessions[0]?.id === "new-session"
    );
  }

  {
    const db = new FakeCatalogueDb(structuredClone(oldRows));
    installDb(db);
    const provider = new FakeProvider("v2", newBundle);
    const firstLoad = new EventStore(provider);
    await firstLoad.hydrate(dataset);
    await firstLoad.sync(dataset);
    await firstLoad.sync(dataset);

    const reload = new EventStore(provider);
    await reload.hydrate(dataset);
    await reload.sync(dataset);

    check(
      "successful persist avoids an unnecessary reload fetch",
      provider.bundleReads === 1 && reload.getState().snapshot.sessions[0]?.id === "new-session"
    );
  }

  {
    const db = new FakeCatalogueDb(structuredClone(oldRows));
    installDb(db);
    const provider = new FakeProvider("v2", newBundle);
    const firstLoad = new EventStore(provider);
    await firstLoad.hydrate(dataset);
    db.failNextTransaction = true;
    await firstLoad.sync(dataset);

    provider.version = "v3";
    provider.bundle = {
      ...newBundle,
      version: "v3",
      sessions: newBundle.sessions.map((session) => ({
        ...session,
        id: "v3-session",
        title: "Recovered schedule",
      })),
    };
    await firstLoad.sync(dataset);

    const reload = new EventStore(provider);
    await reload.hydrate(dataset);
    await reload.sync(dataset);
    const persistedMeta = await db.eventMeta.get(EVENT_ID);
    const persistedSessions = await db.eventSessions.where().equals(EVENT_ID).toArray();

    check(
      "a later version recovers the dirty persistence state",
      provider.bundleReads === 2 &&
        persistedMeta?.version === "v3" &&
        persistedSessions[0]?.id === "v3-session" &&
        reload.getState().snapshot.sessions[0]?.id === "v3-session"
    );
  }

  console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
  process.exit(failed ? 1 : 0);
}

main();
