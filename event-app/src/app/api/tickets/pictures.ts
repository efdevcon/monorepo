import { createHash } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

/**
 * Mirrors Pretix product photos into public Supabase Storage so swag cards
 * work offline. The Pretix media host (tickets.devcon.org/media/pub) sends no
 * CORS headers, so the app can neither load those photos with
 * crossOrigin="anonymous" nor warm them into the image cache (CLAUDE.md
 * "Images (offline)"); Storage sends `Access-Control-Allow-Origin: *`. Same
 * approach as the highlight mirror in api/announcements/service.ts, minus the
 * expiring-URL concerns: Pretix renames the file on every re-upload, so the
 * source pathname is a stable identity and objects can be cached forever.
 *
 * Resolution is memoized per server instance and any failure degrades to the
 * original Pretix URL, so the card still renders online.
 */
const BUCKET = "event-app-swag";
// Cards render up to 361px wide; 800 covers 2x with headroom.
const IMAGE_WIDTH = 800;
const IMAGE_QUALITY = 80;

let client: SupabaseClient | null | undefined;
function getServiceClient(): SupabaseClient | null {
  if (client === undefined) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    client = url && key ? createClient(url, key) : null;
  }
  return client;
}

const resolved = new Map<string, Promise<string>>();

/** Public, CORS-enabled URL for a Pretix `picture`; the source URL on failure. */
export function mirrorPicture(sourceUrl: string): Promise<string> {
  let pending = resolved.get(sourceUrl);
  if (!pending) {
    pending = doMirror(sourceUrl).catch((err) => {
      console.warn(`[tickets] picture mirror failed for ${sourceUrl}:`, err);
      resolved.delete(sourceUrl); // let the next request retry
      return sourceUrl;
    });
    resolved.set(sourceUrl, pending);
  }
  return pending;
}

async function doMirror(sourceUrl: string): Promise<string> {
  const db = getServiceClient();
  if (!db) return sourceUrl;

  const id = createHash("sha1")
    .update(new URL(sourceUrl).pathname)
    .digest("hex")
    .slice(0, 16);
  const key = `items/${id}.webp`;
  const bucket = db.storage.from(BUCKET);
  const publicUrl = bucket.getPublicUrl(key).data.publicUrl;

  const { data: exists } = await bucket.exists(key);
  if (exists) return publicUrl;

  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`image download failed (${res.status})`);
  const body = await sharp(Buffer.from(await res.arrayBuffer()))
    .rotate()
    .resize({ width: IMAGE_WIDTH, withoutEnlargement: true })
    .webp({ quality: IMAGE_QUALITY })
    .toBuffer();

  const upload = () =>
    bucket.upload(key, body, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: true,
    });
  let { error } = await upload();
  if (error && /bucket not found/i.test(error.message)) {
    await db.storage.createBucket(BUCKET, { public: true });
    ({ error } = await upload());
  }
  if (error) throw new Error(`Supabase upload failed: ${error.message}`);
  return publicUrl;
}
