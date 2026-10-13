import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_LIMITS,
  type FeedbackCategory,
  type FeedbackError,
  type FeedbackFileRef,
  type FeedbackPayload,
  type FeedbackSource,
} from "./types";

/**
 * Pure validation shared by the API route and the tests. Everything the
 * client sends is untrusted; this is the only shape the route accepts.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Executables and installers: the team opens these files, so none of those. */
const BLOCKED_EXT = /\.(exe|dll|msi|bat|cmd|sh|ps1|scr|com|jar|apk|dmg|pkg|vbs)$/i;
/** `<yyyy-mm>/<uuid>/<safe name>`, the only layout `newFilePath` produces. */
const FILE_PATH = /^\d{4}-\d{2}\/[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,100}$/;

export type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > max ? null : s;
}

/** Drop any path, keep a portable character set, cap the length. */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^[._]+/, "");
  return (cleaned || "file").slice(0, 100);
}

/** Null when the file may be attached, else the reason it may not. */
export function fileProblem(name: string, size: number): string | null {
  if (!Number.isFinite(size) || size <= 0) return "This file is empty.";
  if (size > FEEDBACK_LIMITS.fileBytes) return "Files must be under 50 MB.";
  if (BLOCKED_EXT.test(name)) return "This file type can't be attached.";
  return null;
}

export function validateUploadRequest(
  input: unknown
): Validation<{ name: string; type: string; size: number }> {
  if (!isRecord(input)) return { ok: false, error: "Invalid body" };
  const name = str(input.name, 255);
  const type = str(input.type ?? "", 100) ?? "";
  const size = typeof input.size === "number" ? input.size : NaN;
  if (!name) return { ok: false, error: "A file name is required" };
  const problem = fileProblem(name, size);
  if (problem) return { ok: false, error: problem };
  return { ok: true, value: { name: safeFileName(name), type, size } };
}

function validateFile(v: unknown): FeedbackFileRef | null {
  if (!isRecord(v)) return null;
  const path = str(v.path, 200);
  const name = str(v.name, 255);
  const type = str(v.type ?? "", 100) ?? "";
  const size = typeof v.size === "number" ? v.size : NaN;
  if (!path || !FILE_PATH.test(path) || !name || fileProblem(name, size)) return null;
  return { path, name, type, size };
}

function validateError(v: unknown): FeedbackError | null | undefined {
  if (v === undefined) return undefined;
  if (!isRecord(v)) return null;
  const message = str(v.message, 1_000);
  if (message === null) return null;
  const digest = v.digest === undefined ? undefined : str(v.digest, 100);
  const stack = v.stack === undefined ? undefined : str(v.stack, 2_000);
  if (digest === null || stack === null) return null;
  return { message, digest, stack };
}

export function validateFeedbackPayload(input: unknown): Validation<FeedbackPayload> {
  if (!isRecord(input)) return { ok: false, error: "Invalid body" };

  const category = input.category as FeedbackCategory;
  if (!FEEDBACK_CATEGORIES.includes(category)) return { ok: false, error: "Unknown category" };
  const source: FeedbackSource = input.source === "crash" ? "crash" : "feedback";

  const message = str(input.message, FEEDBACK_LIMITS.message);
  if (message === null) return { ok: false, error: `The message must be under ${FEEDBACK_LIMITS.message} characters` };
  if (!message) return { ok: false, error: "A message is required" };

  const email = str(input.email ?? "", FEEDBACK_LIMITS.email);
  if (email === null || (email && !EMAIL.test(email))) return { ok: false, error: "That email address doesn't look right" };

  const page = str(input.page ?? "", 500) ?? "";

  const error = validateError(input.error);
  if (error === null) return { ok: false, error: "Invalid error details" };

  const diagnostics = isRecord(input.diagnostics) ? input.diagnostics : {};
  if (JSON.stringify(diagnostics).length > FEEDBACK_LIMITS.diagnosticsChars) {
    return { ok: false, error: "Diagnostics too large" };
  }

  const rawFiles = Array.isArray(input.files) ? input.files : [];
  if (rawFiles.length > FEEDBACK_LIMITS.files) return { ok: false, error: `At most ${FEEDBACK_LIMITS.files} files` };
  const files: FeedbackFileRef[] = [];
  for (const f of rawFiles) {
    const file = validateFile(f);
    if (!file) return { ok: false, error: "Invalid file reference" };
    files.push(file);
  }

  return { ok: true, value: { category, source, message, email: email ?? "", page, error, diagnostics, files } };
}
