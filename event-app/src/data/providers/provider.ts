// import { DevconProvider } from "./devcon.provider";
// import { DummyProvider } from "./dummy.provider";
import { DevconApiProvider } from "./devcon-api.provider";
import type { IEventDataProvider } from "./provider-interface";

/**
 * Singleton provider instance
 */
export const provider: IEventDataProvider = new DevconApiProvider();
