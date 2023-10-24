import React from 'react'
import css from './feed.module.scss'
import IconTwitter from 'src/assets/icons/twitter.svg'
import IconStickyNote from 'src/assets/icons/sticky-note.svg'
import { Link } from 'src/components/common/link'
import { Dropdown } from 'src/components/common/dropdown'
import { Filter, useFilter } from 'src/components/common/filter'
import { FilterOptions } from 'src/components/common/filter/Filter'
import { DropdownProps } from 'src/components/common/dropdown/Dropdown'
import { useIntl } from 'gatsby-plugin-intl'
import moment from 'moment'

type FeedItem = {
  id?: string
  date?: Date
  author?: string
  url?: string
  title: string
  description?: string
  tags?: string[]
}

type Props = {
  inline?: boolean
  title: string
  items: Array<FeedItem>
  filterOptions?: FilterOptions
  sortOptions?: {
    options: DropdownProps['options']
    sort: (items: any[], sortBy: string) => any[]
  }
}

const Icon = ({ item }: { item: FeedItem }) => {
  if (item?.url?.includes('twitter')) {
    return (
      <div className={css['icon-container']}>
        <IconTwitter />
      </div>
    )
  }

  if (item?.url?.includes('blog.ethereum.org')) {
    return (
      <div className={css['icon-container']}>
        <IconStickyNote /> {/* Maybe a better icon for this */}
      </div>
    )
  }

  return null
}

export const Title = ({ item }: { item: FeedItem }) => {
  const intl = useIntl()
  const isTweet = item?.url?.includes('twitter')

  return (
    <p
      className={`${css['title']} fonts-xxl bold`}
      dangerouslySetInnerHTML={{ __html: isTweet ? intl.formatMessage({ id: 'news_tweet' }) : item.title }}
    />
  )
}

export const Feed = ({ inline, title, items, filterOptions, sortOptions }: Props) => {
  const intl = useIntl()
  const [sortBy, setSortBy] = React.useState(sortOptions?.options[0].value)
  const [filteredData, filterState] = useFilter(filterOptions)
  const filteredItems = filterOptions ? filteredData : items
  const sortedItems = sortOptions ? sortOptions.sort(filteredItems, sortBy) : filteredItems

  const formattedItems = sortedItems.map((item: FeedItem, index) => {
    const body = (
      <div id={item.id} className={css['item-body']}>
        <div className={css['metadata']}>
          <p className={css['date']}>{moment.utc(item.date).format('MMM D, YYYY')}</p>
          <p className={css['author']}>{item.author}</p>
          {/* <Icon item={item} className={css['icon-desktop']} /> */}
        </div>
        <div className={css['text']}>
          <Title item={item} />

          <p className={css['description']} dangerouslySetInnerHTML={{ __html: item.description }} />

          {item.tags && item.tags.length > 0 && (
            <div className={css['tags']}>
              {item.tags.map(tag => {
                return (
                  <div key={tag} className="label bold">
                    {tag}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <Icon item={item} />
      </div>
    )

    if (item.url) {
      return (
        <Link to={item.url} key={item.url} className={css['item']}>
          {body}
        </Link>
      )
    }

    return <div className={css['item']}>{body}</div>
  })

  const noResults = formattedItems.length === 0

  return (
    <div className={`${css['feed']} ${inline ? css['inline'] : ''}`}>
      <div className={css['header']}>
        <h3 className={css['header']}>{title}</h3>
        <div className={css['right']}>
          {filterState && <Filter collapsed {...filterState} />}

          {sortOptions && <Dropdown options={sortOptions.options} value={sortBy} onChange={setSortBy} />}
        </div>
      </div>

      {noResults ? (
        <div className={css['no-results']}>{intl.formatMessage({ id: 'feed_no_results' })}</div>
      ) : (
        <div className={css['body']}>{formattedItems}</div>
      )}
    </div>
  )
}
