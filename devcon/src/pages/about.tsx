import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import { pageHOC } from 'context/pageHOC'
import { usePageContext } from 'context/page-context'
import { Tags } from 'components/common/tags'
import { getGlobalData } from 'services/global'
import { GetContentSections, GetPage, GetFAQ, GetVideos } from 'services/page'
import { Carousel } from 'components/common/carousel'
import { Snapshot } from 'components/common/snapshot'
import { Link } from 'components/common/link'
import { useTranslations } from 'next-intl'
import { FAQ } from 'components/domain/faq'
import IconCovid from 'assets/icons/covid.svg'
import IconClock from 'assets/icons/icon_clock.svg'
import IconGlobe from 'assets/icons/icon_globe.svg'
import IconManAtDesk from 'assets/icons/man-desk.svg'
import IconYoutube from 'assets/icons/youtube.svg'
import ArrowRight from 'assets/icons/arrow_right.svg'
import css from './about.module.scss'
// import { Button } from 'components/common/button'
import { Button } from 'lib/components/button'
import { VideoCard } from 'components/common/card/VideoCard'
import SwipeToScroll from 'components/common/swipe-to-scroll'
import About1 from 'assets/images/carousel/about/about-1.jpg'
import About2 from 'assets/images/carousel/about/about-2.jpg'
import About3 from 'assets/images/carousel/about/about-3.jpg'
import About4 from 'assets/images/carousel/about/about-4.jpg'
import RichText from 'lib/components/tina-cms/RichText'
import HeroBackground from 'assets/images/pages/hero-bgs/about.jpg'
import { useTina } from 'tinacms/dist/react'
import { client } from '../../tina/__generated__/client'
import { PagesAbout, PagesQuery } from '../../tina/__generated__/types'
import InfiniteScroller from 'lib/components/infinite-scroll'
import indexCss from './index.module.scss'

export default pageHOC(function AboutPage(props: any) {
  const pageContext = usePageContext()
  const intl = useTranslations()
  const { data } = useTina<PagesQuery>(props.cms)
  const pages = data.pages as PagesAbout

  return (
    <Page theme={themes['about']}>
      <PageHero
        // className="h-[500px]"
        // renderCustomBackground={() => {
        //   return (
        //     <div className="absolute w-full h-full">
        //       <Image className="h-full w-full object-cover" src={HeroBackground} alt="Hero background"></Image>
        //     </div>
        //   )
        // }}
        heroBackground={HeroBackground}
        path={[{ text: <span className="bold">{intl('about_title')}</span> }, { text: props.page.header }]}
        navigation={[
          {
            title: 'Devcon',
            to: '#intro',
          },
          {
            title: intl('about_for_builders'),
            to: '#builders',
          },
          {
            title: intl('about_communities'),
            to: '#communities',
          },
          // {
          //   title: intl('about_support'),
          //   to: '#support',
          // },
          {
            title: intl('about_get_involved'),
            to: '#get-involved',
          },
          // {
          //   title: 'FAQ',
          //   to: '#faq',
          // },
        ]}
      />

      <div className={`section ${css['about']}`}>
        <div className={`two-columns relative pb-12`}>
          <div className={`left section-markdown ${css['intro-left']}`}>
            <h2 className="spaced" id="intro">
              {props.page.title}
            </h2>

            <div className="markdown" dangerouslySetInnerHTML={{ __html: props.page.body }}></div>
          </div>

          <div className={`right ${css['intro-right']}`}>
            <h2 className="spaced">{intl('about_devcon_by_numbers')}</h2>

            <Snapshot
              items={[
                {
                  Icon: IconClock,
                  title: 'Devcon 0',
                  right: <span className={css['theme-colored']}>2014</span>,
                },
                {
                  Icon: IconCovid,
                  title: 'Devcon 6',
                  right: <span className={css['theme-colored']}>2022</span>,
                },
                {
                  Icon: IconManAtDesk,
                  title: intl('about_past_editions'),
                  right: <span className={css['theme-colored']}>7</span>,
                },
                {
                  Icon: IconGlobe,
                  title: intl('about_continents_travelled'),
                  right: <span className={css['theme-colored']}>3</span>,
                },
                {
                  Icon: IconYoutube,
                  title: intl('about_archived_videos'),
                  right: <span className={css['theme-colored']}>727</span>,
                },
              ]}
            />

            <Link to="/past-events" className={`${css['link']} text-uppercase hover-underline bold`}>
              {intl('about_past_editions')}
              <ArrowRight />
            </Link>
          </div>

          <div className={`${indexCss['scrolling-text-background']}`}>
            <InfiniteScroller nDuplications={2} speed="120s">
              <p className="bold">DEVCON&nbsp;</p>
            </InfiniteScroller>
          </div>
        </div>

        <div className={`two-columns relative clear-bottom border-bottom margin-bottom border-top clear-top`}>
          <div className={`left section-markdown`}>
            <h2 className="spaced" id="builders">
              {props.sections['devcon-for-builders'].title}
            </h2>
            <div
              className="markdown"
              dangerouslySetInnerHTML={{ __html: props.sections['devcon-for-builders'].body }}
            ></div>
          </div>

          <div className={`right ${css['for-builders-right']}`}>
            <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
              <div className={css['videos']}>
                {props.videos.map((video: any) => {
                  const isMatch = ['The Web We Want', 'Ethereum Foundation Values'].includes(video.title)

                  if (!isMatch) return null

                  return <VideoCard key={video.title} video={{ ...video, url: video.archiveUrl }} />
                })}
              </div>
            </SwipeToScroll>
          </div>
        </div>

        <h2 className="spaced" id="communities">
          {intl('about_creating_communities')}
        </h2>

        <div id="carousel" className="expand clear-bottom">
          <Carousel
            title={intl('about_creating_communities')}
            images={[
              {
                alt: 'About 1',
                src: About1,
              },
              {
                alt: 'About 2',
                src: About2,
              },
              {
                alt: 'About 3',
                src: About3,
              },
              {
                alt: 'About 4',
                src: About4,
              },
            ]}
          />
        </div>

        <div className="two-columns clear-bottom border-bottom">
          <div className="left section-markdown">
            <div
              className="markdown"
              dangerouslySetInnerHTML={{ __html: props.sections['communities-world'].data.left }}
            ></div>

            <Link to="https://archive.devcon.org" className={`${css['link']} text-uppercase hover-underline bold`}>
              {intl('about_devcon_archive')}
              <ArrowRight />
            </Link>
          </div>
          <div className={`right ${css['community']}`}>
            <div
              className="markdown clear-bottom"
              dangerouslySetInnerHTML={{ __html: props.sections['communities-world'].data.right }}
            ></div>

            <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
              <div className={css['videos']}>
                {props.videos.map((video: any) => {
                  const isMatch = [
                    'Living On Defi',
                    'Money At The Edge: How People Stay Afloat in Venezuela',
                    'Money is the killer Ðapp: crypto in Venezuela',
                  ].includes(video.title)

                  if (!isMatch) return null

                  return <VideoCard compact key={video.title} video={{ ...video, url: video.archiveUrl }} />
                })}
              </div>
            </SwipeToScroll>
          </div>
        </div>

        {/* <h2 className="spaced clear-top" id="support">
          {props.sections['public-goods'].title}
        </h2>
        <div className="two-columns clear-bottom border-bottom">
          <div className="left">
            <div
              className="markdown"
              dangerouslySetInnerHTML={{ __html: props.sections['public-goods'].data.left }}
            ></div>
            <Link to="https://forms.gle/mWpzC6dMQFa5WwvG8">
              <Button className={`lg green ${css['button']}`}>{intl('about_supporter_application')}</Button>
            </Link>
          </div>
          <div className="right">
            <div
              className="markdown"
              dangerouslySetInnerHTML={{ __html: props.sections['public-goods'].data.right }}
            ></div>
          </div>
        </div> */}

        {/* <div className="section-markdown clear-top clear-bottom" id="involve">
          <h2 className="spaced">{props.sections['getting-involved'].title}</h2>

          <div className="markdown" dangerouslySetInnerHTML={{ __html: props.sections['getting-involved'].body }}></div>
        </div>

        <div className="two-columns clear-bottom border-bottom">
          <div className="left">
            <div
              className="markdown"
              dangerouslySetInnerHTML={{ __html: props.sections['getting-involved'].data.left }}
            ></div>
            <Link to="/applications">
              <Button className={`lg green ${css['button']}`}>{intl('about_speaker_application')}</Button>
            </Link>
          </div>
          <div className="right">
            <div
              className="markdown"
              dangerouslySetInnerHTML={{ __html: props.sections['getting-involved'].data.right }}
            ></div>
          </div>
        </div> */}

        {/* <div className="section"> */}
        <div className="mt-8 mb-8">{pages?.ctas && <RichText content={pages.ctas} />}</div>
        {/* </div> */}

        {/* <h2 className="spaced clear-top" id="get-involved">
          {props.sections['share-ideas'].title}
        </h2>

        <div className="two-columns clear-bottom">
          <div className="left">
            <div className="markdown" dangerouslySetInnerHTML={{ __html: props.sections['share-ideas'].body }}></div>
            <Link to="/dips">
              <Button className="mt-6" fat fill color="green-1">
                {intl('about_improvement_proposals')}
              </Button>
            </Link>
          </div>
        </div> */}

        {/* <div id="faq">
          <FAQ
            data={[{ id: 'something', title: 'Frequently Asked Questions', questions: props.faq }]}
            customCategoryTitle="FAQ"
            noSearch
          />
        </div> */}

        {/* <Tags items={pageContext?.current?.tags} viewOnly /> */}
      </div>
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const page = await GetPage('/about', context.locale)
  const sections = await GetContentSections(
    ['devcon-for-builders', 'communities-world', 'getting-involved', 'public-goods', 'share-ideas'],
    context.locale
  )
  const faq = await GetFAQ(context.locale)
  const content = await client.queries.pages({ relativePath: 'about.mdx' })

  return {
    props: {
      ...globalData,
      faq: faq.filter((faq: any) => faq.category.id === 'general'),
      sections,
      videos: await GetVideos(),
      page,
      cms: {
        variables: content.variables,
        data: content.data,
        query: content.query,
      },
    },
  }
}
