import { spawnSync } from "node:child_process";
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const isStaticExport = process.env.STATIC_EXPORT === "true";

// Revision string for the cache-bust key of additionalPrecacheEntries.
// When HEAD changes, the SW refetches the entries on next install.
const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" })
    .stdout?.trim() || crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development" || isStaticExport,
  cacheOnNavigation: false,
  // Precache the core app-shell routes so they boot offline / on first launch.
  additionalPrecacheEntries: [
    { url: "/", revision },
    { url: "/schedule", revision },
    { url: "/speakers", revision },
    { url: "/login", revision },
  ],
  reloadOnOnline: false,
  exclude: [
    /build-manifest\.json$/,
    /react-loadable-manifest\.json$/,
    /middleware-manifest\.json$/,
    /\/server\//,
    // Match app/api/... AND app/(group)/api/... so route groups don't slip through
    /\/app\/(?:\([^)]+\)\/)?api\//,
    /\/route-[a-f0-9]+\.js$/,
  ],
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
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
};

// Skip Serwist wrapper entirely for static export
export default isStaticExport ? nextConfig : withSerwist(nextConfig);
