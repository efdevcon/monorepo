import { DummyAdapter } from "./dummy.adapter";
import type { IEventDataAdapter } from "./adapter-interface";

/**
 * Singleton adapter instance
 */
export const adapter: IEventDataAdapter = new DummyAdapter();
