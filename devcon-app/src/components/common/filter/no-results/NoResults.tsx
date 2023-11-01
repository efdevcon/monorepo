import React from 'react'
import css from './no-results.module.scss'
import Image from 'next/image'
import noResults from 'assets/images/no-results.png'

interface Props {
  text?: string
  subtext?: string
}

export const NoResults = (props: Props) => {
  return (
    <div className={css['no-results-container']}>
      <div className={css['no-results-image-container']}>
        <Image alt="" className={css['image']} src={noResults} />

        <p className="font-xxl bold">{props.text ? props.text : "Sorry No Results Found"}</p>
        <p>{props.subtext ? props.subtext : "Please try another filter"}</p>
      </div>
    </div>
  )
}
