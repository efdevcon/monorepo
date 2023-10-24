import React from 'react'
import { Feed } from 'src/components/common/feed'
import { NewsItem } from 'src/types/NewsItem'
// import css from './overview.module.scss'
// import { usePageContext } from 'src/context/page-context'
// import { Link } from 'src/components/common/link'

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
  const { newsItems } = props

  const filterItems = React.useMemo(() => {
    const tags = {} as { [key: string]: any }

    newsItems.forEach(newsItem => {
      newsItem?.tags?.forEach(tag => {
        if (!tags[tag])
          tags[tag] = {
            text: tag,
            value: tag,
          }
      })
    })

    return [{ text: 'All', value: 'all' }].concat(Object.values(tags))
  }, [newsItems])

  return (
    <>
      <Feed
        title="Devcon updates"
        items={newsItems}
        sortOptions={{
          options: [
            {
              text: 'RECENT',
              value: 'recent',
            },
            {
              text: 'OLDEST',
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
          // filters: [{ text: 'All', value: 'all' }].concat(newsItems.map(item => ({ text: '', value: item.tags. })),
          //  [
          //   {
          //     text: 'All',
          //     value: 'all',
          //   },
          //   {
          //     text: 'Tickets',
          //     value: 'tickets',
          //   },
          //   {
          //     text: 'Corona',
          //     value: 'corona',
          //   },
          //   {
          //     text: 'Event Date',
          //     value: 'event date',
          //   },
          // ],
          filterFunction: activeFilter => {
            return !activeFilter || activeFilter === 'all'
              ? newsItems
              : newsItems.filter(newsItem => {
                  return newsItem?.tags?.some(tag => tag.toLowerCase() === activeFilter.toLowerCase())
                })
          },
        }}
      />

      {/* <PrevNext /> */}
    </>
  )
}
