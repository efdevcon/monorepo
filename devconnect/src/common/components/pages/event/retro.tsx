import React from 'react'
import css from './retro.module.scss'
import RichText from 'lib/components/tina-cms//RichText'
import Link from 'common/components/link/Link'
import { Button } from 'lib/components/button'
import InfiniteScroller from 'lib/components/infinite-scroll'
import Cover1 from 'assets/images/ist-video-archive/LightClient_Cover.webp'
import Cover2 from 'assets/images/ist-video-archive/wallet_unconference_cover.webp'
import Cover3 from 'assets/images/ist-video-archive/conflux_banner.webp'
import Cover4 from 'assets/images/ist-video-archive/PROGCRYPTO_Cover.webp'
import Cover5 from 'assets/images/ist-video-archive/solidity-submit-cover.webp'
import Cover6 from 'assets/images/ist-video-archive/AWA_cover.webp'
import Cover7 from 'assets/images/ist-video-archive/ethconomics_cover.webp'
import Cover8 from 'assets/images/ist-video-archive/EVM_summit_cover.webp'
import Cover9 from 'assets/images/ist-video-archive/ETHGunu_cover.webp'
import Cover10 from 'assets/images/ist-video-archive/staking_cover.webp'
import Cover11 from 'assets/images/ist-video-archive/secureum_banner.webp'
import Cover12 from 'assets/images/ist-video-archive/EPF_Cover.webp'
import SwipeToScroll from 'common/components/swipe-to-scroll'
import Cowork1 from 'assets/images/cowork-recap/cowork-1.jpg'
import Cowork2 from 'assets/images/cowork-recap/cowork-2.jpg'
import Cowork3 from 'assets/images/cowork-recap/cowork-3.jpg'
import Cowork4 from 'assets/images/cowork-recap/cowork-4.jpg'
import Cowork5 from 'assets/images/cowork-recap/cowork-5.jpg'
import Cowork6 from 'assets/images/cowork-recap/cowork-6.jpg'
import Cowork7 from 'assets/images/cowork-recap/cowork-7.jpg'
import Cowork8 from 'assets/images/cowork-recap/cowork-8.jpg'
import Image from 'next/image'
import ScrollingText from 'lib/components/infinite-scroll/scrolling-text'

const Retro = (props: any) => {
  if (props.edition === 'amsterdam') {
    return (
      <div className={`columns clear-vertical border-bottom ${css['retro']}`}>
        <div className={`left fill-45`}>
          <RichText content={props.content} className="cms-markdown" />
          {/* <p className="paragraph-intro">
            The first-ever <b>Devconnect</b> was held in 2022 in Amsterdam.
          </p>
          <p className="big-text bold margin-top-less">
            Over eight days, the Ethereum community hosted independent events and workshops and held in-depth
            discussions on topics such as Ethereum staking, Layer 2s, web3 UX, and MEV. The event took over the city of
            Amsterdam, with Devconnect flags and bikes visible all around.
          </p>
          <p className="big-text margin-top-less">
            To get a glimpse of the trending Ethereum topics at the time, check out the Devconnect Amsterdam Schedule
            below. You can also visit the different event host&apos;s websites (links provided in the schedule) to find
            recaps and photos of the independent events.
          </p> */}
        </div>
        <div className={'right'}>
          <div className="aspect">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/6X0yIUq7fpc"
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </div>
    )
  }

  if (props.edition === 'istanbul') {
    return (
      <>
        <div className="mt-8 relative">
          <div className={`columns margin-bottom border-bottom pb-8 flex flex-col xl:flex-row`}>
            <div className="xl:basis-1/2 align-self flex flex-col lg:mr-[25px]">
              <RichText content={props.content} className="cms-markdown" />
            </div>

            <div className="xl:basis-1/2 w-full md:w-3/4 md:self-start xl:w-full mt-8 xl:mt-0 xl:ml-[25px]">
              <div className="aspect">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/QoPFqV6jCTI"
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
            <ScrollingText direction="down" color="teal-2" speed="100s" className="!h-[300px]"></ScrollingText>
          </div>
        </div>

        <div className="">
          <RichText content={props.catchTheVibe} className="cms-markdown mb-8 " />
        </div>

        <div className={`${css['div-about-content']} pb-6`}>
          <InfiniteScroller nDuplications={2} speed="180s" marqueeClassName="h-[400px]">
            {[Cowork1, Cowork2, Cowork3, Cowork4, Cowork5, Cowork6, Cowork7, Cowork8].map((src, i) => {
              return (
                <Image
                  src={src}
                  key={i}
                  alt="Recorded Session Cover Image"
                  className="shrink-0 !h-full !w-auto object-contain mr-4"
                />
              )
            })}
          </InfiniteScroller>
        </div>

        <div className={`${css['div-about-content']}`}>
          <div className="">
            <div className="border-bottom mb-6 pb-6">
              <Link
                href="https://drive.google.com/drive/folders/1DlzDuVajwDmPOtE1uqns4Na9fjn6wQvy"
                className="text-teal-400"
              >
                <Button fat size="lg" fill color="teal-1">
                  {(globalThis as any).translations.view_gallery}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className={`${css['div-content']} !overflow-visible`}>
          <div className="mb-3  ">
            <div className="flex">
              <div className="relative">
                <RichText content={props.watchThePresentations} className="cms-markdown mt-0" />
              </div>
            </div>
          </div>
        </div>

        <div className={`${css['div-about-content']} border-bottom pb-6 mb-8`}>
          <div className="!overflow-visible">
            <SwipeToScroll>
              <div className="flex flex-nowrap">
                {[
                  { cover: Cover1, url: 'https://app.streameth.org/devconnect/light_client_summit/archive' },
                  { cover: Cover4, url: 'https://www.youtube.com/@PROGCRYPTO/videos' },
                  {
                    cover: Cover3,
                    url: 'https://app.streameth.org/devconnect/conflux__web3_ux_unconference/archive',
                  },
                  { cover: Cover2, url: 'https://app.streameth.org/devconnect/wallet_unconference/archive' },
                  { cover: Cover5, url: 'https://app.streameth.org/devconnect/solidity_summit/archive' },
                  { cover: Cover6, url: 'https://app.streameth.org/devconnect/autonomous_worlds_assembly' },
                  { cover: Cover7, url: 'https://app.streameth.org/devconnect/ethconomics/archive' },
                  { cover: Cover8, url: 'https://app.streameth.org/devconnect/evm_summit/archive' },
                  { cover: Cover9, url: 'https://app.streameth.org/devconnect/ethgunu/archive' },
                  { cover: Cover10, url: 'https://app.streameth.org/devconnect/staking_gathering_2023' },
                  { cover: Cover11, url: 'https://app.streameth.org/secureum/secureum_trustx/archive' },
                  { cover: Cover12, url: 'https://app.streameth.org/devconnect/epf_day/archive' },
                ].map((entry, i) => {
                  return (
                    <div
                      key={i}
                      className="min-w-[370px] relative mr-4 mt-1 border-transparent rounded-lg overflow-hidden group hover:border-teal-400/50 border-2 border-solid transition-all duration-300"
                    >
                      <Link key={i} href={entry.url} className="">
                        <Image
                          src={entry.cover}
                          alt="Recorded Session Cover Image"
                          className="group-hover:scale-[101%] transition-all duration-500 w-full h-full"
                        />
                      </Link>
                    </div>
                  )
                })}
              </div>
            </SwipeToScroll>
            <p className="text-slate-300 text-xs font-bold mt-2">{(globalThis as any).translations.drag_for_more}</p>
          </div>
        </div>
      </>
      // </div>
    )
  }

  return null
}

export default Retro
