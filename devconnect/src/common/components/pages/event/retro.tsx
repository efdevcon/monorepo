import React from 'react'
import css from './retro.module.scss'
import Link from 'common/components/link/Link'
import ImageNew from 'next/image'
import bgMerged from 'assets/images/landscape.png'
/*
  TODO: Generalize this when adding Istanbul retro/recap
*/
const Retro = (props: any) => {
  if (props.edition === 'amsterdam') {
    return (
      <div className={`columns clear-vertical ${css['retro']}`}>
        <div className={`left fill-45`}>
          <p className="paragraph-intro">
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
          </p>
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
        {/* <Scene growVertically growNaturally id="recap-video" className={`${css['scene-istanbul']}`}> */}
        <div className="mt-8">
          {/* <h1 className="section-header mb-4" style={{ zIndex: 1 }}>
            <span className="orange">DEVCONNECT IST</span>
          </h1> */}

          <div className={`columns margin-bottom flex flex-col xl:flex-row`}>
            <div className="xl:basis-1/2 align-self flex flex-col lg:mr-[25px]">
              <div>
                <p className="large-text">
                  The vibrant metropolis of Istanbul hosted Devconnect from November 13-19, 2023.{' '}
                  <span className="border-b-[3px] border-solid font-bold border-red-500">
                    Over 3500 Ethereum enthusiasts
                  </span>{' '}
                  gathered at the <b>Devconnect Cowork</b> in the Istanbul Congress Center, while many more attended
                  independent events throughout Istanbul.
                </p>

                <br />

                <p>
                  Each event offered key insights into their respective areas and highlighted crucial topics for
                  progress within the Ethereum ecosystem. Trending topics varied from L2s and programmable cryptography
                  to world-building, infrastructure, global impact, Ethereum's core values, and real-world use cases.
                </p>

                <br />

                <p>
                  The overarching theme of Devconnect Istanbul 2023 was the enthusiasm and involvement of the local
                  Turkish Ethereum community. ETHGünü and notDEVCON and d:pact demonstrated the local impact of
                  Ethereum. It highlighted how local communities are essential in fostering a global network,
                  contributing unique perspectives.
                </p>

                {/* <br />

                <p>
                  <b>Thank you</b> to everyone who joined us at Devconnect Istanbul 2023! We look forward to seeing the
                  ongoing connections and progress you all will continue to make for Ethereum.
                </p> */}
              </div>

              {/* <div className={`margin-top ${css['nowrap']}`}>
                <Link
                  href="https://blog.ethereum.org/2023/12/04/devconnect-ist-wrap"
                  indicateExternal
                  className={`button wide orange-fill ${css['cowork-tickets-button']}`}
                >
                  Read the blog
                </Link>
              </div> */}
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
          </div>
        </div>

        {/* <div className={css['background-cityscape']}>
          <ImageNew src={bgMerged} alt="Istanbul inspired Cityscape Background" />
        </div> */}
      </>
      // </Scene>
    )
  }

  return null
}

export default Retro
