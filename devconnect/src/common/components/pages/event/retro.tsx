import React from 'react'
import css from './retro.module.scss'

/*
  TODO: Generalize this when adding Istanbul retro/recap
*/
const Retro = (props: any) => {
  return (
    <div className={`columns clear-vertical ${css['retro']}`}>
      <div className={`left fill-45`}>
        <p className="paragraph-intro">
          The first-ever <b>Devconnect</b> was held in 2022 in Amsterdam.
        </p>
        <p className="big-text bold margin-top-less">
          Over eight days, the Ethereum community hosted independent events and workshops and held in-depth discussions
          on topics such as Ethereum staking, Layer 2s, web3 UX, and MEV. The event took over the city of Amsterdam,
          with Devconnect flags and bikes visible all around.
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

export default Retro
