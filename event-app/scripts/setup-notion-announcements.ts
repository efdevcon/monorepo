// One-time setup: shapes the (empty) Notion database the team will manage
// into the schema /api/announcements expects. Idempotent: re-running is safe.
//
//   NOTION_SECRET=... pnpm announcements:setup-notion [--seed]
//
// --seed inserts one sample row so the pipeline can be tested end to end.
// Ported from ens-page/scripts/setup-notion-db.ts (the links DB setup).
import "dotenv/config";

const NOTION_VERSION = "2022-06-28";
// Same default as src/app/api/announcements/service.ts; the id is not secret.
const DEFAULT_DB_ID = "3b9638cdc4158035a9abcff224f3034a";
const secret = process.env.NOTION_SECRET;
const dbId = process.env.NOTION_ANNOUNCEMENTS_DB_ID ?? DEFAULT_DB_ID;
const appOrigin = process.env.APP_ORIGIN ?? "https://devcon-event-app.netlify.app";
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
    await notion(`databases/${dbId}`, "PATCH", { properties });
    console.log("updated properties:", Object.keys(properties).join(", "));
  } else {
    console.log("schema already up to date");
  }

  const updated = await notion(`databases/${dbId}`, "GET");
  for (const required of ["Title", "Message", "URL", "Send At", "Push", "Visible", "Type", "Image", "Order"]) {
    if (!updated.properties[required]) {
      throw new Error(`property ${required} missing after update`);
    }
  }
  console.log("schema OK:", Object.keys(updated.properties).join(", "));

  // Editor-facing instructions shown under the database title, including the
  // one-click "publish" link (syncs to the app + purges the feed's CDN cache).
  await notion(`databases/${dbId}`, "PATCH", {
    description: [
      { text: { content: "Each row is one announcement (inbox message, appears at its Send At time) or highlight (image card on the home screen, ordered by Order) in the event app. " } },
      { text: { content: "Leave Push unchecked for inbox-only announcements; highlights are never pushed.\n" } },
      { text: { content: "Edits go live automatically within ~1 hour. To skip the wait:\n" } },
      { text: { content: "\u{1F440} Preview in the app", link: { url: `${appOrigin}/announcements?preview` } } },
      { text: { content: "   ·   " } },
      { text: { content: "⚡ Publish changes", link: { url: `${appOrigin}/api/announcements/refresh` } } },
    ],
  });
  console.log("description set (publish + preview links)");

  if (process.argv.includes("--seed")) {
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
