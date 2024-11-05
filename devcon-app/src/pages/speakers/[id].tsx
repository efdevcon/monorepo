import { AppLayout } from 'components/domain/app/Layout'
import { SpeakerView, SpeakerSessions, cardClass } from 'components/domain/app/dc7/speakers/index'
import React from 'react'
import { fetchSpeaker, fetchSpeakers } from 'services/event-data'
import { SEO } from 'components/domain/seo'
import cn from 'classnames'
import { useRecoilState } from 'recoil'
import { useToast } from 'lib/hooks/use-toast'
import HeartIcon from 'assets/icons/heart.svg'
import HeartIconFill from 'assets/icons/dc-7/heart-fill.svg'
import { useAccountContext } from 'context/account-context'
import { Speaker } from 'types/Speaker'
import TwitterIcon from 'assets/icons/twitter.svg'
import { Link } from 'components/common/link'
import ShareIcon from 'assets/icons/arrow-curved.svg'

const SpeakerActions = ({ speaker }: { speaker: Speaker }) => {
  const { account, setSpeakerFavorite } = useAccountContext()
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

      {account?.favorite_speakers?.includes(speaker.id) ? (
        <HeartIconFill
          onClick={() =>
            setSpeakerFavorite(speaker.id, account?.favorite_speakers?.includes(speaker.id) ?? false, account)
          }
          className="icon cursor-pointer"
          style={{ '--color-icon': 'white' }}
        />
      ) : (
        <HeartIcon
          onClick={() =>
            setSpeakerFavorite(speaker.id, account?.favorite_speakers?.includes(speaker.id) ?? false, account)
          }
          className="icon cursor-pointer"
          style={{ '--color-icon': 'white' }}
        />
      )}

      {speaker?.twitter && (
        <Link className="flex justify-center items-center" to={`https://twitter.com/${speaker.twitter}`}>
          <TwitterIcon
            className="icon cursor-pointer hover:scale-110 transition-transform duration-300"
            style={{ '--color-icon': 'white' }}
          />
        </Link>
      )}
    </div>
  )
}

const SpeakerPage = (props: any) => {
  if (!props.speaker) return null

  return (
    <>
      <SEO title={props.speaker.name} description={props.speaker.description} separator="@" />
      <AppLayout
        pageTitle={props.speaker.name}
        breadcrumbs={[{ label: props.speaker.name }]}
        renderActions={() => <SpeakerActions speaker={props.speaker} />}
      >
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
