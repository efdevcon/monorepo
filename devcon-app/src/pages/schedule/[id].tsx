import { AppLayout } from 'components/domain/app/Layout'
import { SessionView, Livestream, cardClass } from 'components/domain/app/dc7/sessions/index'
import React, { useEffect } from 'react'
import { fetchSessions } from 'services/event-data'
import { SEO } from 'components/domain/seo'
import { useRecoilState } from 'recoil'
import { selectedSessionAtom } from 'pages/_app'
import { useRouter } from 'next/router'
import cn from 'classnames'

export default (props: any) => {
  // const [_, setSelectedSession] = useRecoilState(selectedSessionAtom)
  // const router = useRouter()

  //   useEffect(() => {
  //     if (props.session) {
  //       setSelectedSession(props.session)

  //       // redirect to /speakers
  //       router.replace('/speakers')
  //     }
  //   }, [props.session])

  if (!props.session) return null

  // TODO: Temporary test launch
  return <></>

  return (
    <>
      <SEO title={props.session.title} description={props.session.description} separator="@" />
      <AppLayout pageTitle={props.session.title} breadcrumbs={[{ label: props.session.title }]}>
        <div data-type="session-layout" className={cn('flex flex-row lg:gap-3 relative')}>
          <div className={cn('basis-[50%] grow')}>
            <SessionView session={props.session} standalone />
          </div>

          <div className={cn('basis-[50%] hidden lg:block')}>
            <Livestream session={props.session} className={cn(cardClass, 'p-4')} />
          </div>
        </div>
      </AppLayout>
    </>
  )
}

export async function getStaticPaths() {
  // const sessions = await fetchSessions()
  // const paths = sessions.map(i => {
  // return { params: { id: i.sourceId } }
  // })

  return {
    paths: [], // TODO: Temporary test launch
    fallback: 'blocking',
  }
}

export async function getStaticProps(context: any) {
  const sessions = await fetchSessions()
  const session = sessions.find(i => i.sourceId === context.params.id)
  if (!session) {
    return {
      props: null,
      notFound: true,
    }
  }

  return {
    props: {
      session,
    },
  }
}
