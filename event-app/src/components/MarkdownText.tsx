import { Children, type ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import { TextWithLinks, safeHref } from "@/components/TextWithLinks";

const LINK_CLASS = "font-bold text-dc-purple underline-offset-2 hover:underline";

/** Plain-text children get their bare URLs linked, as TextWithLinks does. */
function linkify(children: ReactNode): ReactNode {
  return Children.map(children, (child) => (typeof child === "string" ? <TextWithLinks text={child} /> : child));
}

/**
 * Markdown as speakers write it in Pretalx: paragraphs, bold/italic, links,
 * lists and headings. Headings render as bold paragraphs (an abstract has no
 * outline of its own), raw HTML is dropped, images become their alt text,
 * and only http(s) links survive (same gate as TextWithLinks); anything
 * else keeps its text without a link. Bare URLs in the prose are linked too.
 */
const COMPONENTS: Components = {
  p: ({ children }) => <p>{linkify(children)}</p>,
  h1: ({ children }) => <p className="font-bold">{linkify(children)}</p>,
  h2: ({ children }) => <p className="font-bold">{linkify(children)}</p>,
  h3: ({ children }) => <p className="font-bold">{linkify(children)}</p>,
  h4: ({ children }) => <p className="font-bold">{linkify(children)}</p>,
  h5: ({ children }) => <p className="font-bold">{linkify(children)}</p>,
  h6: ({ children }) => <p className="font-bold">{linkify(children)}</p>,
  strong: ({ children }) => <strong className="font-bold">{linkify(children)}</strong>,
  em: ({ children }) => <em>{linkify(children)}</em>,
  ul: ({ children }) => <ul className="list-disc pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5">{children}</ol>,
  li: ({ children }) => <li>{linkify(children)}</li>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-dc-fg2/30 pl-3">{children}</blockquote>,
  code: ({ children }) => <code className="font-mono text-[13px]">{children}</code>,
  pre: ({ children }) => <pre className="whitespace-pre-wrap">{children}</pre>,
  hr: () => null,
  img: ({ alt }) => <>{alt}</>,
  a: ({ href, children }) => {
    const safe = href ? safeHref(href) : null;
    if (!safe) return <>{children}</>;
    return (
      <a href={safe} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
        {children}
      </a>
    );
  },
};

export function MarkdownText({ text }: { text: string }) {
  return (
    <Markdown components={COMPONENTS} skipHtml>
      {text}
    </Markdown>
  );
}
