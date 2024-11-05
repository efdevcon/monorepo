import { AppLayout } from 'components/domain/app/Layout'
import { SpeakerView, SpeakerSessions, cardClass } from 'components/domain/app/dc7/speakers/index'
import React from 'react'
import { fetchSpeaker, fetchSpeakers } from 'services/event-data'
import { SEO } from 'components/domain/seo'
import cn from 'classnames'

const SpeakerPage = (props: any) => {
  if (!props.speaker) return null

  return (
    <>
      <SEO title={props.speaker.name} description={props.speaker.description} separator="@" />
      <AppLayout pageTitle={props.speaker.name} breadcrumbs={[{ label: props.speaker.name }]}>
        <div data-type="speaker-layout" className={cn('flex flex-row lg:gap-3 relative')}>
          <div className={cn('basis-[40%] grow')}>
            <SpeakerView speaker={props.speaker} standalone />
          </div>

          <div className={cn('basis-[60%] hidden lg:block')}>
            <SpeakerSessions speaker={props.speaker} standalone className={cn(cardClass, 'p-4')} />
          </div>
        </div>
      </AppLayout>
    </>
  )
}

export default SpeakerPage

export async function getStaticPaths() {
  const speakers = await fetchSpeakers()
  const paths = speakers.map(i => {
    return { params: { id: i.sourceId } }
  })

  return {
    paths,
    fallback: 'blocking',
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

  return {
    props: {
      speaker: {
        ...speaker,
        sessions: speaker.sessions,
      },
    },
    revalidate: 60,
  }
}
