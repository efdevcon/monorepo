import * as esbuild from "esbuild";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const watch = process.argv.includes("--watch");
const dev = watch || process.env.NODE_ENV === "development";

// Devcon IPFS nodes, comma-separated base URLs (e.g. "https://a.ipfs.devcon.org,https://b.ipfs.devcon.org").
// Gateways serve blocks (stage 1); routers answer /routing/v1 and default to the same hosts.
// Unset → the worker skips stage 1 and goes straight to the public network.
const list = (value) => (value ?? "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
const gateways = list(process.env.DEVCON_IPFS_GATEWAYS);
const routers = process.env.DEVCON_IPFS_ROUTERS != null ? list(process.env.DEVCON_IPFS_ROUTERS) : gateways;
console.log(`ipfs-sw: ${gateways.length} Devcon gateway(s), ${routers.length} Devcon router(s)`);

const options = {
  absWorkingDir: root,
  entryPoints: ["src/sw/ipfs-sw.ts"],
  outfile: "public/ipfs-sw.js",
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  minify: !dev,
  sourcemap: dev ? "inline" : false,
  legalComments: "none",
  logLevel: "info",
  define: {
    "process.env.NODE_ENV": JSON.stringify(dev ? "development" : "production"),
    DEVCON_IPFS_CONFIG: JSON.stringify({ gateways, routers }),
  },
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
}
