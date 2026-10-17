// Read a dSheet's LIVE state the way an anonymous link editor's browser sees it.
// Works only for sheets shared "anyone with the link can edit" (the room key sits behind the link).
// Usage: node fileverse-live-export.mjs '<dsheets edit link with #k=...>' [out.json]
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";
import * as Y from "yjs";

const url = process.argv[2];
const out = process.argv[3];
const id = new URL(url).pathname.split("/sheet/")[1];
const t0 = Date.now();

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log(`[page ${m.type()}] ${m.text().slice(0, 200)}`); });
page.on("pageerror", (e) => console.log(`[page exception] ${String(e).slice(0, 200)}`));
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });

// Anonymous link editors are asked for a display name before the editor joins the live room
// (RTC_FLOW.md in fileverse-dsheets). Answer it if it shows up; never type into the sheet itself.
async function answerNamePrompt() {
  const input = page.locator('[role="dialog"] input:visible, [class*="modal" i] input:visible').first();
  if (!(await input.count())) return false;
  await input.fill("Devcon bot (read-only)");
  const confirm = page.locator('[role="dialog"] button:visible, [class*="modal" i] button:visible').filter({ hasText: /continue|join|start|save|done|ok|confirm|enter/i }).first();
  if (await confirm.count()) await confirm.click();
  else await input.press("Enter");
  console.log("answered the name prompt");
  return true;
}

async function diagnose(label) {
  const info = await page.evaluate(async () => ({
    url: location.href.replace(/#.*/, "#…"),
    title: document.title,
    dbs: indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : [],
    dialogs: [...document.querySelectorAll('[role="dialog"], [class*="modal" i]')].map((d) => d.innerText.trim().slice(0, 300)).filter(Boolean),
    text: document.body.innerText.trim().replace(/\s+/g, " ").slice(0, 400),
  })).catch((e) => ({ error: String(e) }));
  console.log(`[${label}] ${JSON.stringify(info)}`);
  await page.screenshot({ path: `${label}.png` }).catch(() => {});
}

// The editor persists its Y.Doc in IndexedDB under the sheet id. Poll until the export stops changing.
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
      resolve({ updates: all.map((v) => ({ b64: b64(v) })) });
    };
  });

let data = null;
let last = -1;
let stable = 0;
let answered = false;
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(2000);
  if (i === 2) await diagnose("after-load");
  if (!answered) answered = await answerNamePrompt().catch(() => false);
  data = await page.evaluate(exportIdb, id).catch(() => null);
  const size = data ? JSON.stringify(data).length : 0;
  if (data?.updates?.length && size === last) { if (++stable >= 3) break; } else stable = 0;
  last = size;
}
if (!data?.updates?.length) await diagnose("no-data");
await browser.close();
if (!data?.updates?.length) { console.error("no live data found in IndexedDB"); process.exit(1); }
if (out) writeFileSync(out, JSON.stringify(data));

const doc = new Y.Doc();
for (const u of data.updates) Y.applyUpdate(doc, new Uint8Array(Buffer.from(u.b64, "base64")));
const plain = (v) => (v instanceof Y.Map || v instanceof Y.Array ? v.toJSON() : v);
console.log(`synced in ${((Date.now() - t0) / 1000).toFixed(1)}s, ${data.updates.length} update blobs`);
for (const entry of doc.getArray(id).toArray()) {
  const get = (k) => (entry instanceof Y.Map ? entry.get(k) : entry?.[k]);
  const celldata = plain(get("celldata"));
  const rows = (Array.isArray(celldata) ? celldata : Object.values(celldata ?? {}))
    .map((e) => {
      const c = e?.v;
      if (!c || typeof c !== "object") return null;
      const runs = Array.isArray(c.ct?.s) ? c.ct.s.map((r) => String(r?.v ?? "")).join("") : "";
      const text = typeof c.m === "string" && c.m !== "" ? c.m : runs || (c.v == null ? "" : String(c.v));
      return text.trim() ? { r: Number(e.r), c: Number(e.c), text: text.trim() } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.r - b.r || a.c - b.c);
  console.log(`TAB "${get("name")}" ${rows.length} cells`);
  for (const x of rows) console.log(`  ${x.r + 1}\t${x.c}\t${x.text.slice(0, 80)}`);
}
