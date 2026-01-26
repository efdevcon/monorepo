import type { CapacitorConfig } from "@capacitor/cli";
import APP_CONFIG from "./src/CONFIG";

const config: CapacitorConfig = {
  appId: "com.ethglobal.eventapp",
  appName: APP_CONFIG.APP_NAME,
  webDir: "out",
  server: {
    // Fallback to index.html for SPA routing
    androidScheme: "https",
  },
};

export default config;
