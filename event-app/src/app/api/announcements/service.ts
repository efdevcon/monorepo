/**
 * Announcements & highlights: authored by the team in one Notion database
 * (Type column tells them apart), synced into the Supabase
 * `devcon8_announcements` table, and served to the app from there.
 * Announcements are time-first inbox items; highlights are evergreen image
 * cards for the home screen, curated by Order and never pushed.
 *
 * Same editor workflow as the devcon ens-page links API (see
 * devcon/src/services/notion-links.ts): Notion is the writing surface with
 * one-click "Preview" / "Publish" links in the DB description. The difference
 * is the Supabase hop: push delivery (Phase 2) needs durable send-state that
 * Notion can't hold, so Postgres is the system of record and every read path
 * goes through it. Highlight images are mirrored into Supabase Storage
 * (Notion attachment URLs expire after ~1h), also per the ens-page pattern.
 *
 * Server-only: uses NOTION_SECRET and SUPABASE_SERVICE_ROLE_KEY.
 */
import { createHash } from "node:crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const NOTION_VERSION = "2022-06-28";
// Not a secret: a DB id grants no access without the integration token, and
// it's visible in the Notion URL. Env override kept for a future DB swap.
const NOTION_DB_ID =
  process.env.NOTION_ANNOUNCEMENTS_DB_ID ?? "3b9638cdc4158035a9abcff224f3034a";

/** Netlify CDN cache tag on GET /api/announcements; purged by /refresh. */
export const CACHE_TAG = "announcements";

/** Supabase Storage bucket for mirrored highlight images. */
const IMAGE_BUCKET = "event-app-announcements";
// Cards render ~295px wide; 640 covers retina with headroom.
const IMAGE_WIDTH = 640;
const IMAGE_QUALITY = 80;

/** Client-facing shape served by the feed and cached in the app. */
export interface Announcement {
  /** Notion page id. */
  id: string;
  /** "announcement" = inbox item, "highlight" = home-screen image card. */
  type: "announcement" | "highlight";
  title: string;
  message: string;
  /** Optional deep link (also the push click target in Phase 2). */
  url: string | null;
  /** Mirrored image URL (highlights); null for plain announcements. */
  image: string | null;
  /** ISO timestamp; announcements are hidden from the feed until this time. */
  sendAt: string;
  /** Manual ordering for highlights (ascending). */
  sortOrder: number;
}

interface NotionFileCell {
  type: "file" | "external";
  file?: { url: string };
  external?: { url: string };
}

interface NotionRow {
  id: string;
  type: "announcement" | "highlight";
  title: string;
  message: string;
  url: string | null;
  imageCell: NotionFileCell | null;
  sendAt: string;
  sortOrder: number;
  push: boolean;
  visible: boolean;
}

let supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
      );
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

const richText = (cells: { plain_text: string }[] | undefined): string =>
  (cells ?? [])
    .map((t) => t.plain_text)
    .join("")
    .trim();

async function uploadImage(
  db: SupabaseClient,
  key: string,
  body: Buffer,
  contentType?: string
): Promise<void> {
  const doUpload = () =>
    db.storage.from(IMAGE_BUCKET).upload(key, body, {
      contentType,
      // Keys are immutable (new attachment -> new key), so cache forever.
      cacheControl: "31536000",
      upsert: true,
    });

  let { error } = await doUpload();
  if (error && /bucket not found/i.test(error.message)) {
    await db.storage.createBucket(IMAGE_BUCKET, { public: true });
    ({ error } = await doUpload());
  }
  if (error) throw new Error(`Supabase upload failed: ${error.message}`);
}

/**
 * Mirror a Notion image (uploaded attachment or external URL) into the public
 * bucket and return its stable public URL (resized webp, original as
 * fallback). Notion attachment URLs expire after ~1h, so serving them
 * directly is never an option. Ported from devcon/src/services/notion-links.ts.
 * On mirror failure, external URLs degrade to being served directly;
 * attachments return null (their URL would expire anyway).
 */
async function resolveImage(
  pageId: string,
  cell: NotionFileCell | null
): Promise<string | null> {
  if (!cell) return null;
  const sourceUrl =
    (cell.type === "external" ? cell.external?.url : cell.file?.url) ?? null;
  if (!sourceUrl) return null;

  try {
    const db = getSupabase();
    const publicUrl = (key: string) =>
      db.storage.from(IMAGE_BUCKET).getPublicUrl(key).data.publicUrl;
    // Identity for the immutable bucket key: for Notion attachments the S3
    // pathname (the query string holds the expiring signature; re-uploads get
    // a new path); for external images the whole URL, so pasting a different
    // URL mirrors the new image.
    const identity =
      cell.type === "external" ? sourceUrl : new URL(sourceUrl).pathname;
    const id = createHash("sha1").update(identity).digest("hex").slice(0, 16);
    const base = `highlights/${pageId}-${id}`;
    const keys = { original: `${base}-orig`, thumb: `${base}.webp` };

    const { data: thumbExists } = await db.storage
      .from(IMAGE_BUCKET)
      .exists(keys.thumb);
    if (thumbExists) return publicUrl(keys.thumb);

    const res = await fetch(sourceUrl);
    if (!res.ok) throw new Error(`image download failed (${res.status})`);
    const original = Buffer.from(await res.arrayBuffer());

    const { data: originalExists } = await db.storage
      .from(IMAGE_BUCKET)
      .exists(keys.original);
    if (!originalExists) {
      await uploadImage(
        db,
        keys.original,
        original,
        res.headers.get("content-type") ?? undefined
      );
    }

    try {
      // Dynamic import: sharp is a native module only needed server-side.
      const sharp = (await import("sharp")).default;
      const thumb = await sharp(original, { animated: true })
        .resize({ width: IMAGE_WIDTH, withoutEnlargement: true })
        .webp({ quality: IMAGE_QUALITY })
        .toBuffer();
      await uploadImage(db, keys.thumb, thumb, "image/webp");
      return publicUrl(keys.thumb);
    } catch (err) {
      console.warn(
        `[announcements] thumb failed for ${keys.thumb}, serving original:`,
        (err as Error).message
      );
      return publicUrl(keys.original);
    }
  } catch (err) {
    console.error(
      `[announcements] image mirror failed for page ${pageId}:`,
      (err as Error).message
    );
    // A live external URL beats no image; expired attachment URLs do not.
    return cell.type === "external" ? sourceUrl : null;
  }
}

/**
 * All rows from the Notion DB, including hidden/future ones — the sync needs
 * the full set so unchecking "Visible" in Notion hides the row here too.
 */
async function fetchNotionRows(): Promise<NotionRow[]> {
  const secret = process.env.NOTION_SECRET;
  if (!secret) throw new Error("NOTION_SECRET is required");

  const headers = {
    Authorization: `Bearer ${secret}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };

  const rows: NotionRow[] = [];
  let cursor: string | undefined;
  do {
    const res = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          sorts: [{ property: "Send At", direction: "descending" }],
          page_size: 100,
          start_cursor: cursor,
        }),
      }
    );
    if (!res.ok) {
      throw new Error(`Notion query failed (${res.status}): ${await res.text()}`);
    }
    const data = await res.json();

    for (const page of data.results as any[]) {
      const p = page.properties;
      const title = richText(p.Title?.title);
      if (!title) continue; // incomplete rows are simply skipped
      const type =
        p.Type?.select?.name?.toLowerCase() === "highlight"
          ? ("highlight" as const)
          : ("announcement" as const);
      // Announcements need an explicit Send At (it's their reveal/push time);
      // highlights are evergreen, so fall back to the page's creation time.
      const sendAt: string | null =
        p["Send At"]?.date?.start ??
        (type === "highlight" ? page.created_time : null);
      if (!sendAt) continue;
      rows.push({
        id: page.id,
        type,
        title,
        message: richText(p.Message?.rich_text),
        url: p.URL?.url ?? null,
        imageCell: (p.Image?.files?.[0] as NotionFileCell | undefined) ?? null,
        sendAt: new Date(sendAt).toISOString(),
        sortOrder: p.Order?.number ?? 0,
        push: p.Push?.checkbox ?? false,
        visible: p.Visible?.checkbox ?? false,
      });
    }
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return rows;
}

/**
 * Sync Notion -> Supabase. Content fields (title/message/url/send_at/push/
 * visible) always follow Notion; the push `status` only moves between draft
 * and scheduled — rows the dispatcher has claimed or sent are never re-armed
 * by an edit. Rows deleted in Notion are soft-hidden, keeping their delivery
 * history.
 */
export async function syncAnnouncements(): Promise<number> {
  const [rows, db] = [await fetchNotionRows(), getSupabase()];

  const { data: existing, error: readError } = await db
    .from("devcon8_announcements")
    .select("id, status");
  if (readError) throw new Error(`announcement read failed: ${readError.message}`);
  const statusById = new Map((existing ?? []).map((r) => [r.id, r.status]));

  const now = new Date().toISOString();
  const upserts = [];
  for (const row of rows) {
    const current = statusById.get(row.id) ?? "draft";
    const locked = current === "sending" || current === "sent";
    // Highlights are never pushed, regardless of the Push checkbox.
    const armed = row.type === "announcement" && row.push && row.visible;
    upserts.push({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      url: row.url,
      image: await resolveImage(row.id, row.imageCell),
      send_at: row.sendAt,
      sort_order: row.sortOrder,
      push: row.push,
      visible: row.visible,
      status: locked ? current : armed ? "scheduled" : "draft",
      updated_at: now,
    });
  }

  if (upserts.length > 0) {
    const { error } = await db
      .from("devcon8_announcements")
      .upsert(upserts, { onConflict: "id" });
    if (error) throw new Error(`announcement upsert failed: ${error.message}`);
  }

  // Soft-hide rows that no longer exist in Notion (deleted/archived there).
  const notionIds = new Set(rows.map((r) => r.id));
  const removed = (existing ?? [])
    .map((r) => r.id)
    .filter((id) => !notionIds.has(id));
  if (removed.length > 0) {
    const { error } = await db
      .from("devcon8_announcements")
      .update({ visible: false, updated_at: now })
      .in("id", removed);
    if (error) throw new Error(`announcement hide failed: ${error.message}`);
  }

  return upserts.length;
}

/**
 * The feed, from Supabase — announcements and highlights in one payload (the
 * client splits on `type`). Future rows are excluded (scheduled reveals)
 * unless `includeFuture` — the preview path uses that so editors can check a
 * scheduled announcement before its time.
 */
export async function getAnnouncements(
  options: { includeFuture?: boolean } = {}
): Promise<Announcement[]> {
  let query = getSupabase()
    .from("devcon8_announcements")
    .select("id, type, title, message, url, image, send_at, sort_order")
    .eq("visible", true)
    .order("send_at", { ascending: false })
    .limit(200);
  if (!options.includeFuture) {
    query = query.lte("send_at", new Date().toISOString());
  }

  const { data, error } = await query;
  if (error) throw new Error(`announcement query failed: ${error.message}`);

  return (data ?? []).map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    message: r.message,
    url: r.url,
    image: r.image,
    sendAt: r.send_at,
    sortOrder: r.sort_order,
  }));
}
