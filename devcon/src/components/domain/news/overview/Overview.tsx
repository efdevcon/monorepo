import React from 'react'
import { Feed } from 'components/common/feed'
import { NewsItem } from 'types/NewsItem'
import { useTranslations } from 'next-intl'
import moment from 'moment'
// import css from './overview.module.scss'
// import { usePageContext } from 'context/page-context'
// import { Link } from 'components/common/link'

type NewsOverviewProps = {
  newsItems: NewsItem[]
}

// const PrevNext = () => {
//   const context = usePageContext()
//   const { currentPage, numPages, lang }: any = context.pageContext
//   const isFirst = currentPage === 1
//   const isSecond = currentPage === 2
//   const isLast = currentPage === numPages
//   const prevPage = isSecond ? `/${lang}/news/` : `/${lang}/news/${currentPage - 1}`
//   const nextPage = `/${lang}/news/${currentPage + 1}`

//   return (
//     <div className={css['pagination-buttons']}>
//       {!isFirst && (
//         <Link to={prevPage} className="button">
//           ← Previous Page
//         </Link>
//       )}
//       {!isLast && (
//         <Link to={nextPage} className="button">
//           Next Page →
//         </Link>
//       )}
//     </div>
//   )
// }

export const NewsOverview = (props: NewsOverviewProps) => {
  const intl = useTranslations()
  const { newsItems } = props

  const filterItems = React.useMemo(() => {
    const tags = {} as { [key: string]: any }

    newsItems.forEach(newsItem => {
      newsItem?.tags?.forEach(tag => {
        if (!tags[tag.id])
          tags[tag.id] = {
            text: tag.title,
            value: tag.id,
          }
      })
    })

    return [{ text: intl('all'), value: 'all' }].concat(Object.values(tags))
  }, [newsItems])

  return (
    <>
      <Feed
        title={intl('devcon_updates')}
        items={newsItems as any[]}
        sortOptions={{
          options: [
            {
              text: intl('recent'),
              value: 'recent',
            },
            {
              text: intl('oldest'),
              value: 'oldest',
            },
          ],
          sort: (items: any[], sortBy: string) => {
            return items.sort((a, b) => {
              if (a.date < b.date) {
                return sortBy === 'recent' ? 1 : -1
              } else if (a.date === b.date) {
                return 0
              } else {
                return sortBy === 'recent' ? -1 : 1
              }
            })
          },
        }}
        filterOptions={{
          filters: filterItems,
          filterFunction: activeFilter => {
            return !activeFilter || activeFilter === 'all'
              ? newsItems
              : newsItems.filter(newsItem => {
                  return newsItem?.tags?.some(tag => tag.id.toLowerCase() === activeFilter.toLowerCase())
                })
          },
        }}
      />

      {/* <PrevNext /> */}
    </>
  )
}
