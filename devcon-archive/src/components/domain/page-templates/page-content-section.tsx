import React, { ReactNode } from 'react'
import { usePageContext } from 'src/context/page-context'
import { Tags } from 'src/components/common/tags'

type Props = {
  children: ReactNode
  hideTags?: boolean
}

export function PageContentSection(props: Props) {
  const pageContext = usePageContext()

  return (
    <div className="section">
      <div className="content">
        {props.children}

        {props.hideTags !== true && pageContext?.current?.tags && (
          <Tags items={pageContext?.current.tags} viewOnly={false} />
        )}
      </div>
    </div>
  )
}
