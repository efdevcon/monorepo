import React from 'react'
import FrameUpperRight from './images/frame-upper-right.svg'
import FrameLowerLeft from './images/frame-lower-left.svg'
import css from './landing-page.module.scss'

export function WhyDevconIndia() {
  return (
    <div className={css['why-devcon']}>
      <div className="section">
        <div className={css['why-devcon-inner']}>
          <h2 className={css['section-title']}>Why Devcon India?</h2>

          <div className={css['why-devcon-content']}>
            <div className={css['why-devcon-copy']}>
              <div className={css['why-devcon-para']}>
                <h3>India is where Ethereum is being built for the world.</h3>
                <p>
                  {`India has one of the world's most extraordinary concentrations of engineering talent — and its fastest-growing Ethereum developer community. The work happening here is not peripheral to Ethereum's development. Infrastructure, ZK identity systems, and coordination layers built in India power Ethereum globally.`}
                </p>
              </div>
              <div className={css['why-devcon-para']}>
                <h3>Where sovereignty is built at scale.</h3>
                <p>
                  {`India is the home of engineers who didn't wait for permission, in a country that leapfrogged the entire technological generation. `}
                  <strong>Building at scale creates innovation at scale</strong>.
                </p>
                <p>
                  {`Devcon isn't coming to Mumbai to introduce Ethereum to India. Devcon 8 is in Mumbai to recognize and champion what India is already building.`}
                </p>
              </div>
            </div>

            <div className={css['video-wrapper']}>
              <FrameUpperRight className={`${css['frame-decoration']} ${css['upper-right']}`} />
              <FrameLowerLeft className={`${css['frame-decoration']} ${css['lower-left']}`} />
              <div className={css['video-preview']}>
                <iframe
                  src="https://www.youtube.com/embed/KSElahtIDB0"
                  title="Devcon India"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className={css['video-iframe']}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
