"use client";

import { supabase } from "@/data/auth/supabase";
import { cacheDB } from "@/data/cache/cache-db";
import { trackEvent } from "@/data/analytics/track";
import { FEEDBACK_BUCKET, type FeedbackFileRef, type FeedbackPayload } from "./types";

/**
 * Sending a report: files go straight from the browser to the private
 * storage bucket through a signed upload URL minted by the API (so no file
 * ever passes through a function body), then one POST creates the Notion
 * row. Offline, or on a network failure, the whole report waits in Dexie
 * (`feedbackOutbox`, blobs included) and FeedbackSync retries it later.
 */

export interface OutboxFile {
  name: string;
  type: string;
  blob: Blob;
}

export type SendResult =
  | { ok: true }
  | { ok: false; error: string; retryable: boolean; uploaded: FeedbackFileRef[] };

const MAX_ATTEMPTS = 10;

async function postJson(url: string, body: unknown): Promise<{ status: number; json: { success?: boolean; error?: string; data?: unknown } }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function uploadFile(file: OutboxFile): Promise<FeedbackFileRef> {
  const { status, json } = await postJson("/api/feedback/upload", {
    name: file.name,
    type: file.type,
    size: file.blob.size,
  });
  if (!json.success) throw Object.assign(new Error(json.error || `Upload refused (${status})`), { retryable: status >= 500 });
  const { path, token, name } = json.data as { path: string; token: string; name: string };
  if (!supabase) throw Object.assign(new Error("Uploads are not available"), { retryable: false });
  const { error } = await supabase.storage
    .from(FEEDBACK_BUCKET)
    .uploadToSignedUrl(path, token, file.blob, { contentType: file.type || undefined });
  if (error) throw Object.assign(new Error(error.message), { retryable: true });
  return { path, name, type: file.type, size: file.blob.size };
}

export async function sendFeedbackNow(
  payload: Omit<FeedbackPayload, "files">,
  files: OutboxFile[],
  alreadyUploaded: FeedbackFileRef[] = []
): Promise<SendResult> {
  // Files are uploaded once; a retry picks up where the last attempt stopped.
  const refs: FeedbackFileRef[] = [...alreadyUploaded];
  try {
    for (const file of files.slice(refs.length)) refs.push(await uploadFile(file));
    const { status, json } = await postJson("/api/feedback", { ...payload, files: refs });
    if (json.success) return { ok: true };
    return { ok: false, error: json.error || `Couldn't send (${status})`, retryable: status >= 500, uploaded: refs };
  } catch (err) {
    const e = err as Error & { retryable?: boolean };
    // fetch rejects only on network trouble: that is the retryable case.
    const retryable = e.retryable ?? !(e instanceof SyntaxError);
    return { ok: false, error: e.message || "Couldn't send", retryable, uploaded: refs };
  }
}

export async function enqueueFeedback(
  payload: Omit<FeedbackPayload, "files">,
  files: OutboxFile[],
  uploaded: FeedbackFileRef[] = []
): Promise<void> {
  if (!cacheDB) throw new Error("Storage unavailable");
  await cacheDB.feedbackOutbox.add({
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    attempts: 0,
    payload,
    files,
    uploaded,
  });
}

let flushing = false;

/** Sends queued reports in order; silent on failure, the next trigger retries. */
export async function flushFeedbackOutbox(): Promise<void> {
  if (flushing || !cacheDB || typeof navigator === "undefined" || !navigator.onLine) return;
  flushing = true;
  try {
    const rows = await cacheDB.feedbackOutbox.orderBy("createdAt").toArray();
    for (const row of rows) {
      const result = await sendFeedbackNow(row.payload, row.files, row.uploaded ?? []);
      if (result.ok) {
        await cacheDB.feedbackOutbox.delete(row.id);
        trackEvent("feedback", "sent", `${row.payload.source}-queued`);
        continue;
      }
      const attempts = row.attempts + 1;
      if (!result.retryable || attempts >= MAX_ATTEMPTS) {
        // Refused for good (or hopeless): drop it rather than retry forever.
        await cacheDB.feedbackOutbox.delete(row.id);
        trackEvent("feedback", "failed", row.payload.source);
        console.warn("[feedback] dropped queued report:", result.error);
        continue;
      }
      await cacheDB.feedbackOutbox.update(row.id, { attempts, lastError: result.error, uploaded: result.uploaded });
      if (!navigator.onLine) break;
    }
  } catch (err) {
    console.warn("[feedback] flush failed:", err);
  } finally {
    flushing = false;
  }
}
