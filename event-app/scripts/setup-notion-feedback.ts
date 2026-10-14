// One-off setup for the in-app feedback form (docs/feedback.md):
//   - adds the columns the API writes to the Notion database
//   - creates the private storage bucket for attachments
// Re-runnable: existing columns and the bucket are left as they are.
//
//   NOTION_SECRET=... pnpm feedback:setup
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { FEEDBACK_BUCKET, FEEDBACK_LIMITS } from "../src/data/feedback/types";
import { NOTION_FEEDBACK_DB_ID as dbId } from "../src/app/api/feedback/service";

const NOTION_VERSION = "2022-06-28";
const secret = process.env.NOTION_SECRET;
if (!secret) {
  console.error("NOTION_SECRET is required");
  process.exit(1);
}

/** Keep in step with feedbackProperties() in src/data/feedback/notion.ts. */
const PROPERTIES = {
  Message: { rich_text: {} },
  Category: {
    select: {
      options: [
        { name: "Bug", color: "red" },
        { name: "Idea", color: "blue" },
        { name: "Question", color: "yellow" },
      ],
    },
  },
  Status: {
    select: {
      options: [
        { name: "New", color: "purple" },
        { name: "Triaged", color: "blue" },
        { name: "In progress", color: "orange" },
        { name: "Done", color: "green" },
        { name: "Won't fix", color: "gray" },
      ],
    },
  },
  Source: {
    select: {
      options: [
        { name: "Feedback", color: "default" },
        { name: "Crash", color: "red" },
      ],
    },
  },
  Email: { email: {} },
  Page: { rich_text: {} },
  Build: { rich_text: {} },
  Device: { rich_text: {} },
  "Display mode": {
    select: {
      options: [
        { name: "Installed", color: "green" },
        { name: "Browser", color: "gray" },
      ],
    },
  },
  Online: { checkbox: {} },
  "Signed in": { checkbox: {} },
  Push: { rich_text: {} },
  Event: { rich_text: {} },
  Files: { files: {} },
  Diagnostics: { rich_text: {} },
  Created: { created_time: {} },
};

async function setupNotion(): Promise<void> {
  const headers = {
    Authorization: `Bearer ${secret}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
  const current = await fetch(`https://api.notion.com/v1/databases/${dbId}`, { headers });
  if (!current.ok) throw new Error(`Notion database not reachable (${current.status}): ${await current.text()}`);
  const existing = Object.keys(((await current.json()) as { properties: Record<string, unknown> }).properties);
  const missing = Object.fromEntries(Object.entries(PROPERTIES).filter(([name]) => !existing.includes(name)));
  if (Object.keys(missing).length === 0) {
    console.log("Notion: all columns present");
    return;
  }
  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ properties: missing }),
  });
  if (!res.ok) throw new Error(`Notion update failed (${res.status}): ${await res.text()}`);
  console.log(`Notion: added ${Object.keys(missing).join(", ")}`);
}

async function setupBucket(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if (buckets.some((b) => b.name === FEEDBACK_BUCKET)) {
    console.log(`Storage: bucket ${FEEDBACK_BUCKET} present`);
    return;
  }
  const { error: createError } = await supabase.storage.createBucket(FEEDBACK_BUCKET, {
    public: false,
    fileSizeLimit: FEEDBACK_LIMITS.fileBytes,
  });
  if (createError) throw createError;
  console.log(`Storage: created private bucket ${FEEDBACK_BUCKET}`);
}

setupNotion()
  .then(setupBucket)
  .then(() => console.log("done"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
