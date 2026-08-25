#!/usr/bin/env node
// Screenshot harness for visual verification of local dev servers.
// Standard tool for agent-driven UI checks (see <project>/.claude/skills/verify).
//
// Usage:
//   node scripts/shot.mjs <path> --port <port> [options]
//
//   <path>              Route to capture, e.g. / or /schedule (or a full http:// URL)
//   --port <port>       REQUIRED. Dev server port. Deliberately has no default:
//                       devcon and event-app both default to 3000 and whichever
//                       started second lands on 3001 — confirm which server owns
//                       the port before shooting.
//   --widths <list>     Comma-separated viewport widths (default: 390,768,1440).
//                       Widths < 768 are captured with mobile emulation
//                       (isMobile + hasTouch) so (hover: none)/(pointer: coarse)
//                       media queries match, same as a real phone.
//   --out <dir>         Output directory (default: .screenshots, relative to cwd)
//   --full-page         Capture the full scrollable page instead of the viewport
//   --selector <css>    Capture just the first element matching this selector
//   --wait <ms>         Extra settle time after load (default: 500)
//   --mock-now <value>  Appended as ?mockNow=<value> (event-app/devcon time mocking)
//
// Output files: <out>/<route>-<width>[-full|-el].png  (route slashes become dashes)

import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

function fail(msg) {
  console.error(`shot.mjs: ${msg}`);
  process.exit(1);
}

// --- arg parsing -----------------------------------------------------------
const argv = process.argv.slice(2);
const opts = { widths: [390, 768, 1440], out: ".screenshots", wait: 500 };
let route;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--port") opts.port = Number(argv[++i]);
  else if (a === "--widths") opts.widths = argv[++i].split(",").map(Number);
  else if (a === "--out") opts.out = argv[++i];
  else if (a === "--full-page") opts.fullPage = true;
  else if (a === "--selector") opts.selector = argv[++i];
  else if (a === "--wait") opts.wait = Number(argv[++i]);
  else if (a === "--mock-now") opts.mockNow = argv[++i];
  else if (a.startsWith("--")) fail(`unknown flag ${a}`);
  else route = a;
}
if (!route) fail("missing <path> argument (e.g. / or /schedule)");
if (!route.startsWith("http") && !opts.port) {
  fail("--port is required. Check which dev server owns the port first (devcon vs event-app both default to 3000).");
}
if (opts.widths.some(Number.isNaN)) fail("--widths must be comma-separated numbers");

let url = route.startsWith("http") ? route : `http://localhost:${opts.port}${route.startsWith("/") ? route : `/${route}`}`;
if (opts.mockNow) url += `${url.includes("?") ? "&" : "?"}mockNow=${encodeURIComponent(opts.mockNow)}`;

// --- locate cached headless chromium ---------------------------------------
const cacheDir = path.join(os.homedir(), "Library/Caches/ms-playwright");
const shells = fs.existsSync(cacheDir)
  ? fs.readdirSync(cacheDir).filter((d) => d.startsWith("chromium_headless_shell-")).sort()
  : [];
if (!shells.length) fail(`no chromium_headless_shell-* found in ${cacheDir} — run: npx playwright install chromium --only-shell`);
const shellDir = path.join(cacheDir, shells[shells.length - 1]);
const exe = fs
  .readdirSync(shellDir, { recursive: true })
  .map(String)
  .find((f) => f.endsWith("chrome-headless-shell") || f.endsWith("headless_shell.exe"));
if (!exe) fail(`no headless shell binary inside ${shellDir}`);
const executablePath = path.join(shellDir, exe);

// --- capture ----------------------------------------------------------------
fs.mkdirSync(opts.out, { recursive: true });
const slug = (route.startsWith("http") ? new URL(route).pathname : route.split("?")[0])
  .replace(/^\/+|\/+$/g, "")
  .replace(/\//g, "-") || "home";

const browser = await chromium.launch({ executablePath });
try {
  for (const width of opts.widths) {
    const mobile = width < 768;
    const context = await browser.newContext({
      viewport: { width, height: mobile ? Math.round(width * 2.16) : 900 },
      isMobile: mobile,
      hasTouch: mobile,
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch((e) => {
      fail(`navigation to ${url} failed (${e.message}) — is the dev server running on port ${opts.port}?`);
    });
    if (resp && resp.status() >= 400) fail(`${url} returned HTTP ${resp.status()} at ${width}px`);
    await page.waitForTimeout(opts.wait);

    const suffix = opts.selector ? "-el" : opts.fullPage ? "-full" : "";
    const file = path.join(opts.out, `${slug}-${width}${suffix}.png`);
    if (opts.selector) {
      const el = page.locator(opts.selector).first();
      await el.scrollIntoViewIfNeeded();
      await el.screenshot({ path: file });
    } else {
      await page.screenshot({ path: file, fullPage: !!opts.fullPage });
    }
    console.log(`${file}  (${width}px${mobile ? ", mobile emulation" : ""})`);
    await context.close();
  }
} finally {
  await browser.close();
}
