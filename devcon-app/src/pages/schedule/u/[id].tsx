import React, { useContext, createContext, PropsWithChildren } from 'react'
import { AppLayout } from 'components/domain/app/Layout'
import { NoResults } from 'components/common/filter'
import { SEO } from 'components/domain/seo'
import { APP_CONFIG } from 'utils/config'
import { fetchEvent } from 'services/event-data'
import { SessionLayout } from 'components/domain/app/dc7/sessions'

interface Props extends PropsWithChildren {
  isPersonalizedSchedule: boolean
  schedule: any
  user: any
}

const PersonalizedContext = createContext<Props | undefined>(undefined)

export function PersonalizedProvider({ schedule, user, isPersonalizedSchedule, children }: Props) {
  return (
    <PersonalizedContext.Provider value={{ schedule, user, isPersonalizedSchedule }}>
      {children}
    </PersonalizedContext.Provider>
  )
}

export function usePersonalized() {
  const context = useContext(PersonalizedContext)
  if (context === undefined) {
    return {
      schedule: null,
      user: null,
      isPersonalizedSchedule: false,
    }
  }
  return context
}

export default (props: any) => {
  if (!props.schedule || !props.user) {
    return (
      <AppLayout pageTitle="Personal schedule" breadcrumbs={[{ label: 'Not found' }]}>
        <NoResults text="Personal schedule not found" subtext="Make sure its public or check your address." />
      </AppLayout>
    )
  }

  return (
    <PersonalizedProvider schedule={props.schedule} user={props.user} isPersonalizedSchedule={true}>
      <AppLayout
        pageTitle={`${props.user.username}'s Agenda`}
        breadcrumbs={[{ label: `${props.user.username}'s Agenda` }]}
      >
        <SEO
          title={`${props.user.username}'s Agenda`}
          description={`Check out my personalized schedule for Devcon SEA`}
          imageUrl={`https://devcon-social.netlify.app/schedule/u/${props.paramsId}/opengraph-image`}
        />

        <SessionLayout sessions={props.schedule} event={props.event} />
      </AppLayout>
    </PersonalizedProvider>
  )
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  }
}

export async function getStaticProps(context: any) {
  const response = await fetch(`${APP_CONFIG.API_BASE_URL}/account/${context.params.id}/schedule`)
  if (response.status !== 200) {
    return {
      props: {},
    }
  }

  const { data, user } = await response.json()
  return {
    props: {
      paramsId: context.params.id,
      event: await fetchEvent(),
      schedule: data,
      user,
    },
    revalidate: 60,
  }
}
