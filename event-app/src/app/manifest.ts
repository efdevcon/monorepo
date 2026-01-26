import type { MetadataRoute } from "next";
import APP_CONFIG from "@/CONFIG";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_CONFIG.APP_NAME,
    short_name: APP_CONFIG.APP_NAME,
    description: APP_CONFIG.APP_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/app-icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
