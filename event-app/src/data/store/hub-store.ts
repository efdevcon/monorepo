import { provider } from "../providers/provider";
import { EventStore } from "./event-store";

/**
 * Second EventStore for the Community Hubs programme (see
 * `communityHubsDataset`). Same class, same IndexedDB tables (rows are keyed
 * by its own event id), separate sync: the hubs' sheets never mix with the
 * Pretalx schedule, and the Schedule tab switches between the two stores
 * with its "Programme / Community Hubs" segment.
 */
export const hubStore = new EventStore(provider);
