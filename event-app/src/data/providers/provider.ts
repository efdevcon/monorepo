import { DevconProvider } from "./devcon.provider";
import type { IEventDataProvider } from "./provider-interface";

/**
 * Singleton provider instance
 */
export const provider: IEventDataProvider = new DevconProvider();
