import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const isStaticExport = process.env.STATIC_EXPORT === "true";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development" || isStaticExport,
});

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ["lib"],
  ...(isStaticExport && { output: "export" }),
  // Static export: only .native-app.tsx (single catch-all router for Capacitor)
  // Web build: normal .tsx files with full Next.js routing
  pageExtensions: isStaticExport
    ? ["native-app.tsx", "native-app.ts"]
    : ["tsx", "ts", "jsx", "js"],
};

// Skip Serwist wrapper entirely for static export
export default isStaticExport ? nextConfig : withSerwist(nextConfig);
