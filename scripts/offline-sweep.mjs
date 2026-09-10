#!/usr/bin/env node
// Offline sweep for event-app. Warms the service worker and the EventStore
// online, then goes offline and drives the core routes, detail deep links and
// a cross-section back/forward trip, on a phone and on a desktop viewport.
// Fails on any offline fallback, any document reload during client
// navigation, any broken image, or a layout squeezed into a gutter.
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

const SESSION_LINK = 'a[href^="/schedule/"]';
const SPEAKER_LINK = 'a[href^="/speakers/"]';
const idOf = (href) => decodeURIComponent(new URL(href).pathname.split("/").pop());

const browser = await chromium.launch({ executablePath });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();

const requests = [];
page.on("request", (r) => requests.push(r.url()));

// Offline must be Playwright's `context.setOffline(true)`: it reaches the
// service worker's own fetches. A raw CDP `Network.emulateNetworkConditions`
// on the page target leaves the SW online, so "offline" document loads were
// quietly fetched from the server and proved nothing about the caches.

async function noOfflineFallback(p, label) {
  const heading = await p.locator("h1").first().textContent().catch(() => "");
  check(`${label}: not the offline fallback`, !/offline/i.test(heading ?? ""), heading ?? "");
}

// Layout guard: a page root squeezed into a gutter column (a grid-placement
// regression) renders "fine" to every DOM count check but is unusable.
async function contentFillsViewport(p, label) {
  const w = await p.evaluate(() => {
    const main = document.querySelector("main");
    return main ? Math.round(main.getBoundingClientRect().width) : null;
  });
  if (w === null) return; // routes without a <main> (map) are exempt
  const viewport = p.viewportSize()?.width ?? 390;
  check(`${label}: content fills the viewport`, w >= viewport * 0.8, `main width ${w}px of ${viewport}`);
}

// Nothing may be wider than the screen: a long unbroken string inside the
// fixed detail layer once widened it to 560px on a 390px phone, and iOS
// Safari answers that by widening the layout viewport ("broken viewport").
async function noHorizontalOverflow(p, label) {
  const o = await p.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    return {
      doc: document.documentElement.scrollWidth - innerWidth,
      dialog: dialog ? dialog.scrollWidth - dialog.clientWidth : 0,
    };
  });
  check(`${label}: no horizontal overflow`, o.doc <= 1 && o.dialog <= 1, `document +${o.doc}px, layer +${o.dialog}px`);
}

async function noBrokenImages(p, label) {
  const broken = await p.evaluate(() =>
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
await page.waitForFunction((sel) => document.querySelectorAll(sel).length > 0, SESSION_LINK, { timeout: 30000 });
await page.waitForTimeout(8000);

const sessionIds = await page.evaluate(
  ([sel]) => [...document.querySelectorAll(sel)].slice(0, 3).map((a) => decodeURIComponent(new URL(a.href).pathname.split("/").pop())),
  [SESSION_LINK]
);
await page.goto(`${base}/speakers?${q}`, { waitUntil: "load" });
await page.waitForFunction((sel) => document.querySelectorAll(sel).length > 0, SPEAKER_LINK, { timeout: 30000 });
const speakerIds = await page.evaluate(
  ([sel]) => [...document.querySelectorAll(sel)].slice(0, 3).map((a) => decodeURIComponent(new URL(a.href).pathname.split("/").pop())),
  [SPEAKER_LINK]
);
check("collected ids", sessionIds.length === 3 && speakerIds.length === 3, `${sessionIds.join(",")} / ${speakerIds.join(",")}`);

// ---- unchanged-schedule app open costs one tiny request ----------------------
requests.length = 0;
await page.goto(`${base}/schedule?${q}`, { waitUntil: "load" });
await page.waitForFunction((sel) => document.querySelectorAll(sel).length > 0, SESSION_LINK, { timeout: 30000 });
await page.waitForTimeout(2000);
const apiCalls = requests.filter((u) => /\/events\/[^/]+\/(version|bundle)/.test(u));
check("app open with unchanged schedule: version only", apiCalls.length === 1 && /version/.test(apiCalls[0]), apiCalls.join(", "));

// ---- search drawer steps aside for a detail, keeps its query ----------------
await page.locator('button[aria-label="Search sessions"]').first().evaluate((b) => b.click());
// Scoped to the header: the desktop toolbar has a second, CSS-hidden input.
const searchInput = page.locator('header input[placeholder^="Search by session"]');
await searchInput.waitFor({ timeout: 5000 });
await searchInput.fill("the");
await page.waitForTimeout(400);
await page.locator(SESSION_LINK).first().evaluate((a) => a.click());
await page.waitForSelector('[role="dialog"][aria-label="Session details"]');
check("search drawer hidden while a session is open", (await searchInput.count()) === 0);
await page.goBack();
await page.waitForTimeout(500);
check("search drawer back with its query after close", (await searchInput.count()) === 1 && (await searchInput.inputValue()) === "the");
await page.locator('button[aria-label="Close search"]').first().evaluate((b) => b.click()).catch(() => {});

// ---- offline ---------------------------------------------------------------
await context.setOffline(true);

for (const route of routes) {
  await page.goto(`${base}${route}?${q}`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await noOfflineFallback(page, `hard load ${route}`);
  await contentFillsViewport(page, `hard load ${route}`);
  await noBrokenImages(page, `hard load ${route}`);
}

// Detail pages are real paths served offline from the precached tab shell;
// the URL must stay put (no redirect, no /offline) and the page must render.
for (const id of sessionIds) {
  await page.goto(`${base}/schedule/${encodeURIComponent(id)}?${q}`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await noOfflineFallback(page, `deep link session ${id}`);
  check(`deep link session ${id}: URL kept`, new URL(page.url()).pathname === `/schedule/${encodeURIComponent(id)}`, page.url());
  check(`deep link session ${id}: layer open`, (await page.locator('[role="dialog"][aria-label="Session details"]').count()) === 1);
  const sessionText = await page.evaluate(() => document.querySelector('[role="dialog"]')?.textContent ?? "");
  check(`deep link session ${id}: content, not "not found"`, sessionText.length > 0 && !/not found/i.test(sessionText));
  await noHorizontalOverflow(page, `deep link session ${id}`);
}
for (const id of speakerIds) {
  await page.goto(`${base}/speakers/${encodeURIComponent(id)}?${q}`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await noOfflineFallback(page, `deep link speaker ${id}`);
  check(`deep link speaker ${id}: URL kept`, new URL(page.url()).pathname === `/speakers/${encodeURIComponent(id)}`, page.url());
  check(`deep link speaker ${id}: layer open`, (await page.locator('[role="dialog"][aria-label="Speaker details"]').count()) === 1);
  const speakerText = await page.evaluate(() => document.querySelector('[role="dialog"]')?.textContent ?? "");
  check(`deep link speaker ${id}: content, not "not found"`, speakerText.length > 0 && !/not found/i.test(speakerText));
  await noHorizontalOverflow(page, `deep link speaker ${id}`);
}

// Unknown routes still get the offline fallback (nothing else can serve them).
await page.goto(`${base}/no-such-route?${q}`, { waitUntil: "load" });
check("unknown route offline shows the fallback", /offline/i.test((await page.locator("h1").first().textContent().catch(() => "")) ?? ""));

// Cross-section trip with no document reload. A marker on `window` survives
// pushState/popstate navigations but not a real document load, so its
// presence at the end proves every step was a client-side transition.
await page.goto(`${base}/schedule?${q}`, { waitUntil: "load" });
await page.waitForFunction((sel) => document.querySelectorAll(sel).length > 0, SESSION_LINK, { timeout: 15000 }).catch(async () => {
  console.log("DIAG offline /schedule without cards:", await page.evaluate(() => document.body.innerText.slice(0, 300).replace(/\n+/g, " | ")));
});
await page.evaluate(() => {
  window.__dcSweep = true;
});
// Element-level click: the first card can sit under the sticky day bar, which
// makes Playwright's pointer click give up. The app's handler is the same.
await page.locator(SESSION_LINK).first().evaluate((a) => a.click());
await page.waitForSelector('[role="dialog"][aria-label="Session details"]');
check("card tap opens the session page URL", /^\/schedule\/[^/]+$/.test(new URL(page.url()).pathname), page.url());
const speakerLink = page.locator(`[role="dialog"] ${SPEAKER_LINK}`).first();
if ((await speakerLink.count()) > 0) {
  await speakerLink.evaluate((a) => a.click());
  await page.waitForSelector('[role="dialog"][aria-label="Speaker details"]');
  check("speaker link switches to the speaker page URL", /^\/speakers\/[^/]+$/.test(new URL(page.url()).pathname), page.url());
  await page.goBack();
  await page.waitForSelector('[role="dialog"][aria-label="Session details"]');
}
// Header back arrow closes the page (history.back on our own entry).
await page.locator('button[aria-label="Back"]').first().evaluate((b) => b.click());
await page.waitForTimeout(500);
check("back arrow closes the page", (await page.locator('[role="dialog"]').count()) === 0 && new URL(page.url()).pathname === "/schedule", page.url());
await noOfflineFallback(page, "after cross-section trip");
const sameDocument = await page.evaluate(() => window.__dcSweep === true);
check("no document reload during client navigation", sameDocument);

// Deep link + back arrow never leaves the app (first history entry).
await page.goto(`${base}/speakers/${encodeURIComponent(speakerIds[0])}?${q}`, { waitUntil: "load" });
await page.waitForSelector('[role="dialog"][aria-label="Speaker details"]');
await page.locator('button[aria-label="Back"]').first().evaluate((b) => b.click());
await page.waitForTimeout(500);
check("deep link back arrow lands on the list", new URL(page.url()).pathname === "/speakers" && (await page.locator(SPEAKER_LINK).count()) > 0, page.url());

// ---- desktop: side panel is local, the URL is the fullscreen page ----------
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const dpage = await desktop.newPage();
await dpage.goto(`${base}/schedule?${q}`, { waitUntil: "load" });
await dpage.waitForFunction((sel) => document.querySelectorAll(sel).length > 0, SESSION_LINK, { timeout: 30000 });
await dpage.waitForTimeout(1500);
await dpage.locator(SESSION_LINK).first().evaluate((a) => a.click());
await dpage.waitForTimeout(500);
const panelClose = dpage.locator('button[aria-label="Close session details"]');
check("desktop card click opens the side panel, URL unchanged", (await panelClose.count()) === 1 && new URL(dpage.url()).pathname === "/schedule", dpage.url());
const historyBefore = await dpage.evaluate(() => history.length);
await panelClose.evaluate((b) => b.click());
await dpage.waitForTimeout(600);
check("desktop panel closes with one click, no history entry", (await dpage.locator('aside[aria-hidden="true"]').count()) >= 1 && (await dpage.evaluate(() => history.length)) === historyBefore);

await desktop.setOffline(true);
await dpage.goto(`${base}/schedule/${encodeURIComponent(sessionIds[1])}?${q}`, { waitUntil: "load" });
await dpage.waitForTimeout(800);
await noOfflineFallback(dpage, "desktop deep link offline");
const visibleLinks = (p) => p.evaluate((sel) => [...document.querySelectorAll(sel)].filter((a) => a.offsetParent !== null).length, SESSION_LINK);
check("desktop deep link renders the fullscreen page, list hidden", (await dpage.locator("main main").count()) === 1 && (await visibleLinks(dpage)) === 0);
await noHorizontalOverflow(dpage, "desktop deep link");
await dpage.locator("main main button:has-text('Back')").first().evaluate((b) => b.click());
await dpage.waitForTimeout(500);
check("desktop back returns to the list", new URL(dpage.url()).pathname === "/schedule" && (await visibleLinks(dpage)) > 0, dpage.url());
await desktop.close();

await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : "\nsweep passed");
process.exit(failed ? 1 : 0);
