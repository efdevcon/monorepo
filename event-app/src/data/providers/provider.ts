import { DummyProvider } from "./dummy.provider";
import type { IEventDataProvider } from "./provider-interface";

/**
 * Singleton provider instance
 */
export const provider: IEventDataProvider = new DummyProvider();
