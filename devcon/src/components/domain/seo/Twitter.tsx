import React from 'react'

interface TwitterProps {
  title: string
  description: string
  image?: string
  site?: string
  creator?: string
  cardType?: 'summary' | 'summary_large_image' | 'app' | 'player'
}

export function Twitter(props: TwitterProps) {
  return (
    <>
      <meta name="twitter:site" content={props.cardType || '@efdevcon'} />
      <meta name="twitter:creator" content={props.cardType || '@efdevcon'} />
      <meta name="twitter:card" content={props.cardType || 'summary_large_image'} />
      <meta name="twitter:title" content={props.title} />
      <meta name="twitter:description" content={props.description} />
      {props.image && <meta name="twitter:image" content={props.image} />}
    </>
  )
}
