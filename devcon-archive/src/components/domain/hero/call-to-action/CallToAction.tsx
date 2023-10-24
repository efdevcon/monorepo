import React from 'react'
import { Link } from 'src/components/common/link'
import Slider from 'react-slick'
import css from './cta.module.scss'
import ctaSrc from 'src/assets/images/cta.svg'

type CTAProps = {
  mobile?: boolean
}

export const CallToAction = (props: CTAProps) => {
  const sliderRef = React.useRef<Slider>()

  let className = css['positional-wrapper']

  if (props.mobile) className += ` ${css['mobile']}`

  const callsToAction = [
    <Link key="1" to="https://google.com" allowDrag className={`no-select ${css['item']}`}>
      <p className="bold">Call to Action 01 —</p>
      <p className="font-sm">subheader</p>
    </Link>,
    <div key="2" className={`no-select ${css['item']}`}>
      <p className="bold">Call to Action 02 —</p>
      <p className="font-sm">subheader</p>
    </div>,
    <div key="3" className={`no-select ${css['item']}`}>
      <p className="bold">Call to Action 03 —</p>
      <p className="font-sm">subheader</p>
    </div>,
    <div key="4" className={`no-select ${css['item']}`}>
      <p className="bold">Call to Action 04 —</p>
      <p className="font-sm">subheader</p>
    </div>,
    <div key="5" className={`no-select ${css['item']}`}>
      <p className="bold">Call to Action 05 —</p>
      <p className="font-sm">subheader</p>
    </div>,
  ]

  const settings = {
    infinite: false,
    slidesToShow: Math.min(callsToAction.length, 4),
    slidesToScroll: 4,
    arrows: false,
    mobileFirst: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: Math.min(callsToAction.length, 3),
          slidesToScroll: 3,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: Math.min(callsToAction.length, 2),
          slidesToScroll: 2,
        },
      },
    ],
  }

  return (
    <div className={className}>
      <div className={css['container']}>
        <div className={css['content']}>
          <div className={css['icon']}>
            <img src={ctaSrc} alt='Call to action icon' />
          </div>

          <div className={css['slider']}>
            <Slider
              ref={el => {
                sliderRef.current = el
              }}
              {...settings}
            >
              {callsToAction}
            </Slider>
          </div>
        </div>
      </div>
    </div>
  )
}
