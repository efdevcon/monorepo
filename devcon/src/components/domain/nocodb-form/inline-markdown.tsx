import React from 'react'

/**
 * Renders a small subset of markdown inline: links (`[text](url)`), italic
 * (`_text_` or `*text*`) and bold (`**text**` or `__text__`). Used for form
 * subheadings and field descriptions where the source text comes from NocoDB
 * form metadata.
 *
 * Not a full markdown parser — intentionally narrow to keep behavior predictable
 * and avoid pulling in a dependency.
 */

const TOKEN = /(\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_)/g
const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)$/

export function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return text
  const parts = text.split(TOKEN)
  return parts.map((part, i) => {
    if (!part) return null
    const link = part.match(LINK)
    if (link) {
      const [, label, href] = link
      return (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="underline text-[#7235ed]">
          {label}
        </a>
      )
    }
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    return <React.Fragment key={i}>{part}</React.Fragment>
  })
}
