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
 */

const CLS_TYPE = /^CLS\s*[-–:]\s*(.+?)\s*(?:\([^)]*\))?\s*$/i;
const QUALIFIER = /\s+[-–]\s+.*$/;

const CORE_FORMATS: Array<[keyword: string, format: string]> = [
  ["lightning", "Lightning Talk"],
  ["workshop", "Workshop"],
  ["panel", "Panel"],
  ["talk", "Talk"],
];

export function sessionFormat(raw: string): string {
  const name = raw.trim();
  const cls = CLS_TYPE.exec(name)?.[1];
  if (!cls) return name.replace(QUALIFIER, "");
  const key = cls.toLowerCase();
  const core = CORE_FORMATS.find(([keyword]) => key.includes(keyword));
  if (core) return core[1];
  return cls.charAt(0).toUpperCase() + cls.slice(1);
}
