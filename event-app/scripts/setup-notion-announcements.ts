// One-time setup: shapes the (empty) Notion database the team will manage
// into the schema /api/announcements expects. Idempotent: re-running is safe.
//
//   NOTION_SECRET=... pnpm announcements:setup-notion [--seed] [--dry-run]
//
// --seed inserts one sample row so the pipeline can be tested end to end.
// --dry-run prints the property changes and the description it would write,
// and writes nothing.
// Ported from ens-page/scripts/setup-notion-db.ts (the links DB setup).
import "dotenv/config";
import { TEST_AUDIENCES } from "../src/app/api/announcements/testPush";

const NOTION_VERSION = "2022-06-28";
// Same default as src/app/api/announcements/service.ts; the id is not secret.
const DEFAULT_DB_ID = "3b9638cdc4158035a9abcff224f3034a";
const secret = process.env.NOTION_SECRET;
const dbId = process.env.NOTION_ANNOUNCEMENTS_DB_ID ?? DEFAULT_DB_ID;
const appOrigin = process.env.APP_ORIGIN ?? "https://app.devcon.org";
// The plain-language guide for editors (event-app/docs/push.md on main).
const guideUrl = "https://github.com/efdevcon/monorepo/blob/main/event-app/docs/push.md";
const dryRun = process.argv.includes("--dry-run");
if (!secret) {
  console.error("NOTION_SECRET is required");
  process.exit(1);
}

async function notion(path: string, method: string, body?: unknown): Promise<any> {
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`Notion ${method} ${path} failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

/** The links this script owns; whatever follows the last of them in the live description was added by hand. */
const ownedLinks = [
  `${appOrigin}/announcements?preview`,
  `${appOrigin}/api/announcements/refresh`,
  guideUrl,
];

/**
 * Hand-written chunks after our links in the live description, re-shaped as
 * API input (the GET shape carries read-only fields the PATCH rejects).
 */
function trailingChunks(current: any[]): unknown[] {
  const owned = (href: string | null | undefined) =>
    !!href && ownedLinks.some((u) => href.replace(/=$/, "") === u);
  let last = -1;
  current.forEach((chunk, i) => {
    if (owned(chunk.href ?? chunk.text?.link?.url)) last = i;
  });
  if (last < 0) return [];
  return current.slice(last + 1).map((chunk) =>
    chunk.type === "mention"
      ? { type: "mention", mention: chunk.mention, annotations: chunk.annotations }
      : { type: "text", text: chunk.text, annotations: chunk.annotations }
  );
}

async function main(): Promise<void> {
  const db = await notion(`databases/${dbId}`, "GET");
  const existing: Record<string, { type: string }> = db.properties;

  // The default title property is usually called "Name"; rename it to Title.
  const titleProp = Object.entries(existing).find(([, p]) => p.type === "title");
  if (!titleProp) throw new Error("database has no title property");

  const properties: Record<string, unknown> = {};
  if (titleProp[0] !== "Title") properties[titleProp[0]] = { name: "Title" };
  if (existing.Tags) properties.Tags = null; // drop Notion's default Tags column
  if (!existing.Message) properties.Message = { rich_text: {} };
  if (!existing.URL) properties.URL = { url: {} };
  if (!existing["Send At"]) properties["Send At"] = { date: {} };
  // Phase 2: rows with Push checked also go out as a web push at Send At.
  if (!existing.Push) properties.Push = { checkbox: {} };
  if (!existing.Visible) properties.Visible = { checkbox: {} };
  // Test sends: each box rehearses the row on one small audience (team
  // devices, or the product team only) without touching the real send.
  for (const { property } of Object.values(TEST_AUDIENCES)) {
    if (!existing[property]) properties[property] = { checkbox: {} };
  }
  // Announcement = time-first inbox item; Highlight = evergreen image card on
  // the home screen (curated by Order, never pushed, no unread state).
  if (!existing.Type) {
    properties.Type = {
      select: {
        options: [
          { name: "Announcement", color: "purple" },
          { name: "Highlight", color: "yellow" },
        ],
      },
    };
  }
  if (!existing.Image) properties.Image = { files: {} };
  if (!existing.Order) properties.Order = { number: { format: "number" } };

  if (Object.keys(properties).length > 0) {
    if (dryRun) {
      console.log("would update properties:", Object.keys(properties).join(", "));
    } else {
      await notion(`databases/${dbId}`, "PATCH", { properties });
      console.log("updated properties:", Object.keys(properties).join(", "));
    }
  } else {
    console.log("schema already up to date");
  }

  const updated = dryRun ? db : await notion(`databases/${dbId}`, "GET");
  for (const required of [
    "Title", "Message", "URL", "Send At", "Push", "Visible", "Type", "Image", "Order",
    ...Object.values(TEST_AUDIENCES).map((a) => a.property),
  ]) {
    if (!updated.properties[required] && !(dryRun && properties[required])) {
      throw new Error(`property ${required} missing after update`);
    }
  }
  console.log("schema OK:", Object.keys(updated.properties).join(", "));

  // Editor-facing instructions shown under the database title, including the
  // one-click "publish" link (syncs to the app + purges the feed's CDN cache)
  // and the guide. Anything editors added by hand after our links (a recap
  // page, say) survives a re-run: see trailingChunks.
  const description = [
    { text: { content: "Each row is one announcement (inbox message, appears at its Send At time) or highlight (image card on the home screen, ordered by Order) in the event app. " } },
    { text: { content: "Leave Push unchecked for inbox-only announcements; highlights are never pushed.\n" } },
    { text: { content: "To rehearse a row before everyone gets it, tick Test push (team) (every team device) or Test push (product team) (the product team only) and publish: it arrives within a minute with a Test: prefix, ignores Visible and Send At, and does not count as the real send. Untick and tick again to repeat.\n" } },
    { text: { content: "Edits go live automatically within ~1 hour. To skip the wait:\n" } },
    { text: { content: "\u{1F440} Preview in the app", link: { url: `${appOrigin}/announcements?preview` } } },
    { text: { content: "   ·   " } },
    { text: { content: "⚡ Publish changes", link: { url: `${appOrigin}/api/announcements/refresh` } } },
    { text: { content: "   ·   " } },
    { text: { content: "\u{1F4D6} How push notifications work", link: { url: guideUrl } } },
    ...trailingChunks(db.description ?? []),
  ];
  if (dryRun) {
    console.log("would set description:");
    for (const chunk of description as any[]) {
      const text = chunk.text?.content ?? chunk.plain_text ?? `<${chunk.type}>`;
      const link = chunk.text?.link?.url ?? chunk.href ?? "";
      console.log(`  ${JSON.stringify(text)}${link ? ` -> ${link}` : ""}`);
    }
  } else {
    await notion(`databases/${dbId}`, "PATCH", { description });
    console.log("description set (publish + preview + guide links)");
  }

  if (process.argv.includes("--seed") && !dryRun) {
    await notion("pages", "POST", {
      parent: { database_id: dbId },
      properties: {
        Title: { title: [{ text: { content: "Welcome to the event app!" } }] },
        Message: {
          rich_text: [
            {
              text: {
                content:
                  "Announcements from the team will show up here. Add the app to your home screen so you don't miss anything.",
              },
            },
          ],
        },
        "Send At": { date: { start: new Date().toISOString() } },
        Visible: { checkbox: true },
      },
    });
    console.log("seeded 1 sample row");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
