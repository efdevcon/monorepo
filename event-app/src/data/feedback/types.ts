/**
 * In-app feedback and crash reports. The attendee writes a message (and may
 * attach files); the app adds what it knows about the device and its own
 * state, and the API route turns it into a row in the team's Notion database
 * (`docs/feedback.md`).
 */

export type FeedbackCategory = "bug" | "idea" | "question";
export type FeedbackSource = "feedback" | "crash";

export const FEEDBACK_CATEGORIES: readonly FeedbackCategory[] = ["bug", "idea", "question"];

export interface FeedbackError {
  message: string;
  digest?: string;
  /** First lines only; never the whole stack. */
  stack?: string;
}

/** A file already uploaded to the feedback bucket, referenced by its path. */
export interface FeedbackFileRef {
  path: string;
  name: string;
  type: string;
  size: number;
}

export interface FeedbackPayload {
  category: FeedbackCategory;
  source: FeedbackSource;
  message: string;
  /** Empty when the attendee left it out. */
  email: string;
  /** Pathname + query of the page the report was opened from. */
  page: string;
  error?: FeedbackError;
  /** What the app collected (`diagnostics.ts`); free-form, stored as JSON. */
  diagnostics: Record<string, unknown>;
  files: FeedbackFileRef[];
}

export const FEEDBACK_LIMITS = {
  message: 4_000,
  email: 254,
  files: 5,
  fileBytes: 50 * 1024 * 1024,
  diagnosticsChars: 20_000,
} as const;

/** Private Supabase Storage bucket; files reach Notion as one-year signed links. */
export const FEEDBACK_BUCKET = "event-app-feedback";
