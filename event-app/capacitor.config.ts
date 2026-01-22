import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ethglobal.eventapp",
  appName: "ETHGlobal",
  webDir: "out",
  server: {
    // Fallback to index.html for SPA routing
    androidScheme: "https",
  },
};

export default config;
