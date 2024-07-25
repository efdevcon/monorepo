import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import { pageHOC } from 'context/pageHOC'
import { getGlobalData } from 'services/global'
import { useTina } from 'tinacms/dist/react'
import { client } from '../../tina/__generated__/client'
import { PagesCity_Guide, PagesQuery } from '../../tina/__generated__/types'
import RichText from 'lib/components/tina-cms/RichText'
import InfiniteScroller from 'lib/components/infinite-scroll'
import cn from 'classnames'
import indexCss from './index.module.scss'
import css from './city-guide.module.scss'
import HeroBackground from 'assets/images/pages/hero-bgs/city-guide.png'
import { Snapshot } from 'components/common/snapshot'
import IconClock from 'assets/icons/icon_clock.svg'
import IconCurrency from 'assets/icons/icon_currency.svg'
import IconGlobe from 'assets/icons/icon_globe.svg'
import IconSun from 'assets/icons/icon_sun.svg'
import IconWater from 'assets/icons/icon_water.svg'
import OrangeBackground from 'assets/images/dc-7/orange-background-image.png'
import CityGuide1 from 'assets/images/dc-7/city-guide-carousel/1.png'
import CityGuide2 from 'assets/images/dc-7/city-guide-carousel/2.png'
import CityGuide3 from 'assets/images/dc-7/city-guide-carousel/3.png'
import CityGuide4 from 'assets/images/dc-7/city-guide-carousel/4.png'
import CityGuide5 from 'assets/images/dc-7/city-guide-carousel/5.png'
import CityGuide6 from 'assets/images/dc-7/city-guide-carousel/6.png'
import CityGuide7 from 'assets/images/dc-7/city-guide-carousel/7.png'
import CityGuide8 from 'assets/images/dc-7/city-guide-carousel/8.png'
import Image from 'next/image'
import ChevronDown from 'assets/icons/chevron-down.svg'
import ChevronUp from 'assets/icons/chevron-up.svg'
import { Link } from 'components/common/link'
import { Button } from 'lib/components/button'
import InfiniteScroll from 'lib/components/infinite-scroll/infinite-scroll'
import AmazingThailand from 'assets/images/dc-7/amazing-thailand.png'
import { motion } from 'framer-motion'
import HitchhikerGuide from 'assets/images/dc-7/community-guides/hitchhiker.png'

const Lanterns = () => {
  const lanternSrc = 'https://i.ibb.co/Mc0xHxZ/lantern.png'
  const cloudSrc = 'https://i.ibb.co/3sL48rr/cloud.png'
  const citySrc = 'https://i.ibb.co/wJ6pVKt/city.png'

  const lanternImages = Array.from({ length: 20 }, (_, i) => (
    <img key={i} className={`${css['lantern']} ${css[`l${i + 1}`]}`} src={lanternSrc} alt={`Lantern ${i + 1}`} />
  ))

  const cloudImages = Array.from({ length: 5 }, (_, i) => (
    <img key={i} className={`${css['cloud']} ${css[`c${i + 1}`]}`} src={cloudSrc} alt={`Cloud ${i + 1}`} />
  ))

  return (
    <div className={css['lantern-container']}>
      <section>
        <div className={css['blur']}>
          {Array.from({ length: 25 }, (_, i) => (
            <img
              key={`blur-${i}`}
              className={`${css['lantern']} ${css[`l${i + 1}`]}`}
              src={lanternSrc}
              alt={`Blur Lantern ${i + 1}`}
            />
          ))}
        </div>
        {lanternImages}
      </section>
      <section className={css['cloud-wrap']}>{cloudImages}</section>
      {/* <aside className="land">
        <img src={citySrc} alt="City" />
      </aside> */}
    </div>
  )
}

export default pageHOC(function CityGuide(props: any) {
  const { data } = useTina<PagesQuery>(props.cms)
  const cityGuide = data.pages as PagesCity_Guide
  const [openFAQ, setOpenFAQ] = React.useState<string | null>(null)
  // const [canBack, setCanBack] = React.useState(false)
  // const [canNext, setCanNext] = React.useState(false)

  return (
    <Page theme={themes['news']}>
      <PageHero
        heroBackground={HeroBackground}
        title="City Guide"
        path={[{ text: <span className="bold">Bangkok</span> }, { text: 'City Guide' }]}
        navigation={[
          {
            title: 'Location',
            to: '#location',
          },
          {
            title: 'Bangkok',
            to: '#bangkok',
          },
          {
            title: 'Why SEA?',
            to: '#why',
          },
          {
            title: 'Local Experience',
            to: '#local',
          },
          {
            title: 'Areas to Stay',
            to: '#areas',
          },
          {
            title: 'Devcon Map',
            to: '#map',
          },
          {
            title: 'FAQ',
            to: '#faq',
          },
        ]}
      />

      <div className={css['city-guide']}>
        <div className="section" id="location">
          <div className={cn('flex relative justify-between gap-8 border-bottom flex-col lg:flex-row pb-8')}>
            <div className={`${indexCss['scrolling-text-background']}`}>
              <InfiniteScroller nDuplications={2} speed="120s" reverse>
                <p className="bold">กรุงเทพมหานคร&nbsp;</p>
              </InfiniteScroller>
            </div>
            <div className="grow">
              <RichText content={cityGuide.intro_city_guide} />
            </div>
            <div className="flex-0 shrink-0 max-w-[100%] lg:max-w-[50%] w-[550px]">
              {cityGuide.intro_snapshot?.title && <RichText content={cityGuide.intro_snapshot.title} />}

              {cityGuide.intro_snapshot && (
                <Snapshot
                  // @ts-ignore
                  items={cityGuide.intro_snapshot.snapshot.map(({ left, right }: any, index: number) => {
                    let icon

                    // TODO: Icon support in CMS
                    if (index === 0) {
                      icon = IconClock
                    }
                    if (index === 1) {
                      icon = IconCurrency
                    }
                    if (index === 2) {
                      icon = IconGlobe
                    }

                    if (index === 3) {
                      icon = IconSun
                    }

                    if (index === 4) {
                      icon = IconWater
                    }

                    return {
                      id: index,
                      Icon: icon,
                      left: <RichText content={left} />,
                      right: <RichText content={right} />,
                    }
                  })}
                />
              )}
            </div>
          </div>
        </div>

        <div className={cn(css['orange-section'], 'overflow-hidden')} id="bangkok">
          <div className="section" id="overview">
            <div className="py-8">
              <RichText content={cityGuide.city_of_angels} />
            </div>
          </div>

          <InfiniteScroll
            nDuplications={2}
            speed={`${props.speed || 200}s`}
            marqueeClassName={props.marqueeClassName || `h-[350px] pointer-events-none`}
          >
            {[CityGuide1, CityGuide2, CityGuide3, CityGuide4, CityGuide5, CityGuide6, CityGuide7, CityGuide8].map(
              (image: any, index) => {
                return (
                  <div key={index} className={cn('aspect-video flex gap-8 mr-8 mb-8 mt-16', css['scrolling-images'])}>
                    <Image
                      src={image}
                      alt={`City Image: ${index}`}
                      height={350}
                      className="object-cover h-full w-full rounded-xl"
                      priority
                    />
                  </div>
                )
              }
            )}
          </InfiniteScroll>

          <div className="section absolute top-0 bottom-0 left-0 right-0 pointer-events-none">
            <Image
              src={OrangeBackground}
              alt="Bangkok Skyline"
              data-id="image"
              className="w-100 absolute bottom-0 h-full -z-10 opacity-70 object-cover"
            />
            <div className={css['mask']}></div>
          </div>
        </div>

        <div className="section" id="why">
          <div className="py-12 xl:py-24 relative">
            <div className={`${indexCss['scrolling-text-background']} ${indexCss['alternate']}`}>
              <InfiniteScroller nDuplications={2} speed="180s" reverse>
                <p className="bold">SOUTHEAST ASIA&nbsp;</p>
              </InfiniteScroller>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 xl:gap-24">
              <div className="flex flex-col justify-center">
                <RichText content={cityGuide.why_sea} />
              </div>
              <div className="flex flex-col gap-4 justify-center items-center">
                <div className="w-full max-w-[630px]">
                  <div className="aspect-video rounded-2xl shadow-lg mb-2">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/-1vv0b99ztk`}
                      className="rounded-xl shadow-lg overflow-hidden"
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                  <RichText content={cityGuide.why_sea_second_part} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={cn('text-white relative', css['black-section'])} id="local">
          <div className="section relative pt-16 overflow-hidden" id="overview">
            <div className="absolute top-0 left-0 bottom-0 right-0 z-1 opacity-60">
              <Lanterns />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 xl:gap-24 z-[2]">
              <RichText content={cityGuide.local_experiences} />
              <div className="flex flex-col items-center">
                <div className="w-full xl:max-w-[630px]">
                  <div className="flex justify-between">
                    <RichText content={cityGuide.community_guides?.text} />
                    {/* <div>
                      <Button
                        disabled={!canBack}
                        circle
                        className="border-2 cursor-pointer"
                        aria-label="Slide left"
                        onClick={() => props.sliderRef.current?.slickPrev()}
                      >
                        <ChevronLeft />
                      </Button>
                      <Button
                        disabled={!canNext}
                        circle
                        className="border-2 ml-2 cursor-pointer"
                        aria-label="Slide right"
                        onClick={() => props.sliderRef.current?.slickNext()}
                      >
                        <ChevronRight />
                      </Button>
                    </div> */}
                  </div>

                  <motion.div className="flex flex-col gap-1 z-10">
                    {cityGuide.community_guides?.community_guides &&
                      cityGuide.community_guides?.community_guides.map((guide, index) => (
                        <React.Fragment key={guide?.title}>
                          <div className="text-xl font-secondary">{guide?.title}</div>
                          <div className="text-[#EA766E] bold text-sm hover:underline">
                            <Link to="https://x.com/spaceagente">{guide?.author}</Link>
                          </div>

                          <div className="aspect-[15/7] max-w-[630px] my-2">
                            <div className="relative h-full w-full rounded-xl shadow-lg bg-black border-[1px] border-[#12161e] border-solid">
                              <Image
                                src={HitchhikerGuide}
                                alt="Guide Image"
                                data-id="image"
                                className="w-full h-full object-cover rounded-xl"
                              />
                              <div className="absolute bottom-2 left-2 right-2 italic px-2 opacity-80">
                                {guide?.card}
                              </div>
                            </div>
                          </div>

                          <Link to={guide?.url}>
                            <Button fat color="orange-1" className="self-start mt-2">
                              Read Guide
                            </Button>
                          </Link>
                        </React.Fragment>
                      ))}
                  </motion.div>
                </div>
              </div>
            </div>

            <div className="relative flex flex-col justify-start pt-24 mt-8 z-[2] pointer-events-none">
              <Image src={AmazingThailand} alt="Amazing Thailand logo" className="max-w-[100px] object-contain mb-8" />
              {/* <Link
                to="https://www.tourismthailand.org/Search-result/attraction?destination_id=219&sort_by=datetime_updated_desc&page=1&perpage=15&menu=attraction"
                indicateExternal
                className="text-lg bold uppercase mb-8 pointer-events-auto hover:underline"
                style={{ '--color-icon': 'white' }}
              >
                Tourism Thailand Website
              </Link> */}
              <div className={`${indexCss['scrolling-text-background']} ${css['looping-text']} select-none`}>
                <InfiniteScroller nDuplications={3} speed="180s">
                  <p className={cn('bold')}>EXPERIENCES&nbsp;</p>
                </InfiniteScroller>
              </div>
            </div>
          </div>
        </div>

        <div className="section" id="areas">
          <div className="py-8  border-top h2 bold">Areas to stay</div>

          <div className="grid relative grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-4 pb-8">
            {cityGuide.areas &&
              cityGuide.areas.map(({ title, text, metro_distance, metro_station, metro_url }: any) => {
                return (
                  <div className="flex flex-col justify-between gap-2 p-4 bg-[#F8F9FE] rounded-xl shadow" key={title}>
                    <div>
                      <p className="text-lg font-secondary bold">{title}</p>
                      <RichText content={text}></RichText>
                    </div>
                    <div className="border-top pt-4 mt-8 text-xs text-[#FF9988] bold uppercase">
                      <div className="mb-2">
                        <span className="uppercase bold text-neutral-500">Distance to venue:</span> {metro_distance}
                        &nbsp;KM
                      </div>
                      <Link
                        indicateExternal
                        style={{ '--color-icon': '#FF9988' }}
                        className="hover:underline"
                        to={metro_url}
                      >
                        {metro_station}
                      </Link>
                    </div>
                  </div>
                )
              })}

            <div className={`${indexCss['scrolling-text-background']}`}>
              <InfiniteScroller nDuplications={2} speed="120s" reverse>
                <p className="bold">AROUND THE VENUE&nbsp;</p>
              </InfiniteScroller>
            </div>
          </div>
        </div>

        <div className="section" id="map">
          <div className="py-8 border-top">
            <RichText content={cityGuide.getting_around} />
          </div>
        </div>

        <iframe
          src="https://www.google.com/maps/d/embed?mid=1BHVWGTlFT6971Ws0yYCW7BfhAGh9w2M&ehbc=2E312F"
          width="100%"
          height="500px"
          className="expand"
        ></iframe>

        <div className="section mb-12 relative">
          <div className="anchor absolute" id="faq"></div>
          <div className="h2 bold mb-6 pt-8 border-top">Frequently Asked</div>
          <div className="flex flex-col">
            {cityGuide.city_guide_faq &&
              cityGuide.city_guide_faq.map(({ question, answer }: any) => {
                const open = question === openFAQ

                return (
                  <div key={question} className="w-full border-[#E2E3FF] bg-[#F8F9FE] rounded-xl shadow mb-4 ">
                    <div
                      className="w-full p-4 bold cursor-pointer select-none hover:opacity-70 flex justify-between items-center"
                      onClick={() => setOpenFAQ(open ? null : question)}
                    >
                      {question}
                      <div className="flex opacity-60">{open ? <ChevronUp /> : <ChevronDown />}</div>
                    </div>

                    {open && (
                      <motion.div
                        initial={{ y: '-20%', opacity: 0 }}
                        animate={{ y: '0%', opacity: 100 }}
                        className="w-full p-4 pt-2"
                      >
                        <RichText content={answer}></RichText>
                      </motion.div>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  // await GetPage('terms-of-service', context.locale)

  const content = await client.queries.pages({ relativePath: 'city_guide.mdx' })

  return {
    props: {
      ...globalData,
      page: {},
      cms: {
        variables: content.variables,
        data: content.data,
        query: content.query,
      },
    },
  }
}
