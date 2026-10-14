import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { FEEDBACK_BUCKET, type FeedbackFileRef, type FeedbackPayload } from "@/data/feedback/types";
import { feedbackChildren, feedbackProperties, type FileLink } from "@/data/feedback/notion";

/**
 * Server side of the feedback flow (`docs/feedback.md`): signed upload URLs
 * into the private bucket, one-year signed download links for Notion, and
 * the Notion row itself. Server-only: NOTION_SECRET and
 * SUPABASE_SERVICE_ROLE_KEY.
 */

const NOTION_VERSION = "2022-06-28";
/** "Devcon App feedback form" in the team workspace; the id alone grants no access. */
export const NOTION_FEEDBACK_DB_ID = "3f8638cdc4158049adc9d75cb5b849d0";
/** How long the team can open an attachment from Notion. */
const LINK_TTL_SECONDS = 365 * 24 * 60 * 60;

export function feedbackConfigured(): boolean {
  return !!process.env.NOTION_SECRET;
}

let client: SupabaseClient | null = null;
function storage(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service credentials are not configured");
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

/** `<yyyy-mm>/<uuid>/<name>`: unguessable, and the month prefix keeps the bucket browsable. */
export function newFilePath(safeName: string, now = new Date()): string {
  const month = now.toISOString().slice(0, 7);
  return `${month}/${randomUUID()}/${safeName}`;
}

export async function signUpload(path: string): Promise<{ token: string }> {
  const { data, error } = await storage().storage.from(FEEDBACK_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message || "Couldn't prepare the upload");
  return { token: data.token };
}

export async function signDownloads(files: FeedbackFileRef[]): Promise<FileLink[]> {
  if (files.length === 0) return [];
  const { data, error } = await storage()
    .storage.from(FEEDBACK_BUCKET)
    .createSignedUrls(
      files.map((f) => f.path),
      LINK_TTL_SECONDS
    );
  if (error || !data) throw new Error(error?.message || "Couldn't link the files");
  return files.flatMap((f, i) => {
    const url = data[i]?.signedUrl;
    return url ? [{ name: f.name, url, type: f.type }] : [];
  });
}

export async function createNotionFeedback(payload: FeedbackPayload, links: FileLink[]): Promise<string> {
  const secret = process.env.NOTION_SECRET;
  if (!secret) throw new Error("Feedback is not configured");
  const create = (withFileBlocks: boolean) =>
    fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_FEEDBACK_DB_ID },
        properties: feedbackProperties(payload, links),
        children: feedbackChildren(payload, links, withFileBlocks),
      }),
    });
  let res = await create(true);
  if (res.status === 400 && links.length) {
    // Notion validates file/image blocks harder than the Files property
    // (extension in the URL, media type). The report matters more than the
    // inline preview: keep the attachments in the property and drop the blocks.
    console.warn("[/api/feedback] Notion refused the attachment blocks, retrying without:", (await res.text()).slice(0, 200));
    res = await create(false);
  }
  if (!res.ok) {
    throw new Error(`Notion refused the report (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  const page = (await res.json()) as { id: string };
  return page.id;
}
