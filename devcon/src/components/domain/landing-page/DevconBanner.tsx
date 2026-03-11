import React from 'react'
import Image from 'next/image'
import bannerImage from './images/devcon-india-banner.png'
import DevconOverlay from './images/devcon-india-overlay-text.svg'
import css from './landing-page.module.scss'

export function DevconBanner() {
  return (
    <div className="section">
      <div className={css.banner}>
        <div className={css['banner-inner']}>
          <Image src={bannerImage} alt="Devcon India" fill className={css['banner-image']} />
          <div className={css['banner-overlay']}>
            <DevconOverlay style={{ width: '100%', maxWidth: 1160, height: 'auto' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
