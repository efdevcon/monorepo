import { AppLayout } from 'components/domain/app/Layout'
import { SessionView, Livestream, cardClass } from 'components/domain/app/dc7/sessions/index'
import React from 'react'
import { fetchSessions, useEventVersion } from 'services/event-data'
import { SEO } from 'components/domain/seo'
import cn from 'classnames'

const SessionPage = (props: any) => {
  const version = useEventVersion()
  if (!props.session) return null

  return (
    <>
      <SEO
        title={props.session.title}
        description={props.session.description}
        separator="@"
        imageUrl={`https://devcon-social.netlify.app/schedule/${props.session.sourceId}/opengraph-image?v=${version}`}
      />
      <AppLayout pageTitle="Session" breadcrumbs={[{ label: 'Session' }]}>
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

export default SessionPage

export async function getStaticPaths() {
  const sessions = await fetchSessions()
  const paths = sessions.map(i => {
    return { params: { id: i.sourceId } }
  })

  return {
    paths,
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
    revalidate: 60,
  }
}
