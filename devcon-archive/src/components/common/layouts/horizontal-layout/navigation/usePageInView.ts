import { useState, useEffect } from 'react'
import { useIntl } from 'react-intl'

export const hashSlug = (slug: string) => '#' + slug.replace(/\s/g, '-').toLowerCase()

const usePageInView = (pageRefs: any) => {
  const [pageInView, setPageInView] = useState<(string | number)[]>([])
  const intl = useIntl()

  useEffect(() => {
    const unobserve = []

    if (!window.IntersectionObserver) {
      alert(intl.formatMessage({ id: 'browser_not_supported' }))

      return
    }

    Object.entries(pageRefs.current).forEach(([pageTitle, page], index) => {
      const observer = new window.IntersectionObserver(
        entries => {
          const target = entries[0]

          if (target.intersectionRatio > 0.5) {
            setPageInView([pageTitle, index])
            window.location.replace(hashSlug(pageTitle))
          }
        },
        {
          threshold: 0.5,
        }
      )

      observer.observe(page)

      unobserve.push(() => observer.unobserve(page))
    })

    return () => {
      unobserve.forEach(f => f())
    }
  }, [intl, pageRefs])

  return pageInView
}

export default usePageInView
