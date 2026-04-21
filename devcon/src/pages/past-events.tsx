import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import css from './past-events.module.scss'
import heroCss from './tickets/tickets-landing.module.scss'
import { Link } from 'components/common/link'
import Image from 'next/image'
import EventLocations from 'assets/images/past-events.webp'
import { ArrowUpRight } from 'lucide-react'
import HeroBackground from './past-events-hero.png'
import { useTina } from 'tinacms/dist/react'
import { client } from '../../tina/__generated__/client'
import { PagesPast_Events, PagesQuery } from '../../tina/__generated__/types'
import InfiniteScroller from 'lib/components/infinite-scroll'
import RichText from 'lib/components/tina-cms/RichText'
import indexCss from './index.module.scss'
import { getMessages } from 'utils/intl'
import { useTranslations } from 'next-intl'

export default function PastEvents(props: any) {
  const t = useTranslations('past_events')
  const { data } = useTina<PagesQuery>(props.cms)
  const pageNode = (data as any).pages ?? (data as any).pagesHi
  const pages = pageNode as PagesPast_Events
  const events = pages.events || []

  return (
    <Page theme={themes['tickets']} withHero darkFooter>
      <PageHero
        className={`${heroCss['hero-no-side-gradient']} ${css['hero-overlay']} !mb-0`}
        titleClassName={heroCss['hero-title']}
        heroBackground={HeroBackground}
        path={[]}
        title={t('hero_title')}
        navigation={events.map((event: any) => {
          return {
            title: event.title,
            to: `#${event.title}`,
          }
        })}
      />

      <div className={`section ${css['content-area']}`} style={{ paddingTop: '2rem' }}>
        <div className={`two-columns ${css['about']} clear-bottom border-bottom margin-bottom relative`}>
          <div className={`left ${css['left']}`}>
            <RichText content={pages.section1?.about} />
            <Link to="https://archive.devcon.org" className={css['btn-archive']}>
              {t('devcon_archive_button')}
              <ArrowUpRight size={16} strokeWidth={2} />
            </Link>
          </div>
          <div className={`right ${css['right']}`}>
            <h2 className="spaced">{t('past_locations_heading')}</h2>
            <Image
              src={EventLocations}
              alt={t('locations_map_alt')}
              className="lg:translate-x-[-3%] lg:scale-110 lg:mt-[10%]"
            />
          </div>

          <div className={`${indexCss['scrolling-text-background']} ${css['scrolling-text']}`} style={{ opacity: 0.5 }}>
            <InfiniteScroller nDuplications={2} speed="120s">
              <p className="bold">{t('scrolling_banner')}&nbsp;</p>
            </InfiniteScroller>
          </div>
        </div>

        <div className="border-bottom clear-bottom">
          <h2>{t('past_events_heading')}</h2>
        </div>

        {events.map((event, index: number) => {
          if (!event) return

          const isLast = index === events.length - 1

          let className = 'clear-bottom clear-top'

          if (!isLast) className += ` border-bottom`

          return (
            <div key={event.title} id={event.title} className={className}>
              <div className={css['edition']}>
                <div className={css['left']}>
                  <div className="relative w-full">
                    <Image
                      src={event.image || ''}
                      alt={`${event.title} event image`}
                      className="!w-full !h-auto !relative"
                      fill
                    />
                  </div>
                </div>
                <div className={css['right']}>
                  <h2 className="my-4">{event.title}</h2>
                  <RichText content={event.description} />
                  <div className="flex gap-3 mt-5">
                    {(() => {
                      const buttons = [
                        { text: event.button, link: event.button_link },
                        event.button2 && event.button2_link ? { text: event.button2, link: event.button2_link } : null,
                      ].filter(Boolean) as { text: string; link: string }[]

                      // Put "Watch" first if it exists
                      buttons.sort((a, b) => {
                        const aIsWatch = a.text.toLowerCase() === 'watch'
                        const bIsWatch = b.text.toLowerCase() === 'watch'
                        if (aIsWatch && !bIsWatch) return -1
                        if (!aIsWatch && bIsWatch) return 1
                        return 0
                      })

                      return buttons.map(btn => {
                        const isWatch = btn.text.toLowerCase() === 'watch'
                        return (
                          <Link key={btn.link} to={btn.link} className={isWatch ? css['btn-watch'] : css['btn-learn-more']}>
                            {btn.text}
                            <ArrowUpRight size={16} strokeWidth={2} />
                          </Link>
                        )
                      })
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        <div className="clear-bottom" />
      </div>
    </Page>
  )
}

export async function getStaticProps(context: any) {
  const locale: string = context.locale ?? 'en'
  const queries = client.queries as any
  const localeQueryKey = `pages${locale.charAt(0).toUpperCase()}${locale.slice(1)}`
  const queryFn =
    locale !== 'en' && typeof queries[localeQueryKey] === 'function' ? queries[localeQueryKey] : queries.pages

  let content
  try {
    content = await queryFn({ relativePath: 'past_events.mdx' })
  } catch {
    // Hindi MDX may not exist yet (before translator has run). Fall back to English so the page renders.
    content = await queries.pages({ relativePath: 'past_events.mdx' })
  }

  const messages = await getMessages(locale)

  return {
    props: {
      cms: {
        variables: content.variables,
        data: content.data,
        query: content.query,
      },
      messages,
    },
  }
}
