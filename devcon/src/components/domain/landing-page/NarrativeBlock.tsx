import React from 'react'
import Image from 'next/image'
import narrativeBg from './images/narrative-bg.png'
import EthDiamond from './images/eth-diamond.svg'
import css from './landing-page.module.scss'

export function NarrativeBlock() {
  return (
    <div className={css.narrative}>
      <div className={css['narrative-bg']}>
        <Image src={narrativeBg} alt="" fill style={{ objectFit: 'cover' }} />
      </div>

      <div className="section">
        <div className={css['narrative-inner']}>
          <div className={css['narrative-left']}>
            <div className={css['narrative-icon']}>
              <EthDiamond />
            </div>
            <h3 className={css['narrative-heading']}>
              Building the infrastructure
              <br />
              {`for tomorrow\u2019s world`}
            </h3>
          </div>

          <div className={css['narrative-right']}>
            The technology is no longer theoretical.
            <br />
            <strong>It is infrastructure.</strong>
            <br />
            Real systems are being built.
            <br />
            Real problems are being solved.
          </div>

          <div className={css['narrative-indicators']}>
            <div className={`${css.indicator} ${css.active}`} />
            <div className={css.indicator} />
            <div className={css.indicator} />
            <div className={css.indicator} />
            <div className={css.indicator} />
          </div>
        </div>
      </div>
    </div>
  )
}
