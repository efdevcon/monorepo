import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'

/**
 * Renders a NocoDB form-level "Form subheading" as styled markdown.
 *
 * Supports the standard CommonMark subset (paragraphs, bold, italic, links,
 * inline code, ordered/unordered lists, headings, blockquotes, horizontal
 * rules), plus single-newline line breaks via `remark-breaks` (so pressing
 * Enter once in NocoDB just works). Raw HTML is NOT enabled — anything
 * HTML-shaped is escaped, so the field admin can't inject markup that runs
 * in the submitter's browser. The one exception is `<br>`, which is a
 * common reflex; we pre-substitute it to a real newline before the parser
 * runs.
 *
 * Always left-aligned. Styled to match the rest of the form copy.
 */

interface FormSubheadingProps {
  text: string
  className?: string
}

function normalizeText(raw: string): string {
  // Accept the common `<br>` / `<br/>` / `<br />` reflex and turn it into a
  // real newline so remark-breaks can render it as a line break. Nothing
  // else HTML-shaped is honored.
  return raw.replace(/<br\s*\/?>/gi, '\n')
}

export function FormSubheading({ text, className = '' }: FormSubheadingProps) {
  if (!text) return null
  const normalized = normalizeText(text)
  return (
    <div className={`w-full text-sm text-[#1a0d33] leading-5 text-left space-y-2 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={{
          p: props => <p className="leading-5" {...props} />,
          a: props => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#7235ed] hover:underline"
            />
          ),
          strong: props => <strong className="font-bold text-[#160b2b]" {...props} />,
          em: props => <em className="italic" {...props} />,
          code: props => (
            <code
              className="px-1 py-0.5 bg-[#f2f1f4] text-[#160b2b] rounded text-[0.85em] font-mono"
              {...props}
            />
          ),
          ul: props => <ul className="list-disc pl-5 space-y-1" {...props} />,
          ol: props => <ol className="list-decimal pl-5 space-y-1" {...props} />,
          li: props => <li className="leading-5" {...props} />,
          h1: props => <h3 className="text-base font-extrabold text-[#160b2b] mt-3 first:mt-0" {...props} />,
          h2: props => <h3 className="text-base font-extrabold text-[#160b2b] mt-3 first:mt-0" {...props} />,
          h3: props => <h3 className="text-base font-bold text-[#160b2b] mt-3 first:mt-0" {...props} />,
          h4: props => <h4 className="text-sm font-bold text-[#160b2b] mt-2 first:mt-0" {...props} />,
          h5: props => <h5 className="text-sm font-bold text-[#160b2b] mt-2 first:mt-0" {...props} />,
          h6: props => <h6 className="text-sm font-bold text-[#160b2b] mt-2 first:mt-0" {...props} />,
          blockquote: props => (
            <blockquote className="border-l-2 border-[#dddae2] pl-3 text-[#594d73]" {...props} />
          ),
          hr: () => <hr className="border-[#dddae2]" />,
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  )
}
