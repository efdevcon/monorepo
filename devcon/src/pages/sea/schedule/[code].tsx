import React from 'react'
import { GetPage } from 'services/page'
import { getGlobalData } from 'services/global'
import { Hero } from 'components/domain/index/hero'
import { APP_CONFIG } from 'utils/config'

const Speaker = (props: any) => {
  if (!props.params) return null

  return <Hero talk={props.talk} speakerMode></Hero>
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  }
}

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const page = await GetPage('/404')
  const res = await fetch(`https://cfp.ticketh.xyz/api/events/devcon7-sea/talks/${context.params.code}`, {
    headers: {
      Authorization: `Token ${process.env.PRETALX_API_KEY}`,
    },
  })

  const data = await res.json()
  if (!data) {
    return {
      notFound: true
    }
  }

  let type = 'talk'
  if (data.submission_type_id === 36) type = 'lightning Talk'
  if (data.submission_type_id === 32) type = 'talk'
  if (data.submission_type_id === 41) type = 'panel'
  if (data.submission_type_id === 33 || data.submission_type_id === 34 || data.submission_type_id === 40)
    type = 'workshop'

  console.log('Schedule', context.params.code, data?.title, data?.state)
  if (APP_CONFIG.NODE_ENV === 'production' && (data.state !== 'accepted' && data.state !== 'confirmed')) {
    return {
      notFound: true
    }
  }

  return {
    props: {
      ...globalData,
      params: context.params,
      page,
      talk: {
        id: context.params.code,
        title: data.title,
        type: type,
        track: data.track.en,
        speakers: data.speakers.map((i: any) => ({ name: i.name, avatar: i.avatar } )),
      },
    },
  }
}

export default Speaker
