import React from 'react'
import ReactMarkdown from 'react-markdown'

interface MarkdownProps {
  children: string
  className?: string
}

// Intl strings on the Travel Guide carry markdown (bold, lists, links);
// external links open in a new tab, internal paths stay in-app.
export const Markdown = ({ children, className }: MarkdownProps) => {
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          a: ({ href, children: linkChildren }) => {
            const isExternal = !!href && /^https?:\/\//.test(href)
            return (
              <a href={href} {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                {linkChildren}
              </a>
            )
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
