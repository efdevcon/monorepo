import React from 'react'
import { useRouter } from 'next/router'
import { usePageContext } from 'context/page-context'
import { Link as LinkType } from 'types/Link'

const resolvePageCategory = (pathname: string, link: LinkType, parent?: string): undefined | JSX.Element => {
  const urlMatch = link.url.includes(pathname)

  if (urlMatch) {
    if (parent) {
      return (
        <>
          {parent} / <b>{link.title}</b>
        </>
      )
    }

    return <b>{link.title}</b>
  }

  if (link.links) {
    for (let i = 0; i < link.links.length; i++) {
      const match = resolvePageCategory(pathname, link.links[i], link.title)

      if (match) return match
    }
  }
}

export const usePageCategory = () => {
  const pageContext = usePageContext()
  const router = useRouter()

  const links = React.useMemo(() => {
    if (!pageContext) return []

    return [...pageContext.navigation.site, ...Object.values(pageContext.navigation.footer).flat()]
  }, [pageContext])

  /*
    Regex splits the following:
    /en/dips/test

    Into 

    /en/dips/ + test

    We do this because at any given path, we're only interested in the url group for matching link headers, not any further nesting

    We match and resolve the first part (the "group"), and if there is a second part, we append it after resolving the group
  */
  const pageComponents = router.pathname.match(/(\/[^/]*\/[^/]*\/)(.*)/)

  if (!pageComponents) return null

  const group = pageComponents[1]
  const page = pageComponents[2]

  if (!group) return null

  const category = links.reduce((acc: null | JSX.Element, link) => {
    if (acc) return acc

    const category = resolvePageCategory(group, link)

    if (category) acc = category

    return acc
  }, null)

  return (
    <>
      {category}
      {page ? <b> / {page.split('/')[0]}</b> : ''}
    </>
  )
}
