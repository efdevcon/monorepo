import { AppLayout } from 'components/domain/app/Layout'
import { SpeakerView, SpeakerSessions, cardClass } from 'components/domain/app/dc7/speakers/index'
import React, { useEffect } from 'react'
import { fetchSessionsBySpeaker, fetchSpeaker, fetchSpeakers } from 'services/event-data'
import { SEO } from 'components/domain/seo'
import { useRecoilState } from 'recoil'
import { selectedSpeakerAtom } from 'pages/_app'
import { useRouter } from 'next/router'
import cn from 'classnames'

export default (props: any) => {
  //   const [_, setSelectedSpeaker] = useRecoilState(selectedSpeakerAtom)
  //   const router = useRouter()

  //   useEffect(() => {
  //     if (props.speaker) {
  //       setSelectedSpeaker(props.speaker)

  //       // redirect to /speakers
  //       //   router.replace('/speakers')
  //     }
  //   }, [props.speaker])

  // TODO: how the hell is this undefined, then gets defined immediately after?
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
      {/* <AppLayout pageTitle={props.speaker.name} breadcrumbs={[{ label: props.speaker.name }]}>
        <SpeakerView speaker={props.speaker} standalone />
      </AppLayout> */}
    </>
  )
}

export async function getStaticPaths() {
  const speakers = await fetchSpeakers()

  const paths =
    [] ||
    speakers.map(i => {
      return { params: { id: i.id } }
    })

  console.log('Create Speaker paths', paths.length)
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

  const sessions = await fetchSessionsBySpeaker(speaker.id)

  return {
    props: {
      speaker: {
        ...speaker,
        sessions,
      },
    },
  }
}
