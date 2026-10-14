/**
 * The last few console errors and warnings, kept in memory so a feedback
 * report can carry what went wrong just before it. Messages are clipped and
 * never persisted. Installed once at app start (FeedbackSync).
 */

export interface CapturedEntry {
  /** Epoch ms. */
  t: number;
  level: "error" | "warn" | "uncaught" | "unhandledrejection";
  msg: string;
}

const MAX_ENTRIES = 20;
const MAX_CHARS = 300;
const entries: CapturedEntry[] = [];
let installed = false;

function describe(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function push(level: CapturedEntry["level"], args: unknown[]): void {
  const msg = args.map(describe).join(" ").slice(0, MAX_CHARS);
  entries.push({ t: Date.now(), level, msg });
  if (entries.length > MAX_ENTRIES) entries.shift();
}

export function installConsoleCapture(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);
  console.error = (...args: unknown[]) => {
    push("error", args);
    originalError(...args);
  };
  console.warn = (...args: unknown[]) => {
    push("warn", args);
    originalWarn(...args);
  };
  window.addEventListener("error", (e) => push("uncaught", [e.message]));
  window.addEventListener("unhandledrejection", (e) => push("unhandledrejection", [e.reason]));
}

export function recentConsoleEntries(): CapturedEntry[] {
  return entries.slice();
}
