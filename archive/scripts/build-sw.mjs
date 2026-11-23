import * as esbuild from "esbuild";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const watch = process.argv.includes("--watch");
const dev = watch || process.env.NODE_ENV === "development";

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
  define: { "process.env.NODE_ENV": JSON.stringify(dev ? "development" : "production") },
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
}
