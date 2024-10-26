import { AppLayout } from 'components/domain/app/Layout'
import { SessionView } from 'components/domain/app/dc7/sessions/index'
import React, { useEffect } from 'react'
import { fetchSessions } from 'services/event-data'
import { SEO } from 'components/domain/seo'
import { useRecoilState } from 'recoil'
import { selectedSessionAtom } from 'pages/_app'
import { useRouter } from 'next/router'

export default (props: any) => {
  const [_, setSelectedSession] = useRecoilState(selectedSessionAtom)
  const router = useRouter()

  //   useEffect(() => {
  //     if (props.session) {
  //       setSelectedSession(props.session)

  //       // redirect to /speakers
  //       router.replace('/speakers')
  //     }
  //   }, [props.session])

  // TODO: how the hell is this undefined, then gets defined immediately after?
  if (!props.session) return null

  return (
    <>
      <SEO title={props.session.title} description={props.session.description} separator="@" />
      <AppLayout pageTitle={props.session.title} breadcrumbs={[{ label: props.session.title }]}>
        {/* <div className="h-[1px] overflow-hidden opacity-0"> */}
        <SessionView session={props.session} standalone />
        {/* </div> */}
      </AppLayout>
    </>
  )
}

export async function getStaticPaths() {
  const sessions = await fetchSessions()
  const paths =
    [] ||
    sessions.map(i => {
      return { params: { id: i.id } }
    })

  return {
    paths,
    fallback: false,
  }
}

export async function getStaticProps(context: any) {
  const sessions = await fetchSessions()
  const session = sessions.find(i => i.id === context.params.id)

  if (!session) {
    return {
      props: null,
      notFound: true,
    }
  }

  // const related = session ? GetRelatedSessions(String(session.id), sessions) : []

  return {
    props: {
      // relatedSessions: related,
      session,
    },
  }
}
