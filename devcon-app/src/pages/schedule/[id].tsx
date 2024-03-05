import { AppLayout } from 'components/domain/app/Layout'
import { Session } from 'components/domain/app/session'
import { pageHOC } from 'context/pageHOC'
import React from 'react'
import { fetchSessions, useSessionData } from 'services/event-data'
import { API_URL, DEFAULT_APP_PAGE, DEFAULT_REVALIDATE_PERIOD } from 'utils/constants'
import { getGlobalData } from 'services/global'
import { Session as SessionType } from 'types/Session'
import { SEO } from 'components/domain/seo'
import Fuse from 'fuse.js'

const options = {
  includeScore: true,
  useExtendedSearch: true,
  shouldSort: true,
  ignoreLocation: true,
  keys: [
    {
      name: 'speakers.name',
      weight: 1,
    },
    {
      name: 'track',
      weight: 0.5,
    },
    {
      name: 'tags',
      weight: 0.2,
    },
  ],
}

export function GetRelatedSessions(id: string, sessions: SessionType[]): Array<SessionType> {
  const session = sessions.find(i => i.id === id)
  if (!session) return []

  const fuse = new Fuse(sessions, options)
  const query = `${session.speakers.map(i => `"${i.name}"`).join(' | ')} | "${session.track}" | ${session.tags
    ?.split(',')
    ?.map(i => `"${i}"`)
    .join(' | ')}`
  const result = fuse.search(query)

  return result
    .map(i => i.item)
    .filter(i => i.id !== id)
    .slice(0, 5)
}

export default pageHOC((props: any) => {
  return (
    <AppLayout>
      <>
        <SEO
          title={props.session.title}
          description={props.session.description}
          imageUrl={`${API_URL}sessions/${props.session.id}/image`}
        />
        <Session {...props} />
      </>
    </AppLayout>
  )
})

export async function getStaticPaths() {
  const sessions = await fetchSessions()
  const paths = sessions.map(i => {
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

  const related = session ? GetRelatedSessions(String(session.id), sessions) : []

  return {
    props: {
      relatedSessions: related,
      session,
    },
  }
}
