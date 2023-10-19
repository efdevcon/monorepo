import { BlogReel } from 'components/domain/blog-overview'
import { pageHOC } from 'context/pageHOC'
import { GetBlogs } from 'services/blogs'
import { DEFAULT_APP_PAGE } from 'utils/constants'
import { getGlobalData } from 'services/global'
import { News } from 'components/domain/news'
import getNews from 'services/news'
import { Header } from 'components/common/layouts/header'
import { Footer } from 'components/common/layouts/footer'
import { Hero } from 'components/domain/index/hero'
import css from './index.module.scss'
import TrackList from 'components/domain/index/track-list'
import About from 'components/domain/index/about'
import FeaturedSpeakers from 'components/domain/index/featured-speakers'
import CallsToAction from 'components/domain/index/ctas'
import Image from 'next/legacy/image'
import CircleBackground from 'assets/images/background-circles.png'
import TriangleBackground from 'assets/images/background-triangles.png'
import { GetContentSections, GetTracks } from 'services/page'
import TestExternalRepo from 'lib/components/lib-import'

export default pageHOC(function Index(props: any) {
  return (
    <div className={css['layout-default']}>
      <Header withStrip withHero />
      <Hero />

      <TestExternalRepo />

      <About content={props.sections['devcon-about']} />

      <div className={`${css['background-container']} section`}>
        <div className={`${css['circle-background']} expand`}>
          <Image src={CircleBackground} alt="Circles" />
        </div>
      </div>

      <About recap content={props.sections['devcon-recap']} />

      <FeaturedSpeakers />

      {/* <CallsToAction
        scholarApplications={props.sections['cta-scholar-applications']}
        // speakerApplications={props.sections['cta-speaker-applications']}
        // ticketPresale={props.sections['cta-ticket-presale']}
        ticketsOnSale={props.sections['tickets-on-sale-now']}
      /> */}

      {/* <News data={props.news} /> */}

      {/* <div className="clear-bottom border-bottom"></div> */}

      <TrackList tracks={props.tracks} />

      <BlogReel blogs={props.blogs} />

      <div className="clear-bottom"></div>

      <Footer />
    </div>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const sections = await GetContentSections(
    [
      'devcon-about',
      'road-to-devcon-grants',
      'devcon-recap',
      'cta-speaker-applications',
      'cta-ticket-presale',
      'cta-scholar-applications',
      'tickets-on-sale-now',
    ],
    context.locale
  )
  const tracks = GetTracks(context.locale)

  return {
    props: {
      ...globalData,
      page: DEFAULT_APP_PAGE,
      news: await getNews(context.locale),
      blogs: await GetBlogs(),
      sections,
      tracks,
    },
    revalidate: 1 * 60 * 30,
  }
}
