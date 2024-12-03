import React, { useState } from 'react'
import themes from './themes.module.scss'
import Page from 'components/common/layouts/page'
import { pageHOC } from 'context/pageHOC'
import css from './experiences.module.scss'
import HeroBackground from 'assets/images/pages/hero-bgs/city-guide.png'
import { getGlobalData } from 'services/global'
import { useTina } from 'tinacms/dist/react'
import { client } from '../../tina/__generated__/client'
import { PagesExperiences, PagesIndex, PagesQuery } from '../../tina/__generated__/types'
import RichText from 'lib/components/tina-cms/RichText'
import { PageHero } from 'components/common/page-hero'
import InfiniteScroller from 'lib/components/infinite-scroll'
import HackerBasement2 from 'assets/images/hacker-basement/hacker-basement-2.png'
import HackerBasement3 from 'assets/images/hacker-basement/hacker-basement-3.png'
import HackerBasement4 from 'assets/images/hacker-basement/hacker-basement-4.png'
import HackerBasement5 from 'assets/images/hacker-basement/hacker-basement-5.png'
import HackerBasement6 from 'assets/images/hacker-basement/hacker-basement-6.png'
import HackerBasement7 from 'assets/images/hacker-basement/hacker-basement-7.png'
import HackerBasement8 from 'assets/images/hacker-basement/hacker-basement-8.png'
import HackerBasement from 'assets/images/hacker-basement/background.png'
import HackerBasementTag from 'assets/images/hacker-cave.png'
import Entertainment from 'assets/images/dc-7/entertainment.png'
import SpacesBackground from 'assets/images/dc-7/spaces-background.png'
import indexCss from './index.module.scss'
import { Button } from 'lib/components/button'
import { CLSSection } from './index'
import classNames from 'classnames'
import { Link } from 'components/common/link'
import Image from 'next/image'

export default pageHOC(function Experiences(props: any) {
  const { data } = useTina<PagesQuery>(props.cms)
  const { data: dataCLS } = useTina<PagesQuery>(props.cmsCLS)
  const pages = data.pages as PagesExperiences
  const pagesCLS = dataCLS.pages as PagesIndex
  const [expanded, setExpanded] = useState(false)

  return (
    <Page theme={themes['news']}>
      <PageHero
        title="Experiences"
        heroBackground={HeroBackground}
        path={[{ text: <span className="bold">Event</span> }, { text: 'Experiences' }]}
        navigation={[
          {
            title: 'Experiences',
            to: '#experiences',
          },
          {
            title: 'Community Hubs',
            to: '#community-hubs',
          },
          {
            title: 'Community-led Sessions',
            to: '#cls',
          },
          {
            title: 'Spaces',
            to: '#spaces',
          },
          {
            title: 'Hacker Cave',
            to: '#hacker-cave',
          },
          {
            title: 'DIPs',
            to: '#dips',
          },
          {
            title: 'Music, Art, Treasure Hunt',
            to: '#music-art-treasure-hunt',
          },
        ]}
      />
      <div className="section">
        <div
          className="flex flex-col gap-8 md:flex-row justify-between mb-8 border-bottom pb-8 relative"
          id="experiences"
        >
          <div className="w-full md:w-1/2">
            <RichText content={pages.intro}></RichText>
          </div>
          <div className="flex justify-center w-full md:w-1/2">
            <Image src={Entertainment} alt="Entertainment" className="max-w-[300px] object-contain" />
          </div>

          <div className={`${indexCss['scrolling-text-background']} ${css['experiences']}`}>
            <InfiniteScroller nDuplications={2} speed="120s">
              <p className="bold">DEVCON EXPERIENCES&nbsp;</p>
            </InfiniteScroller>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="pb-8 border-bottom relative" id="community-hubs">
          <RichText content={pages.community_hubs}></RichText>

          <div
            className={classNames(
              'grid relative grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 py-8 pt-4 mt-4',
              { [css.expand]: !expanded }
            )}
          >
            {pages.hubs_list &&
              pages.hubs_list.map(({ title, description, location, url }: any) => {
                return (
                  <Link
                    to={url || ''}
                    onClick={(e: any) => {
                      if (!url) {
                        e.preventDefault()
                        return
                      }
                    }}
                    className="flex flex-col justify-between gap-2 p-4 bg-[#F8F9FE] rounded-xl shadow hover:bg-[#eeeeff] transition-colors duration-500"
                    key={title}
                  >
                    <div>
                      <p className="text-xl font-secondary bold underline mb-2">{title}</p>
                      <RichText content={description}></RichText>
                    </div>
                    {location && (
                      <div className="border-top pt-4 mt-2 text-xs text-[#646a6b] bold uppercase">
                        Location: {location}
                      </div>
                    )}
                  </Link>
                )
              })}
          </div>

          <div className="flex justify-center">
            <Button onClick={() => setExpanded(!expanded)} className="mt-2" color="black-1" fill>
              {expanded ? 'Show Less' : 'Show All Hubs'}
            </Button>
          </div>
          <div className={`${indexCss['scrolling-text-background']} ${css['experiences']}`}>
            <InfiniteScroller nDuplications={2} speed="120s" reverse>
              <p className="bold">AROUND THE VENUE&nbsp;</p>
            </InfiniteScroller>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="py-8 border-bottom relative" id="discussion-corners">
          <RichText content={pages?.discussion_corners}></RichText>

          <Link
            indicateExternal
            className="pb-4 font-semibold text-underline"
            to="https://ef-events.notion.site/Public-Devcon-Meeting-Rooms-and-Discussion-Corners-Booking-System-11c638cdc41580318344cf7736c02f92"
          >
            More details here
          </Link>

          <iframe
            src="https://calendar.google.com/calendar/u/0/embed?height=600&wkst=2&ctz=Asia/Bangkok&showPrint=0&hl=en&mode=AGENDA&showTabs=1&showDate=1&showTitle=0&showNav=1&showTz=0&src=Y18xZjA5MTAyYWQ2ZjIzNzM1M2ZjMGVjNGM3NDk2MTAzODU2ZDgyMGUzNjVhYzA1ZjZmMmU1NGNkZDRmNGYwMjdmQGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20&src=Y19lMTE4NTY3NTU2ZGViMWY5ZjI1MzMzMmUyMzkyZjA3YWNiNDFhZjVjMzRlNWQ4YmJkMzg4NjFlOWJmODhlMTE1QGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20&src=Y183YmIzZGViNDhlNTM5ZGNmMmExNjJiNTZjOTc4MmRlOGJjN2NkMmQ1YTY2ZDk4ZmIxNGJmYjJmZjRhNDkyZDM2QGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20&src=Y19kOGNiZDY1NjM1OWU3MTlhNDM4NmQ1MTQyMTJmZDhkMDlhMDA4ZjJjZDU2YjNlZGE1OTkzOTI5MDM3MjI4MDAxQGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20&color=%234285F4&color=%23EF6C00&color=%23B39DDB&color=%23D50000&dates=20241111/20241117
"
            className="w-full h-[500px] mt-4"
          ></iframe>
        </div>
      </div>

      <div className="section mt-8">
        <CLSSection
          title={pagesCLS.community_led_sessions?.title}
          body={pagesCLS.community_led_sessions?.body}
          sessions={pagesCLS.community_led_sessions?.sessions}
        />
      </div>

      <div className="section">
        <h2 className="clear-top mb-6" id="spaces">
          Spaces
        </h2>
        <div className="grid relative grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8 ">
          {pages.spaces &&
            pages.spaces.map(({ title, description }: any, index: number) => {
              return (
                <div
                  className={`relative overflow-hidden  flex flex-col justify-between gap-2 p-8 pb-24 rounded-xl shadow border border-solid border-[#D0D1FF] ${
                    index % 3 === 0 ? 'bg-[#F0FFB0]' : index % 3 === 1 ? 'bg-[#FFF8D0]' : 'bg-[#FFD0A0]'
                  }`}
                  key={title}
                >
                  <div className="relative z-[1]">
                    <p className="text-lg font-secondary bold mb-4">{title}</p>
                    <RichText content={description}></RichText>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-full rounded-xl overflow-hidden">
                    <Image src={SpacesBackground} alt="Spaces background" className="w-full h-full object-cover" />
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      <section className={`${css['hacker-basement']} expand`}>
        <div className={css['background']}>
          <Image src={HackerBasement} alt="Hacker basement" />
        </div>
        <div id="hacker-cave">
          <div className="section">
            <h2 className="clear-top clear-bottom">Hacker Cave</h2>
          </div>

          <InfiniteScroller reverse speed="120s">
            <p className={`${css['stroked']} ${css['infinite-text']}`}>
              Learn • Focus • Ideate • Test • Code • Collaborate •&nbsp;
            </p>
          </InfiniteScroller>
          <div className="section">
            <div className="two-columns reverse-order-on-mobile clear-top">
              <div className={`left flex items-center`}>
                <RichText content={pages.hacker_cave}></RichText>
              </div>

              <div className={`right ${css['tag']}`}>
                <Image className={css['image-take-up-space']} src={HackerBasementTag} alt="Hacker basement tag" />

                <Image className={css['glitch-image']} src={HackerBasementTag} alt="Hacker basement tag" />
                <Image className={css['glitch-image']} src={HackerBasementTag} alt="Hacker basement tag" />
                <Image className={css['glitch-image']} src={HackerBasementTag} alt="Hacker basement tag" />
                <Image className={css['glitch-image']} src={HackerBasementTag} alt="Hacker basement tag" />
                <Image className={css['glitch-image']} src={HackerBasementTag} alt="Hacker basement tag" />
              </div>
            </div>
          </div>

          <div className="clear-top mb-12 expand" style={{ display: 'flex', justifyContent: 'center' }}>
            <InfiniteScroller speed="120s">
              <div className="flex gap-4">
                <Image
                  src={HackerBasement2}
                  alt="Hacker basement illustration"
                  width={241}
                  height={136}
                  className="rounded-lg"
                />
                <Image
                  src={HackerBasement3}
                  alt="Hacker basement illustration"
                  width={241}
                  height={136}
                  className="rounded-lg"
                />
                <Image
                  src={HackerBasement4}
                  alt="Hacker basement illustration"
                  width={241}
                  height={136}
                  className="rounded-lg"
                />
                <Image
                  src={HackerBasement5}
                  alt="Hacker basement illustration"
                  width={241}
                  height={136}
                  className="rounded-lg"
                />
                <Image
                  src={HackerBasement6}
                  alt="Hacker basement illustration"
                  width={241}
                  height={136}
                  className="rounded-lg"
                />
                <Image
                  src={HackerBasement7}
                  alt="Hacker basement illustration"
                  width={241}
                  height={136}
                  className="rounded-lg"
                />
                <Image
                  src={HackerBasement8}
                  alt="Hacker basement illustration"
                  width={241}
                  height={136}
                  className="rounded-lg mr-4"
                />
              </div>
            </InfiniteScroller>
            {/* <SwipeToScroll scrollIndicatorDirections={{ left: true, right: true }} alwaysShowscrollIndicators>
                <div className={css['gallery']}>
                  <Image src={HackerBasement2} alt="Hacker basement illustration" width={241} height={136} />
                  <Image src={HackerBasement3} alt="Hacker basement illustration" width={241} height={136} />
                  <Image src={HackerBasement4} alt="Hacker basement illustration" width={241} height={136} />
                  <Image src={HackerBasement5} alt="Hacker basement illustration" width={241} height={136} />
                  <Image src={HackerBasement6} alt="Hacker basement illustration" width={241} height={136} />
                  <Image src={HackerBasement7} alt="Hacker basement illustration" width={241} height={136} />
                  <Image src={HackerBasement8} alt="Hacker basement illustration" width={241} height={136} />
                </div>
              </SwipeToScroll> */}
          </div>
        </div>
      </section>
      {/* </div> */}

      <div className="section" id="dips">
        <div className="mb-8 py-8 border-bottom">
          <RichText content={pages.dips}></RichText>
        </div>
      </div>

      <div className="section pb-8" id="music-art-treasure-hunt">
        <div className="two-columns">
          <RichText content={pages.music_and_art}></RichText>
          <RichText content={pages.treasure_hunt}></RichText>
        </div>
      </div>
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const content = await client.queries.pages({ relativePath: 'experiences.mdx' })
  const contentCLS = await client.queries.pages({ relativePath: 'index.mdx' })

  return {
    props: {
      ...globalData,
      page: {},
      cms: {
        variables: content.variables,
        data: content.data,
        query: content.query,
      },
      cmsCLS: {
        variables: contentCLS.variables,
        data: contentCLS.data,
        query: contentCLS.query,
      },
    },
  }
}
