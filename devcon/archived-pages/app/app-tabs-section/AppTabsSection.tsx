import React from 'react'
import css from './app-tabs-section.module.scss'

type AppHeaderProps = {
  tabs: {
    title: string
    content: any
  }[]
  title: string
  className?: string
}

export const AppTabsSection = (props: AppHeaderProps) => {
  const [selectedTab, setSelectedTab] = React.useState(0)

  let className = css['header']

  if (props.className) className += ` ${props.className}`

  return (
    <>
      <div className={className}>
        <p className="app-header">{props.title}</p>

        <div className={css['tabs']}>
          {props.tabs.map((tab: any, index: number) => {
            const selected = selectedTab === index
            let className = css['tab']

            if (selected) className += ` ${css['selected']}`

            return (
              <div key={tab.title} className={className} onClick={() => setSelectedTab(index)}>
                {tab.title}
              </div>
            )
          })}
        </div>
      </div>

      {props.tabs[selectedTab].content}
    </>
  )
}
