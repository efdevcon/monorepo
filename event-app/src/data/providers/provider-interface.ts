import type { Dataset } from "../dataset";
import type { EventBundle } from "../store/types";

/**
 * Contract for a catalogue source. One event = one bundle. The EventStore
 * (src/data/store) owns caching, offline persistence and sync; a provider only
 * knows how to fetch. Implement this to run the app on another event's data.
 */
export interface IEventDataProvider {
  /**
   * Cheap change probe: an opaque string that changes whenever the event's
   * catalogue changes. The store refetches the bundle only when it differs
   * from the stored one.
   */
  getVersion(dataset: Dataset): Promise<string>;

  /** The whole catalogue for one event in one response. */
  getBundle(dataset: Dataset): Promise<EventBundle>;
}
