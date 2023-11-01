import React from 'react'
import { ContentSection } from 'types/ContentSection'
import { toHtml } from 'utils/markdown'

interface Props {
  section: ContentSection
  showTitle?: boolean
  className?: string
}

export const ContentSectionRow = (props: Props) => {
  return (
    <div className={props.className ?? ''}>
      {props.showTitle && (
        <h2 id="safety" className="spaced clear-top border-top">
          {props.section.title}
        </h2>
      )}
      {props.section.body && (
        <div className="clear-bottom-less">
          <div className="markdown" dangerouslySetInnerHTML={{ __html: toHtml(props.section.body) }} />
        </div>
      )}
      {(props.section.data.left || props.section.data.right) && (
        <div className="two-columns clear-bottom">
          <div className="left section-markdown">
            <div className="markdown" dangerouslySetInnerHTML={{ __html: toHtml(props.section.data.left) }} />
          </div>
          <div className="right">
            <div className="markdown" dangerouslySetInnerHTML={{ __html: toHtml(props.section.data.right) }} />
          </div>
        </div>
      )}
    </div>
  )
}
