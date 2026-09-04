#!/usr/bin/env node
// Offline sweep for event-app. Warms the service worker and the EventStore
// online, then goes offline and drives the core routes, deep links, legacy
// redirects and a cross-section back/forward trip. Fails on any offline
// fallback, any document reload during client navigation, or any broken image.
//
// Usage: node scripts/offline-sweep.mjs --port 3100 [--dataset devcon-7]
// Requires: `pnpm preview --port 3100` running in event-app/ (build + serve).

import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const port = opt("port", "3100");
const dataset = opt("dataset", "devcon-7");
const base = `http://localhost:${port}`;
const q = `dataset=${dataset}`;

const cacheDir = path.join(os.homedir(), "Library/Caches/ms-playwright");
const shells = fs.existsSync(cacheDir)
  ? fs.readdirSync(cacheDir).filter((d) => d.startsWith("chromium_headless_shell-")).sort()
  : [];
if (!shells.length) throw new Error(`no chromium_headless_shell-* in ${cacheDir}; run: npx playwright install chromium --only-shell`);
const shellDir = path.join(cacheDir, shells[shells.length - 1]);
const exe = fs.readdirSync(shellDir, { recursive: true }).map(String).find((f) => f.endsWith("chrome-headless-shell"));
const executablePath = path.join(shellDir, exe);

let failed = 0;
const check = (label, ok, note = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${note ? ` (${note})` : ""}`);
};

const browser = await chromium.launch({ executablePath });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);

const requests = [];
page.on("request", (r) => requests.push(r.url()));

async function setOffline(offline) {
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
}

async function noOfflineFallback(label) {
  const heading = await page.locator("h1").first().textContent().catch(() => "");
  check(`${label}: not the offline fallback`, !/offline/i.test(heading ?? ""), heading ?? "");
}

async function noBrokenImages(label) {
  const broken = await page.evaluate(() =>
    [...document.images].filter((img) => img.src && img.complete && img.naturalWidth === 0).map((img) => img.src)
  );
  check(`${label}: no broken images`, broken.length === 0, broken.slice(0, 3).join(", "));
}

// ---- warm online -----------------------------------------------------------
const routes = ["/", "/schedule", "/speakers", "/map", "/announcements", "/ticket", "/room-screens"];
// `load`, not `networkidle`: the image warmer keeps the network busy for a while.
for (const route of routes) {
  await page.goto(`${base}${route}?${q}`, { waitUntil: "load" });
  await page.waitForTimeout(1500);
}
await page.goto(`${base}/schedule?${q}`, { waitUntil: "load" });
await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, { timeout: 30000 });
// Wait for the store to hold data and the image warmer to settle.
await page.waitForFunction(() => document.querySelectorAll('a[href^="/schedule?session="]').length > 0, null, { timeout: 30000 });
await page.waitForTimeout(8000);

const sessionIds = await page.evaluate(() =>
  [...document.querySelectorAll('a[href^="/schedule?session="]')].slice(0, 3).map((a) => new URL(a.href).searchParams.get("session"))
);
await page.goto(`${base}/speakers?${q}`, { waitUntil: "load" });
await page.waitForFunction(() => document.querySelectorAll('a[href^="/speakers?speaker="]').length > 0, null, { timeout: 30000 });
const speakerIds = await page.evaluate(() =>
  [...document.querySelectorAll('a[href^="/speakers?speaker="]')].slice(0, 3).map((a) => new URL(a.href).searchParams.get("speaker"))
);
check("collected ids", sessionIds.length === 3 && speakerIds.length === 3);

// ---- unchanged-schedule app open costs one tiny request ----------------------
requests.length = 0;
await page.goto(`${base}/schedule?${q}`, { waitUntil: "load" });
await page.waitForFunction(() => document.querySelectorAll('a[href^="/schedule?session="]').length > 0, null, { timeout: 30000 });
await page.waitForTimeout(2000);
const apiCalls = requests.filter((u) => /\/events\/[^/]+\/(version|bundle)/.test(u));
check("app open with unchanged schedule: version only", apiCalls.length === 1 && /version/.test(apiCalls[0]), apiCalls.join(", "));

// ---- offline ---------------------------------------------------------------
await setOffline(true);

for (const route of routes) {
  await page.goto(`${base}${route}?${q}`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await noOfflineFallback(`hard load ${route}`);
  await noBrokenImages(`hard load ${route}`);
}

for (const id of sessionIds) {
  await page.goto(`${base}/schedule?session=${encodeURIComponent(id)}&${q}`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await noOfflineFallback(`deep link session ${id}`);
  check(`deep link session ${id}: layer open`, (await page.locator('[role="dialog"][aria-label="Session details"]').count()) === 1);
}
for (const id of speakerIds) {
  await page.goto(`${base}/speakers?speaker=${encodeURIComponent(id)}&${q}`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await noOfflineFallback(`deep link speaker ${id}`);
  check(`deep link speaker ${id}: layer open`, (await page.locator('[role="dialog"][aria-label="Speaker details"]').count()) === 1);
}

// Legacy URLs redirect offline (served by the SW).
await page.goto(`${base}/schedule/${encodeURIComponent(sessionIds[0])}?${q}`, { waitUntil: "load" });
check("legacy /schedule/<id> redirects offline", new URL(page.url()).searchParams.get("session") === sessionIds[0], page.url());
await page.goto(`${base}/speakers/${encodeURIComponent(speakerIds[0])}?${q}`, { waitUntil: "load" });
check("legacy /speakers/<id> redirects offline", new URL(page.url()).searchParams.get("speaker") === speakerIds[0], page.url());

// Cross-section trip with no document reload. A marker on `window` survives
// pushState/popstate navigations but not a real document load, so its
// presence at the end proves every step was a client-side transition.
await page.goto(`${base}/schedule?${q}`, { waitUntil: "load" });
await page.evaluate(() => {
  window.__dcSweep = true;
});
// Element-level click: the first card can sit under the sticky day bar, which
// makes Playwright's pointer click give up. The app's handler is the same.
await page.locator('a[href^="/schedule?session="]').first().evaluate((a) => a.click());
await page.waitForSelector('[role="dialog"][aria-label="Session details"]');
const speakerLink = page.locator('[role="dialog"] a[href^="/speakers?speaker="]').first();
if ((await speakerLink.count()) > 0) {
  await speakerLink.evaluate((a) => a.click());
  await page.waitForSelector('[role="dialog"][aria-label="Speaker details"]');
  await page.goBack();
  await page.waitForSelector('[role="dialog"][aria-label="Session details"]');
}
await page.goBack();
await page.waitForTimeout(500);
check("cross-section trip closes the layer", (await page.locator('[role="dialog"]').count()) === 0);
await noOfflineFallback("after cross-section trip");
const sameDocument = await page.evaluate(() => window.__dcSweep === true);
check("no document reload during client navigation", sameDocument);

await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : "\nsweep passed");
process.exit(failed ? 1 : 0);
