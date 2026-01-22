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
};

// Skip Serwist wrapper entirely for static export
export default isStaticExport ? nextConfig : withSerwist(nextConfig);
