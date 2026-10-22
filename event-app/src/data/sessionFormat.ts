/**
 * The session format shown in the app for a Pretalx session type.
 *
 * The programme team names community-led session types so a CLS slot can be
 * told apart from the main programme in Pretalx: "CLS - Talk (Open Tech
 * Summit)", "CLS - career workshop (Career fair)", "CLS - EPF Talk". Those
 * names are theirs to keep; in the app they filled the Session formats
 * filter and the Speakers format tabs with nine near-duplicates of Talk,
 * Workshop and Panel (feedback round, 2026-10-13). This folds each one into
 * the core format it is a flavour of, at read time (`materialize.ts`), so
 * every consumer — filters, format tabs, card and details captions, search —
 * sees one vocabulary. The Pretalx name stays in the stored row untouched.
 *
 * Core formats are matched by keyword inside the "CLS - … (…)" wrapper, most
 * specific first ("Lightning Talk" before "Talk", "Miniworkshop" and "career
 * workshop" are workshops). A CLS format with no core match keeps its own
 * name, minus the wrapper, so a new one never disappears into "Other".
 *
 * Any other type drops a " - qualifier" suffix ("Roundtable - longer format"
 * → "Roundtable"): the qualifier is scheduling detail for the programme team.
 *
 * Fireside chats, roundtables and the talent competition are one-offs that
 * each added a filter row for a single session; they read as "Mixed Format",
 * the Pretalx type for the programme's other non-standard sessions (feedback
 * round, 2026-10-22). Checked before the CLS unwrap, so the Academic track's
 * fireside folds the same way as the main-programme roundtable.
 */

const CLS_TYPE = /^CLS\s*[-–:]\s*(.+?)\s*(?:\([^)]*\))?\s*$/i;
const QUALIFIER = /\s+[-–]\s+.*$/;
const MIXED_FORMAT = /fireside|roundtable|talent competition/i;

const CORE_FORMATS: Array<[keyword: string, format: string]> = [
  ["lightning", "Lightning Talk"],
  ["workshop", "Workshop"],
  ["panel", "Panel"],
  ["talk", "Talk"],
];

export function sessionFormat(raw: string): string {
  const name = raw.trim();
  if (MIXED_FORMAT.test(name)) return "Mixed Format";
  const cls = CLS_TYPE.exec(name)?.[1];
  if (!cls) return name.replace(QUALIFIER, "");
  const key = cls.toLowerCase();
  const core = CORE_FORMATS.find(([keyword]) => key.includes(keyword));
  if (core) return core[1];
  return cls.charAt(0).toUpperCase() + cls.slice(1);
}

/**
 * The order the format filters list the core formats in (Speakers format
 * tabs, schedule "Session formats" rows): by how much of the programme each
 * holds, not alphabetically, so Talks lead and Panels close (feedback round,
 * 2026-10-22). A format outside this list (Experience, Keynote, Opening…)
 * follows, alphabetically.
 */
const FORMAT_ORDER = [
  "Talk",
  "Lightning Talk",
  "Mixed Format",
  "Workshop",
  "Panel",
];

export function compareSessionFormats(a: string, b: string): number {
  const ia = FORMAT_ORDER.indexOf(a);
  const ib = FORMAT_ORDER.indexOf(b);
  if (ia !== -1 || ib !== -1) {
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  }
  return a.localeCompare(b);
}
