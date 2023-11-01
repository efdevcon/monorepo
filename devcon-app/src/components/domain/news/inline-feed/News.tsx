import React from 'react'
import { Card } from 'components/common/card'
import { Feed } from 'components/common/feed'
import css from './news.module.scss'
import { useTranslations } from 'next-intl'
import IconTwitter from 'assets/icons/twitter.svg'
import { NewsItem } from 'types/NewsItem'
import moment from 'moment'
import { Slider, useSlider } from 'components/common/slider'
import { Link } from 'components/common/link'

type NewsProps = {
  data?: any
  className?: string
}

const settings = {
  infinite: false,
  arrows: false,
  speed: 500,
  slidesToShow: 2.1,
  swipeToSlide: true,
  touchThreshold: 100,
  mobileFirst: true,
  responsive: [
    {
      breakpoint: 600,
      settings: {
        slidesToShow: 1.1,
      },
    },
  ],
}

const formatNewsForCard = (intl: any, item: NewsItem) => {
  let formattedItem = {
    ...item,
    date: new Date(item.date),
    linkUrl: item.url,
    title: item.title,
  } as any

  if (item.url?.includes('twitter')) {
    formattedItem = {
      ...formattedItem,
      titleAsIcon: <IconTwitter className={`icon font-xl`} style={{ '--color-icon': '#1DA1F2' }} />,
    }
  }

  return formattedItem
}

export const News = (props: NewsProps) => {
  const newsItems = props.data
  const intl = useTranslations()
  const sliderProps = useSlider(settings)

  return (
    <div className={`section no-overflow ${css['news-container']}`}>
      <div className="split">
        <h2 className="title spaced">{intl('news')}</h2>
        <Link to="news" className="font-sm hover-underline bold text-uppercase">
          View more
        </Link>
      </div>

      {/* Only visible on mobile */}
      <div className={css['slider-container']}>
        <Slider className={css['slider']} sliderProps={sliderProps} title={intl('news')}>
          {newsItems.slice(0, 10).map((item: NewsItem, index: any) => {
            const formattedItem = formatNewsForCard(intl, item)

            return (
              <Card
                expandLink
                slide={sliderProps[1].canSlide}
                className={`${css['card']} ${css['slider']}`}
                key={index}
                metadata={[moment.utc(formattedItem.date).format('MMM D, YYYY')]}
                {...formattedItem}
                allowDrag
              />
            )
          })}
        </Slider>
      </div>

      <div className={css['body']}>
        <div className={css['cards']}>
          {newsItems.slice(0, 2).map((item: NewsItem, index: any) => {
            const formattedItem = formatNewsForCard(intl, item)

            return (
              <Card
                expandLink
                className={css['card']}
                metadata={[moment.utc(item.date).format('MMM D, YYYY')]}
                key={index}
                {...formattedItem}
              />
            )
          })}
        </div>
        <div className={css['feed']}>
          <div className={css['absolute-wrapper']}>
            <Feed inline title={intl('news_feed')} items={newsItems.slice(2)} />
          </div>
        </div>
      </div>
    </div>
  )
}
