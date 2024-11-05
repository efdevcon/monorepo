import { AppLayout } from 'components/domain/app/Layout'
import { SessionView, Livestream, cardClass } from 'components/domain/app/dc7/sessions/index'
import React from 'react'
import { fetchSessions, useEventVersion } from 'services/event-data'
import { SEO } from 'components/domain/seo'
import cn from 'classnames'
import { useAccountContext } from 'context/account-context'
import { useToast } from 'lib/hooks/use-toast'
import { Session } from 'types/Session'
import TwitterIcon from 'assets/icons/twitter.svg'
import StarIcon from 'assets/icons/dc-7/star.svg'
import StarFillIcon from 'assets/icons/dc-7/star-fill.svg'
import IconAdded from 'assets/icons/calendar-added.svg'
import IconCalendar from 'assets/icons/favorite.svg'
import { Link } from 'components/common/link'
import ShareIcon from 'assets/icons/arrow-curved.svg'

const SessionActions = ({ session }: { session: Session }) => {
  const { account, setSessionBookmark } = useAccountContext()
  const { toast } = useToast()

  return (
    <div data-type="speaker-filter-actions" className="flex-row gap-5 items-center text-2xl flex lg:hidden">
      <ShareIcon
        onClick={() => {
          navigator.clipboard.writeText(window.location.href)
          toast({
            title: 'Copied to clipboard',
          })
        }}
        className="icon cursor-pointer"
        style={{ '--color-icon': 'white' }}
      />

      {account?.attending_sessions?.includes(session.sourceId) ? (
        <IconAdded
          onClick={() =>
            setSessionBookmark(
              session,
              'attending',
              account,
              account?.attending_sessions?.includes(session.sourceId) ?? false
            )
          }
          className="icon cursor-pointer"
          style={{ '--color-icon': 'white' }}
        />
      ) : (
        <IconCalendar
          onClick={() =>
            setSessionBookmark(
              session,
              'attending',
              account,
              account?.attending_sessions?.includes(session.sourceId) ?? false
            )
          }
          className="icon cursor-pointer"
          style={{ '--color-icon': 'white' }}
        />
      )}

      {account?.interested_sessions?.includes(session.sourceId) ? (
        <StarFillIcon
          onClick={() =>
            setSessionBookmark(
              session,
              'interested',
              account,
              account?.interested_sessions?.includes(session.sourceId) ?? false
            )
          }
          className="icon cursor-pointer"
          style={{ '--color-icon': 'white' }}
        />
      ) : (
        <StarIcon
          onClick={() =>
            setSessionBookmark(
              session,
              'interested',
              account,
              account?.interested_sessions?.includes(session.sourceId) ?? false
            )
          }
          className="icon cursor-pointer"
          style={{ '--color-icon': 'white' }}
        />
      )}

      {/* {speaker?.twitter && (
        <Link className="flex justify-center items-center" to={`https://twitter.com/${speaker.twitter}`}>
          <TwitterIcon
            className="icon cursor-pointer hover:scale-110 transition-transform duration-300"
            style={{ '--color-icon': 'white' }}
          />
        </Link>
      )} */}
    </div>
  )
}

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
      <AppLayout
        pageTitle="Session"
        breadcrumbs={[{ label: 'Session' }]}
        renderActions={() => <SessionActions session={props.session} />}
      >
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
