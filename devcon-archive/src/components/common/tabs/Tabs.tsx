import { useLocation } from '@reach/router'
import React, { ReactNode, useState, useEffect, useImperativeHandle } from 'react'
import { useQueryStringer } from 'src/hooks/useQueryStringer'
import css from './tabs.module.scss'

interface TabsProps {
  children: any
  useQuerystring?: boolean
  tabContentClassName?: string
  onSelectTab?: (tab: string) => void
}

const isValidTab = (children: React.ReactChildren, tab: string) => {
  return React.Children.toArray(children).some(child => child?.props?.title === tab)
}

const findFirstValidTab = (children: React.ReactChildren): any => {
  // Children can be invalid (happens when a child is rendered conditionally), so we'll loop until we find the first valid child
  return React.Children.toArray(children).find(child => !!child)
}

export const Tabs = React.forwardRef((props: TabsProps, ref: any) => {
  const tabFromQueryString = new URLSearchParams(useLocation().search).get('tab')
  const defaultTab = props.children ? findFirstValidTab(props.children)?.props?.title : ''
  const [activeTab, setActiveTab] = useState(defaultTab)

  // Sync active tab on mount if query string is defined
  React.useLayoutEffect(() => {
    if (tabFromQueryString && props.children && isValidTab(props.children, tabFromQueryString)) {
      onSelectTab(tabFromQueryString)
    }
  }, [])

  useImperativeHandle(ref, () => ({
    setActiveTab,
  }))

  async function onSelectTab(tab: string) {
    setActiveTab(tab)
    if (props.onSelectTab) props.onSelectTab(tab)
  }

  useQueryStringer(props.useQuerystring ? { tab: activeTab } : {}, props.useQuerystring, true)

  let tabContentClassName = css['tab-content']
  if (props.tabContentClassName) tabContentClassName += ` ${props.tabContentClassName}`

  return (
    <>
      <ul className={css['tabs']}>
        {props.children &&
          props.children.map((child: any) => {
            if (!child) return null

            const childProps = child.props
            const className = childProps.title === activeTab ? 'active' : ''

            return (
              <li key={childProps.title} className={css[className]} onClick={() => onSelectTab(childProps.title)}>
                {childProps.title}
              </li>
            )
          })}
      </ul>

      <div className={tabContentClassName}>
        {props.children &&
          props.children.map((child: any) => {
            if (!child) return null
            if (child.props.title !== activeTab) return undefined
            return child
          })}
      </div>
    </>
  )
})

interface TabProps {
  title: string
  children: ReactNode
}

export function Tab(props: TabProps) {
  return <div id={props.title}>{props.children}</div>
}
