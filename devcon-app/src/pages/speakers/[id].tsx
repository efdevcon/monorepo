import { AppLayout } from 'components/domain/app/Layout'
import { SpeakerView } from 'components/domain/app/dc7/speakers/index'
import React, { useEffect } from 'react'
import { fetchSessionsBySpeaker, fetchSpeaker, fetchSpeakers } from 'services/event-data'
import { SEO } from 'components/domain/seo'
import { useRecoilState } from 'recoil'
import { selectedSpeakerAtom } from 'pages/_app'
import { useRouter } from 'next/router'

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
        {/* <div className="h-[1px] overflow-hidden opacity-0"> */}
        <SpeakerView speaker={props.speaker} standalone />
        {/* </div> */}
      </AppLayout>
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
      speaker: {
        ...speaker,
        sessions,
      },
    },
  }
}
