import React from 'react'
import moment from 'moment'
import css from './cls.module.scss'
import { BasicCard, Card } from '../../../common/card'
import { Slider, useSlider } from 'components/common/slider'
import HeroBackground from 'assets/images/pages/hero-bgs/city-guide.png'
import Image from 'next/image'
import RichText from 'lib/components/tina-cms/RichText'

interface Props {
  sessions: Array<any>
}

export function CLSReel(props: Props) {
  const settings = {
    infinite: false,
    touchThreshold: 100,
    speed: 500,
    slidesToShow: 3,
    arrows: false,
    // slidesToScroll: 3,
    swipeToSlide: true,
    mobileFirst: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2.1,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 1.1,
        },
      },
    ],
  }

  const sliderProps = useSlider(settings)

  return (
    <div className={`${css['cards']} w-full`}>
      <Slider sliderProps={sliderProps} title="Featured Sessions">
        {props.sessions.map((session: any, i: number) => {
          let className = `${css['card']} !rounded-xl`

          if (i === props.sessions.length - 1) className += ` ${css['last']}`

          return (
            <BasicCard
              className={className}
              slide={sliderProps[1].canSlide}
              key={session.slug}
              // title={session.title}
              // description={session.description}
              imageUrl={session.imageUrl}
              expandLink
              linkUrl={session.permaLink} // Linking to session domain temporarily until session page is done (static-phase)
              // metadata={[moment(session.date).format('ll'), session.author]}
              allowDrag
            >
              <Image src={HeroBackground} alt={`${session.title} graphic`} className="object-cover h-[175px] w-full" />
              <div className="flex flex-col m-4 mb-0">
                <div className="text-lg bold mb-2">{session.title}</div>
                <RichText content={session.body} />
                <div className="border-solid border-t border-[#E2E3FF] border-w-[1px] mt-4"></div>
                <div className="flex flex-col gap-1 text-xs my-4 uppercase bold">
                  <div className="flex justify-between">
                    <span className="shrink-0 xl:basis-[100px] pr-1 bold text-uppercase text-slate-400 mb-3">
                      Organized By{' '}
                    </span>
                    <div className="xl:grow text-right xl:text-left">{session.organizers}</div>
                  </div>
                  <div className="flex justify-between">
                    <span className="shrink-0 xl:basis-[100px] pr-1 bold text-uppercase text-slate-400">When </span>
                    <div className="xl:grow text-right xl:text-left">{session.when}</div>
                  </div>
                  <div className="flex justify-between">
                    <span className="shrink-0 xl:basis-[100px] pr-1 bold text-uppercase text-slate-400">Duration </span>
                    <div className="xl:grow text-right xl:text-left">{session.duration}</div>
                  </div>
                </div>
                <div className="border-solid border-t border-[#E2E3FF] border-w-[1px]"></div>
                <div className="bold mt-3 font-secondary">LEARN MORE</div>
              </div>
            </BasicCard>
          )
        })}
      </Slider>
    </div>
  )
}
