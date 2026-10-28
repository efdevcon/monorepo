// First half of the hourly Community Hubs live export (fileverse-live-export.yml).
// Reads each hub dSheet's LIVE state the way an anonymous link editor's browser sees it:
// unpublished collaborator edits included. Works only for sheets shared "anyone with the
// link can edit" (the room key sits behind the link).
// Usage: COMMUNITY_HUB_SHEETS='{"<hub id>":"<edit link with #k=...>"}' node fileverse-live-export.mjs <out dir>
// Writes <out dir>/<hub id>.json: { dsheetId, updates: [base64...] } or { error }.
// devcon-api's `pnpm community-hubs:live <out dir>` turns them into cells.
// Links are secrets (anyone holding one can edit the sheet): never log them.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const CONCURRENCY = 4;
const out = process.argv[2];
if (!out) throw new Error("usage: fileverse-live-export.mjs <out dir>");
const links = JSON.parse(process.env.COMMUNITY_HUB_SHEETS || "{}");
const hubs = Object.entries(links).filter(([, url]) => typeof url === "string" && url.includes("#k="));
if (!hubs.length) throw new Error("COMMUNITY_HUB_SHEETS has no dSheets links");
mkdirSync(out, { recursive: true });

// The editor persists its Y.Doc in IndexedDB under the sheet id.
const exportIdb = (ID) =>
  new Promise(async (resolve) => {
    const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
    // Never open a database the editor hasn't created yet: indexedDB.open() would create it
    // empty at version 1, and the editor's own open then finds no object stores and breaks.
    const names = indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : [];
    if (!names.includes(ID)) return resolve(null);
    const req = indexedDB.open(ID);
    req.onerror = () => resolve(null);
    req.onsuccess = async () => {
      const db = req.result;
      if (![...db.objectStoreNames].includes("updates")) return resolve(null);
      const all = await new Promise((ok) => { const r = db.transaction("updates").objectStore("updates").getAll(); r.onsuccess = () => ok(r.result); r.onerror = () => ok([]); });
      resolve(all.map((v) => b64(v)));
    };
  });

async function exportHub(browser, hubId, url) {
  const t0 = Date.now();
  const dsheetId = new URL(url).pathname.split("/sheet/")[1];
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log(`[${hubId}] page exception: ${String(e).slice(0, 160)}`));
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    // Anonymous link editors are asked for a display name before the editor joins the live
    // room (RTC_FLOW.md in fileverse-dsheets). Answer it; never type into the sheet itself.
    let answered = false;
    let updates = null;
    let last = -1;
    let stable = 0;
    // A healthy sheet is read in 13-26 s. A load that broke (a script chunk that failed
    // to download leaves an empty page that never recovers) is reloaded after 30 s
    // without data, at most twice, and the sheet gives up after 90 s.
    for (let i = 0; i < 45; i++) {
      if (i > 0 && i % 15 === 0 && !updates?.length) {
        console.log(`[${hubId}] no data after ${Math.round((Date.now() - t0) / 1000)}s, reloading`);
        await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => {});
        answered = false;
      }
      await page.waitForTimeout(2000);
      if (!answered) {
        const input = page.locator('[role="dialog"] input:visible, [class*="modal" i] input:visible').first();
        if (await input.count().catch(() => 0)) {
          await input.fill("Devcon bot (read-only)");
          const confirm = page.locator('[role="dialog"] button:visible, [class*="modal" i] button:visible').filter({ hasText: /continue|join|start|save|done|ok|confirm|enter/i }).first();
          if (await confirm.count()) await confirm.click();
          else await input.press("Enter");
          answered = true;
        }
      }
      updates = await page.evaluate(exportIdb, dsheetId).catch(() => null);
      const size = updates ? updates.reduce((n, u) => n + u.length, 0) : 0;
      // Done once the stored document stops growing for three polls in a row.
      if (updates?.length && size === last) { if (++stable >= 3) break; } else stable = 0;
      last = size;
    }
    if (!updates?.length) {
      const text = await page.evaluate(() => document.body.innerText.trim().replace(/\s+/g, " ").slice(0, 200)).catch(() => "");
      await page.screenshot({ path: join(out, `${hubId}-no-data.png`) }).catch(() => {});
      throw new Error(`no live data after ${Math.round((Date.now() - t0) / 1000)}s (page says: ${text || "nothing"})`);
    }
    writeFileSync(join(out, `${hubId}.json`), JSON.stringify({ dsheetId, updates }));
    console.log(`[${hubId}] ${updates.length} update blob(s) in ${Math.round((Date.now() - t0) / 1000)}s`);
    return true;
  } catch (error) {
    const message = String(error?.message ?? error).split("\n")[0].replace(/#k=[^\s"')]*/g, "#k=…");
    writeFileSync(join(out, `${hubId}.json`), JSON.stringify({ error: message }));
    console.log(`[${hubId}] FAILED: ${message}`);
    return false;
  } finally {
    await context.close().catch(() => {});
  }
}

const browser = await chromium.launch();
let next = 0;
let ok = 0;
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, hubs.length) }, async () => {
    while (next < hubs.length) {
      const [hubId, url] = hubs[next++];
      if (await exportHub(browser, hubId, url)) ok++;
    }
  })
);
await browser.close();
console.log(`${ok}/${hubs.length} hub sheets exported`);
if (!ok) process.exit(1);
