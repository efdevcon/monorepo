import type { Session } from "@/data/models/sessions";

/**
 * "Plan with your AI": the attendee hands the programme to their own assistant
 * (ChatGPT, Claude, anything that can read a URL), which answers with session
 * codes; the app applies them to My Interests from a link the assistant wrote
 * (`/my-interests?add=A,B&remove=C`) or from codes pasted by hand. Pure
 * functions (tested in scripts/test-data.ts): parsing the codes, resolving
 * them against both programmes, spotting overlaps, and writing the prompt.
 *
 * A code is what the assistant sees first on each catalogue line: the Pretalx
 * code for the main programme (`sourceId`), the sheet id for a hub session
 * (`id`, e.g. privacy-s03). Slugs are accepted too, so a link built from the
 * app's own URLs still works.
 */
export const MAX_PLAN_CODES = 200;
const CODE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,80}$/;

/** Codes out of a comma/space/newline separated string: trimmed, validated, deduped (case-insensitive, first spelling kept), capped. */
export function parseCodeList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of raw.split(/[\s,;]+/)) {
    const code = piece.trim();
    if (!CODE.test(code)) continue;
    const key = code.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(code);
    if (out.length >= MAX_PLAN_CODES) break;
  }
  return out;
}

export interface PlanRequest {
  add: string[];
  remove: string[];
}

export const PLAN_ADD_PARAM = "add";
export const PLAN_REMOVE_PARAM = "remove";

export function parsePlanParams(params: URLSearchParams): PlanRequest {
  const add = parseCodeList(params.getAll(PLAN_ADD_PARAM).join(","));
  const removeAll = parseCodeList(params.getAll(PLAN_REMOVE_PARAM).join(","));
  // A code in both lists is a contradiction; adding wins (the assistant meant to keep it).
  const adding = new Set(add.map((c) => c.toLowerCase()));
  return { add, remove: removeAll.filter((c) => !adding.has(c.toLowerCase())) };
}

export const isEmptyPlan = (req: PlanRequest) => req.add.length === 0 && req.remove.length === 0;

/** The code an assistant would have seen for this session. */
export const sessionCode = (s: Session): string => s.sourceId || s.id;

export interface ResolvedPlan {
  /** Sessions to star (not starred yet). */
  add: Session[];
  /** Sessions in `add` that are already starred: nothing to do. */
  alreadyStarred: Session[];
  /** Starred sessions to unstar. */
  remove: Session[];
  /** Sessions in `remove` that are not starred: nothing to do. */
  notStarred: Session[];
  /** Codes that match no session in either programme. */
  unknown: string[];
}

/** Match codes to sessions by Pretalx code or app id, case-insensitively, against both programmes. */
export function resolvePlan(req: PlanRequest, sessions: Session[], starred: ReadonlySet<string>): ResolvedPlan {
  const byCode = new Map<string, Session>();
  for (const s of sessions) {
    byCode.set(s.id.toLowerCase(), s);
    if (s.sourceId) byCode.set(s.sourceId.toLowerCase(), s);
  }
  const out: ResolvedPlan = { add: [], alreadyStarred: [], remove: [], notStarred: [], unknown: [] };
  const seen = new Set<string>();
  for (const code of req.add) {
    const s = byCode.get(code.toLowerCase());
    if (!s) out.unknown.push(code);
    else if (seen.has(s.id)) continue;
    else if (starred.has(s.id)) out.alreadyStarred.push(s);
    else out.add.push(s);
    if (s) seen.add(s.id);
  }
  for (const code of req.remove) {
    const s = byCode.get(code.toLowerCase());
    if (!s) out.unknown.push(code);
    else if (seen.has(s.id)) continue;
    else if (starred.has(s.id)) out.remove.push(s);
    else out.notStarred.push(s);
    if (s) seen.add(s.id);
  }
  return out;
}

/** Pairs of sessions that overlap in time, earliest first. */
export function planOverlaps(sessions: Session[]): [Session, Session][] {
  const sorted = [...sessions].sort((a, b) => a.start - b.start || a.end - b.end);
  const pairs: [Session, Session][] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length && sorted[j].start < sorted[i].end; j++) {
      pairs.push([sorted[i], sorted[j]]);
    }
  }
  return pairs;
}

/** The link an assistant writes; the page it opens previews and applies the plan. */
export function applyLink(appOrigin: string, add: string[], remove: string[]): string {
  const params = new URLSearchParams();
  if (add.length) params.set(PLAN_ADD_PARAM, add.join(","));
  if (remove.length) params.set(PLAN_REMOVE_PARAM, remove.join(","));
  const query = params.toString();
  return `${appOrigin}/my-interests${query ? `?${query}` : ""}`;
}

export interface PromptInput {
  appOrigin: string;
  /** The API event id (the Community Hubs ride on the same catalogue). */
  eventId: string;
  eventTitle: string;
  /** "3 to 6 November 2026" or "". */
  dates: string;
  /** "Mumbai time (IST)" or similar. */
  timezoneLabel: string;
  starred: { code: string; title: string }[];
}

/**
 * The prompt the Home card opens in ChatGPT or Claude, or copies for any
 * other assistant. Short enough for a URL prefill (the catalogue is linked,
 * not pasted), and it carries the attendee's current stars so the assistant
 * needs no account access to know them.
 */
export function buildAssistantPrompt(input: PromptInput): string {
  // The app's mirror of the API catalogue (catalogueMirror.ts): assistants fetch it without bot challenges.
  const catalogue = `${input.appOrigin}/ai?event=${encodeURIComponent(input.eventId)}`;
  const starred =
    input.starred.length === 0
      ? "none yet"
      : input.starred.map((s) => `${s.code} (${s.title})`).join(", ");
  const when = [input.dates, input.timezoneLabel].filter(Boolean).join(", ");
  return [
    `You are helping me build my personal schedule for ${input.eventTitle}${when ? ` (${when})` : ""}.`,
    "",
    `Catalogue: ${catalogue}`,
    "Read it first. It links one page per event day listing every session, main stages and Community Hubs alike, one per line with a CODE at the start, plus filters you can query. Only use codes that appear there.",
    "",
    `My current interests: ${starred}.`,
    "",
    "How to work:",
    "1. Before building anything, ask me a few questions and wait for my answers. Use the most interactive form your interface supports (clickable choices if you have them, otherwise short questions I can answer in a few words), and ask what matters for a good schedule: what I want to get out of the event, the topics and people I care about, my level, which days I attend, how packed my days should be. If you already know some of this about me, say what you assume and let me correct it.",
    "2. Read the day pages (use the filters) before proposing anything.",
    "3. Propose a plan per day in time order. Sessions run in parallel in many rooms, so overlaps are the main pitfall: never schedule two sessions whose times overlap, including the current interests I keep. Check every pair per day before you answer, pick one when two clash and name the other as a backup, and leave short breaks between rooms.",
    "4. One line per session: time, title, CODE, why it fits me. Keep my current interests unless something fits better, and say what you drop.",
    `5. End with this link so I can apply the plan in one tap: ${input.appOrigin}/my-interests?add=CODE1,CODE2&remove=CODE3 (add: new sessions, remove: current interests to drop). Also list the codes as plain text.`,
    "6. Refine the plan when I ask.",
  ].join("\n");
}

export type AssistantKind = "chatgpt" | "claude";

/** New-chat links that prefill the prompt (ChatGPT's `?q=`, Claude's `/new?q=`). */
export function assistantUrl(kind: AssistantKind, prompt: string): string {
  const q = encodeURIComponent(prompt);
  return kind === "chatgpt" ? `https://chatgpt.com/?q=${q}&hints=search` : `https://claude.ai/new?q=${q}`;
}
