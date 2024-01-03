import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import { pageHOC } from 'context/pageHOC'
import { getGlobalData } from 'services/global'
import { GetPage, GetContentSections } from 'services/page'
import HorizontalLooper from 'components/common/horizontal-looper'
import { Carousel } from 'components/common/carousel'
import Hub2 from 'assets/images/continuous-devcon/hub_02.jpg'
import Hub3 from 'assets/images/continuous-devcon/hub_03.jpg'
import Hub1 from 'assets/images/continuous-devcon/hub_01.jpg'
import Agora2 from 'assets/images/continuous-devcon/agora_02.jpeg'
import Agora4 from 'assets/images/continuous-devcon/agora_04.jpg'
import Agora5 from 'assets/images/continuous-devcon/agora_05.jpg'
import HackerBasement2 from 'assets/images/hacker-basement/hacker-basement-2.png'
import HackerBasement3 from 'assets/images/hacker-basement/hacker-basement-3.png'
import HackerBasement4 from 'assets/images/hacker-basement/hacker-basement-4.png'
import HackerBasement5 from 'assets/images/hacker-basement/hacker-basement-5.png'
import HackerBasement6 from 'assets/images/hacker-basement/hacker-basement-6.png'
import HackerBasement7 from 'assets/images/hacker-basement/hacker-basement-7.png'
import HackerBasement8 from 'assets/images/hacker-basement/hacker-basement-8.png'
import { Link } from 'components/common/link'
import { Snapshot } from 'components/common/snapshot'
import IconClock from 'assets/icons/icon_clock.svg'
import IconPeople from 'assets/icons/people.svg'
import IconLayers from 'assets/icons/layers.svg'
import IconTransactions from 'assets/icons/transactions.svg'
import ArrowRight from 'assets/icons/arrow_right.svg'
import { useTranslations } from 'next-intl'
import css from './continuous-devcon.module.scss'
import HackerBasement from 'assets/images/hacker-basement.png'
import LinkIcon from 'assets/icons/link-indicator.svg'
import HackerBasementTag from 'assets/images/hacker-basement-tag.png'
import Image from 'next/legacy/image'
import SwipeToScroll from 'components/common/swipe-to-scroll'

export default pageHOC(function ContinuousDevcon(props: any) {
  const intl = useTranslations()

  return (
    <Page theme={themes['bogota']}>
      <PageHero
        path={[{ text: <span className="bold">{intl('cd_get_involved')}</span> }, { text: props.page.header }]}
        navigation={[
          {
            title: intl('cd_meet'),
            to: '#meet',
          },
          {
            title: intl('cd_details'),
            to: '#details',
          },
          {
            title: intl('cd_community_hubs'),
            to: '#hubs',
          },
          {
            title: props.sections['hacker-basement'].title,
            to: '#hacker-basement',
          },
        ]}
      />

      <div className={`section ${css['container']}`}>
        <section className="two-columns clear-bottom" id="meet">
          <div className="left section-markdown">
            <h2 className="spaced">{props.page.title}</h2>
            <div className="markdown" dangerouslySetInnerHTML={{ __html: props.page.body }} />

            <div className={css['links']}>
              <Link to="#hacker-basement" className="text-uppercase hover-underline font-lg bold">
                {props.sections['hacker-basement'].title}
                <ArrowRight />
              </Link>
              <Link to="#hubs" className="text-uppercase hover-underline font-lg bold">
                {intl('cd_community_hubs')}
                <ArrowRight />
              </Link>
            </div>
          </div>

          <div className="right">
            <Snapshot
              items={[
                {
                  Icon: IconClock,
                  title: intl('cd_extended_hours'),
                  right: '08:00 AM  — 11:00 PM',
                },
                {
                  Icon: IconPeople,
                  title: 'Devcon after Dark',
                  right: (
                    <Link
                      indicateExternal
                      className="theme-color"
                      to="https://forum.devcon.org/t/introducing-devcon-after-dark/1375"
                    >
                      {intl('cd_devcon_forum')}
                    </Link>
                  ),
                },
                {
                  Icon: IconLayers,
                  title: props.sections['hacker-basement'].title,
                  right: (
                    <Link indicateExternal className="theme-color" to="#hacker-basement">
                      {intl('cd_learn_more')}
                    </Link>
                  ),
                },
                {
                  Icon: IconTransactions,
                  title: intl('cd_community_hubs'),
                  right: (
                    <Link to="#hubs" className="theme-color">
                      {intl('cd_learn_more')}
                    </Link>
                  ),
                },
              ]}
            />
          </div>
        </section>

        <section className="clear-top border-top margin-bottom border-bottom clear-bottom" id="details">
          <h2 className="clear-bottom">{props.sections['continuous-what'].title}</h2>
          <div className="two-columns" id="details">
            <div className="left">
              <div
                className="markdown"
                dangerouslySetInnerHTML={{
                  __html: props.sections['continuous-what'].data.left,
                }}
              ></div>
            </div>
            <div className="right">
              <div
                className="markdown"
                dangerouslySetInnerHTML={{
                  __html: props.sections['continuous-what'].data.right,
                }}
              ></div>
            </div>
          </div>
        </section>

        <section className="expand clear-bottom">
          <SwipeToScroll>
            <div className={css['carousel-wrapper']}>
              <Carousel
                noAnimation
                images={[
                  {
                    alt: 'Hub',
                    src: Hub3,
                  },
                  {
                    alt: 'Hub',
                    src: Hub2,
                  },
                  {
                    alt: 'Hub',
                    src: Hub1,
                  },
                  {
                    alt: 'Agora Convention Center',
                    src: Agora5,
                  },
                  {
                    alt: 'Agora Convention Center',
                    src: Agora2,
                  },
                  {
                    alt: 'Agora Convention Center',
                    src: Agora4,
                  },
                ]}
              />
            </div>
          </SwipeToScroll>
        </section>

        <section id="hubs" className="border-top clear-top">
          <h2 className="clear-bottom">{props.sections['community-and-ecosystem-hubs-at-devcon-bogota'].title}</h2>

          <HorizontalLooper slow unpadded>
            <p className={`${css['rainbow']} ${css['infinite-text']}`}>{intl('cd_infinite_text_1')}&nbsp;</p>
          </HorizontalLooper>

          <div className="two-columns clear-top clear-bottom border-bottom margin-bottom" id="details">
            <div className="left">
              <div
                className="markdown"
                dangerouslySetInnerHTML={{
                  __html: props.sections['community-and-ecosystem-hubs-at-devcon-bogota'].data.left,
                }}
              ></div>
            </div>
            <div className="right">
              <div
                className="markdown"
                dangerouslySetInnerHTML={{
                  __html: props.sections['community-and-ecosystem-hubs-at-devcon-bogota'].data.right,
                }}
              ></div>
            </div>
          </div>

          <div className="two-columns margin-bottom" id="details">
            <div className="left">
              <div
                className="markdown"
                dangerouslySetInnerHTML={{
                  __html: props.sections['community-and-ecosystem-hubs-at-devcon-bogota-2'].data.left,
                }}
              ></div>
              <div className={css['links']}>
                <Link
                  to="https://forum.devcon.org/t/rfp-5-community-hubs/454"
                  className="text-uppercase hover-underline font-lg bold"
                >
                  {intl('cd_apply_hub')}
                  <LinkIcon />
                </Link>
                <Link to="https://forum.devcon.org/" className="text-uppercase hover-underline font-lg bold">
                  {intl('cd_devcon_forum')}
                  <LinkIcon />
                </Link>
              </div>
            </div>
            <div className="right">
              <div
                className="markdown"
                dangerouslySetInnerHTML={{
                  __html: props.sections['community-and-ecosystem-hubs-at-devcon-bogota-2'].data.right,
                }}
              ></div>
            </div>
          </div>

          <h2 className="clear-bottom border-top clear-top">{props.sections['devcon-after-dark'].title}</h2>
          <div className="two-columns margin-bottom" id="after-dark">
            <div className="left">
              <div
                className="markdown"
                dangerouslySetInnerHTML={{
                  __html: props.sections['devcon-after-dark'].data.left,
                }}
              ></div>
            </div>
            <div className="right">
              <div
                className="markdown"
                dangerouslySetInnerHTML={{
                  __html: props.sections['devcon-after-dark'].data.right,
                }}
              ></div>
            </div>
          </div>
        </section>

        <section className={`${css['hacker-basement']} expand`}>
          <div className={css['background']}>
            <Image src={HackerBasement} alt="Hacker basement" />
          </div>
          <div className="section" id="hacker-basement">
            <h2 className="clear-top clear-bottom">{props.sections['hacker-basement'].title}</h2>

            <HorizontalLooper slow unpadded>
              <p className={`${css['stroked']} ${css['infinite-text']}`}>{intl('cd_infinite_text_2')}&nbsp;</p>
            </HorizontalLooper>

            <div className="two-columns reverse-order-on-mobile clear-top">
              <div className={`left`}>
                <div
                  className={`markdown ${css['text-body']}`}
                  dangerouslySetInnerHTML={{ __html: props.sections['hacker-basement'].body }}
                ></div>
                <div className={css['links']}>
                  <Link
                    to="https://forum.devcon.org/t/rfp-5-community-hubs/454"
                    className="text-uppercase hover-underline font-lg bold"
                  >
                    {intl('cd_apply_hub')}
                    <LinkIcon />
                  </Link>
                </div>
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

            <div className="clear-top clear-bottom expand" style={{ display: 'flex', justifyContent: 'center' }}>
              <SwipeToScroll scrollIndicatorDirections={{ left: true, right: true }} alwaysShowscrollIndicators>
                <div className={css['gallery']}>
                  <Image src={HackerBasement2} alt="Hacker basement illustration" width={241} height={136} />
                  <Image src={HackerBasement3} alt="Hacker basement illustration" width={241} height={136} />
                  <Image src={HackerBasement4} alt="Hacker basement illustration" width={241} height={136} />
                  <Image src={HackerBasement5} alt="Hacker basement illustration" width={241} height={136} />
                  <Image src={HackerBasement6} alt="Hacker basement illustration" width={241} height={136} />
                  <Image src={HackerBasement7} alt="Hacker basement illustration" width={241} height={136} />
                  <Image src={HackerBasement8} alt="Hacker basement illustration" width={241} height={136} />
                </div>
              </SwipeToScroll>
            </div>
          </div>
        </section>
      </div>
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const page = await GetPage('/continuous-devcon', context.locale)
  const sections = await GetContentSections(
    [
      'continuous-what',
      'community-and-ecosystem-hubs-at-devcon-bogota-2',
      'community-and-ecosystem-hubs-at-devcon-bogota',
      'hacker-basement',
      'devcon-after-dark',
    ],
    context.locale
  )

  return {
    props: {
      ...globalData,
      sections,
      page,
    },
  }
}
