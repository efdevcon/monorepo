import React from 'react'
import { useTranslations } from 'next-intl'
import Image from "next/legacy/image"
import css from './experience-devcon.module.scss'
import ExperienceDevcon from './experience-devcon.png'

const FeaturedSpeakers = () => {
  const intl = useTranslations()

  return (
    <div className={`section`}>
      <h2 className="title spaced">{intl('experience_devcon')}</h2>

      <div className={`${css['content']} border-bottom padding-bottom`}>
        <div className={`${css['image-container']} `}>
          <Image src={ExperienceDevcon} alt="Devcon by numbers" />
        </div>
      </div>
    </div>
  )
}

export default FeaturedSpeakers
