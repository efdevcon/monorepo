import type { FeedbackPayload } from "./types";

/**
 * Pure builders for the Notion row (properties and page body). Property
 * names match what `scripts/setup-notion-feedback.ts` creates. Rich text
 * objects are capped at 2,000 characters by Notion, hence the chunking.
 */

export const NOTION_TEXT_CHUNK = 2_000;

export function chunkText(text: string, size = NOTION_TEXT_CHUNK): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out.length ? out : [""];
}

const richText = (text: string, max = 100) =>
  chunkText(text).slice(0, max).map((content) => ({ type: "text", text: { content } }));

const CATEGORY_LABEL = { bug: "Bug", idea: "Idea", question: "Question" } as const;

export function feedbackTitle(p: Pick<FeedbackPayload, "category" | "source" | "message" | "error">): string {
  const lead = p.source === "crash" ? "Crash" : CATEGORY_LABEL[p.category];
  const text = (p.source === "crash" && p.error?.message) || p.message;
  const firstLine = text.split("\n").find((l) => l.trim()) ?? "";
  return `${lead}: ${firstLine.trim().slice(0, 80)}`;
}

export interface FileLink {
  name: string;
  url: string;
  type: string;
}

function diag(p: FeedbackPayload, key: string): unknown {
  return p.diagnostics[key];
}

export function feedbackProperties(p: FeedbackPayload, links: FileLink[]): Record<string, unknown> {
  const props: Record<string, unknown> = {
    Name: { title: [{ type: "text", text: { content: feedbackTitle(p) } }] },
    Message: { rich_text: richText(p.message) },
    Category: { select: { name: CATEGORY_LABEL[p.category] } },
    Status: { select: { name: "New" } },
    Source: { select: { name: p.source === "crash" ? "Crash" : "Feedback" } },
    Page: { rich_text: richText(p.page.slice(0, 500)) },
    Build: { rich_text: richText(String(diag(p, "build") ?? "")) },
    Device: { rich_text: richText(String(diag(p, "device") ?? "")) },
    Event: { rich_text: richText(String((diag(p, "dataset") as { eventId?: string } | undefined)?.eventId ?? "")) },
    Online: { checkbox: diag(p, "online") === true },
    "Signed in": { checkbox: diag(p, "signedIn") === true },
    Push: {
      rich_text: richText(
        (() => {
          const push = diag(p, "push") as { permission?: string; subscribed?: boolean } | undefined;
          if (!push) return "";
          return `${push.permission ?? "?"}${push.subscribed ? ", subscribed" : ""}`;
        })()
      ),
    },
    Diagnostics: { rich_text: richText(JSON.stringify(p.diagnostics), 1) },
  };
  if (p.email) props.Email = { email: p.email };
  const mode = diag(p, "displayMode");
  if (mode === "installed" || mode === "browser") {
    props["Display mode"] = { select: { name: mode === "installed" ? "Installed" : "Browser" } };
  }
  if (links.length) {
    props.Files = { files: links.map((l) => ({ name: l.name.slice(0, 100), type: "external", external: { url: l.url } })) };
  }
  return props;
}

const heading = (text: string) => ({
  object: "block",
  type: "heading_2",
  heading_2: { rich_text: [{ type: "text", text: { content: text } }] },
});
const paragraph = (text: string) => ({
  object: "block",
  type: "paragraph",
  paragraph: { rich_text: [{ type: "text", text: { content: text } }] },
});
const code = (text: string, language: string) => ({
  object: "block",
  type: "code",
  code: { language, rich_text: richText(text) },
});

/**
 * Page body. `withFileBlocks: false` leaves the attachments to the Files
 * property only, the fallback when Notion refuses a file or image block
 * (its validation of external URLs is stricter than the property's).
 */
export function feedbackChildren(p: FeedbackPayload, links: FileLink[], withFileBlocks = true): unknown[] {
  const blocks: unknown[] = [heading("Message"), ...chunkText(p.message).map(paragraph)];
  if (p.error) {
    blocks.push(
      heading("Error"),
      code([p.error.message, p.error.digest && `digest: ${p.error.digest}`, p.error.stack].filter(Boolean).join("\n"), "plain text")
    );
  }
  if (links.length && withFileBlocks) {
    blocks.push(heading("Files"));
    for (const l of links) {
      blocks.push(
        l.type.startsWith("image/")
          ? { object: "block", type: "image", image: { type: "external", external: { url: l.url } } }
          : { object: "block", type: "file", file: { type: "external", external: { url: l.url }, name: l.name.slice(0, 100) } }
      );
    }
  }
  blocks.push(heading("Diagnostics"), code(JSON.stringify(p.diagnostics, null, 2), "json"));
  return blocks;
}
