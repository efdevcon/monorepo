import cn from "classnames";

/** http(s) URLs in running text. Closing punctuation is trimmed off below. */
const URL_RE = /https?:\/\/[^\s<>"'`]+/g;
const TRAILING = /[.,;:!?\]]$/;

/**
 * Drop the sentence punctuation a URL often ends with in prose ("see
 * https://x.org/y." or "(https://x.org/y)") while keeping a ")" that closes a
 * "(" inside the URL itself (wiki-style paths).
 */
function trimTrailing(url: string): string {
  for (;;) {
    if (TRAILING.test(url)) {
      url = url.slice(0, -1);
      continue;
    }
    if (url.endsWith(")") && (url.match(/\)/g) ?? []).length > (url.match(/\(/g) ?? []).length) {
      url = url.slice(0, -1);
      continue;
    }
    return url;
  }
}

/**
 * The href for a matched URL, or null when it should stay plain text. Second
 * gate after the regex: the browser's own parser must accept it and the
 * scheme must be http or https (the regex already requires that prefix; this
 * keeps it true whatever the rest of the string does). Everything else in
 * the text is rendered by React as text, never as markup.
 */
function safeHref(candidate: string): string | null {
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    // "https://devcon.org@evil.example/" reads like devcon.org; credentials
    // in a link have no honest use in a programme, so it stays text.
    if (parsed.username || parsed.password) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Text with its URLs turned into links: hub sheets and Pretalx abstracts
 * carry bare URLs, and until now they were dead text. Links open in a new
 * tab (`noopener noreferrer`) and show without the scheme. Callers keep
 * their own wrapping rule (`[overflow-wrap:anywhere]` on the paragraph) so a
 * long URL never widens a fixed detail layer past the viewport.
 */
export function TextWithLinks({ text, className }: { text: string; className?: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    const url = trimTrailing(match[0]);
    if (!url || !safeHref(url)) continue;
    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      <a
        key={start}
        href={safeHref(url) ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("font-bold text-dc-purple underline-offset-2 hover:underline", className)}
      >
        {url.replace(/^https?:\/\//, "")}
      </a>
    );
    last = start + url.length;
  }
  if (parts.length === 0) return <>{text}</>;
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
