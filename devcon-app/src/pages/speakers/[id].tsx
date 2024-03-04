import { AppLayout } from 'components/domain/app/Layout'
import { SpeakerDetails } from 'components/domain/app/speakers'
import { pageHOC } from 'context/pageHOC'
import React from 'react'
import { fetchSessionsBySpeaker, fetchSpeaker, fetchSpeakers } from 'services/event-data'
import { DEFAULT_APP_PAGE } from 'utils/constants'
import { SEO } from 'components/domain/seo'

export default pageHOC((props: any) => {
  return (
    <AppLayout>
      <>
        <SEO title={props.speaker.name} description={props.speaker.description} separator="@" />
        <SpeakerDetails {...props} />
      </>
    </AppLayout>
  )
})

export async function getStaticPaths() {
  const speakers = await fetchSpeakers()

  const paths = speakers.map(i => {
    return { params: { id: i.id } }
  })

  return {
    paths,
    fallback: false,
  }
}

export async function getStaticProps(context: any) {
  const speaker = await fetchSpeaker(context.params.id)

  if (!speaker) {
    return {
      props: null,
      notFound: true,
    }
  }

  const sessions = await fetchSessionsBySpeaker(speaker.id)

  return {
    props: {
      page: DEFAULT_APP_PAGE,
      speaker: {
        ...speaker,
        sessions,
      },
    },
  }
}
