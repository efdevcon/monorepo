import React from 'react'
import IconGithub from 'assets/icons/github.svg'
import IconGlobe from 'assets/icons/globe.svg'
import IconTwitter from 'assets/icons/twitter.svg'
import css from './speaker-details.module.scss'
import Image from 'next/image'
import makeBlockie from 'ethereum-blockies-base64'
import { SessionCard } from '../session'
import { Session } from 'types/Session'
import { Link } from 'components/common/link'
import { useAccountContext } from 'context/account-context'
import { extractTwitterUsername, extractGithubUsername } from './Speakers'
import Star from 'assets/icons/star.svg'
import StarFill from 'assets/icons/star-fill.svg'
import { AppNav } from 'components/domain/app/navigation'
import IconAdd from 'assets/icons/person-add.svg'
import IconAdded from 'assets/icons/person-added.svg'

export const SpeakerDetails = (props: any) => {
  const { account, setSpeakerFavorite } = useAccountContext()
  const isSpeakerFavorited = props.speakers?.some((speaker: any) => speaker === props.speaker.id)
  const splitName = props.speaker.name.split(' ') as string[]
  const firstName = splitName.shift()
  const lastName = splitName.join(' ')
  const twitterUrl = extractTwitterUsername(props.speaker.twitter)
  const githubUrl = extractGithubUsername(props.speaker.github)

  return (
    <>
      <AppNav
        nested
        links={[
          {
            title: props.speaker.name,
          },
        ]}
        renderRight={() => {
          const starProps = {
            style: {
              cursor: 'pointer',
            },
            onClick: (e: React.SyntheticEvent) => {
              e.preventDefault()
              // if (account) {
              setSpeakerFavorite(props.speaker.id, !!isSpeakerFavorited, account)
              // }
            },
          }

          if (isSpeakerFavorited) {
            return <IconAdded {...starProps} className="icon fill-red" />
          } else {
            return <IconAdd {...starProps} style={{ opacity: 0.8 }} />
          }
        }}
      />

      <div className={css['image']}>
        <Image
          // pretalx api down so avatar links don't work atm
          // src={props.speaker.avatar ?? makeBlockie(props.speaker.name || props.speaker.id)}
          src={makeBlockie(props.speaker.name || props.speaker.id)}
          alt={props.speaker.name}
          className="object-contain"
          fill
        />
      </div>

      <div className="section">
        <h1 className={css['speaker-title']}>
          {firstName} {lastName}
        </h1>

        <div className={css['meta']}>
          <div className={css['details']}>
            {props.speaker.role && <p className={css['role']}>{props.speaker.role}</p>}
            {props.speaker.company && <p className={css['company']}>{props.speaker.company}</p>}
          </div>
          <div className={css['socials']}>
            {props.speaker.website && (
              <Link to={props.speaker.website}>
                <IconGlobe />
              </Link>
            )}
            {twitterUrl && (
              <Link to={`https://twitter.com/${twitterUrl}`}>
                <IconTwitter />
              </Link>
            )}
            {githubUrl && (
              <Link to={githubUrl}>
                <IconGithub />
              </Link>
            )}
          </div>
        </div>

        <div className={css['description']}>
          <p className="font-lg bold margin-top-less margin-bottom-less">Profile</p>
          <p className={css['body']}>{props.speaker.description}</p>
        </div>

        {props.speaker?.sessions?.length > 0 && (
          <div className={css['sessions']}>
            <p className="font-lg bold margin-top-less margin-bottom-less">Sessions</p>
            {props.speaker.sessions.map((i: Session) => {
              return <SessionCard key={i.id} session={i} />
            })}
          </div>
        )}

        {/* <div className={css['videos']}>
            <p className={css['header']}>Archive</p>

            <VideoCard
              compact
              className={css['video']}
              video={{
                edition: 1,
                title: 'Agreement Making in Solidity: A Legal Perspective',
                description:
                  'Bill Marino of Cornell Tech presents on Agreement Making in Solidity: A Legal Perspective.',
                youtubeUrl: 'https://youtu.be/2xEwt8nIjC4',
                ipfsHash: 'Qmcv4av5mm6KkBz5QKE5gofyTtD45j18r67b3L2ZGkfMzN',
                duration: 978,
                expertise: 'Intermediate',
                type: 'Talk',
                track: 'Society and Systems',
                keywords: [],
                tags: ['Society and Systems'],
                speakers: ['Bill Marino'],
              }}
            />

            <VideoCard
              compact
              className={css['video']}
              video={{
                edition: 1,
                title: 'Agreement Making in Solidity: A Legal Perspective',
                description:
                  'Bill Marino of Cornell Tech presents on Agreement Making in Solidity: A Legal Perspective.',
                youtubeUrl: 'https://youtu.be/2xEwt8nIjC4',
                ipfsHash: 'Qmcv4av5mm6KkBz5QKE5gofyTtD45j18r67b3L2ZGkfMzN',
                duration: 978,
                expertise: 'Intermediate',
                type: 'Talk',
                track: 'Society and Systems',
                keywords: [],
                tags: ['Society and Systems'],
                speakers: ['Bill Marino'],
              }}
            />
          </div> */}
      </div>
    </>
  )
}
