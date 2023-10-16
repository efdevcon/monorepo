import React, { useState } from 'react'
import css from './speakers.module.scss'
import IconStar from 'assets/icons/star.svg'
import IconStarFill from 'assets/icons/star-fill.svg'
import { Link } from 'components/common/link'
import { CollapsedSection, CollapsedSectionHeader, CollapsedSectionContent } from 'components/common/collapsed-section'
import { Speaker, Speaker as SpeakerType } from 'types/Speaker'
import { useSort, SortVariation, Sort } from 'components/common/sort'
import { NoResults, useFilter } from 'components/common/filter'
import { AppSearch } from 'components/domain/app/app-search'
import { Search, Tags, Basic, FilterFoldout } from 'components/common/filter/Filter'
import { useAccountContext } from 'context/account-context'
import Image from "next/legacy/image"
import Star from 'assets/icons/star.svg'
import StarFill from 'assets/icons/star-fill.svg'
import makeBlockie from 'ethereum-blockies-base64'
import moment from 'moment'
import { AppNav } from 'components/domain/app/navigation'
import filterCss from 'components/domain/app/app-filter.module.scss'
import IconTwitter from 'assets/icons/twitter.svg'
import { ButtonOverlay } from 'components/domain/app/button-overlay'
import ChevronUp from 'assets/icons/chevron-up.svg'
import { Room } from 'types/Room'
import { multiSelectFilter } from '../schedule/Schedule'

export const extractTwitterUsername = (twitter: string) => {
  if (!twitter) return

  // Extract twitter user
  const twitterUser = twitter.split('twitter.com/').pop()

  // Split on any white space and use the first part
  const twitterUserNoDuplicates = twitterUser && twitterUser.split(' ').shift()

  // Remove @ prefix if present
  const twitterUserNoLeadingAt = twitterUserNoDuplicates && twitterUserNoDuplicates.split('@').pop()

  if (!twitterUserNoLeadingAt) return

  return twitterUserNoLeadingAt
}

// Coincidentally people have been using the same structure for their free text github profiles, but separating out for clarity/flexibility
export const extractGithubUsername = (github: string) => {
  if (!github) return
  // Spotted one outlier not caught by the heuristics above (https://git.xx.network/*****), just giving it a custom case
  if (github.includes('git.xx.network')) return github

  // Extract github user
  const githubUser = github.split('github.com/').pop()

  // Split on any white space and use the first part
  const githubUserNoDuplicates = githubUser && githubUser.split(' ').shift()

  // Remove @ prefix if present
  const githubUserNoLeadingAt = githubUserNoDuplicates && githubUserNoDuplicates.split('@').pop()

  const githubUserNoTrailingSlash = githubUserNoLeadingAt?.split('/').shift()

  if (!githubUserNoTrailingSlash) return

  return `https://github.com/${githubUserNoTrailingSlash}`
}

type CardProps = {
  speaker: SpeakerType
}

export const SpeakerCard = ({ speaker }: CardProps) => {
  const { account, setSpeakerFavorite } = useAccountContext()
  const isSpeakerFavorited = account?.appState?.speakers?.some(i => i === speaker.id)

  const iconProps = {
    className: `${css['favorite']} icon ${isSpeakerFavorited ? css['favorited'] : ''}`,
    onClick: (e: React.SyntheticEvent) => {
      e.preventDefault()

      setSpeakerFavorite(speaker.id, !!isSpeakerFavorited, account)
    },
  }

  let className = css['speaker-card']

  if (isSpeakerFavorited) className += ` ${css['favorited']}`

  return (
    <div className={className}>
      <>
        <Link to={`/app/speakers/${speaker.id}`} className={css['thumbnail']}>
          <div className={css['wrapper']}>
            <Image
              src={speaker.avatar || makeBlockie(speaker.name)}
              alt={speaker.name}
              objectFit="contain"
              layout="fill"
            />
          </div>
        </Link>

        <div className={css['details']}>
          <Link to={`/app/speakers/${speaker.id}`} className={css['name']}>
            {speaker.name}
          </Link>
          <p className={css['role']}>{speaker.role}</p>
          <p className={css['company']}>{speaker.company}</p>
          {speaker.twitter &&
            (() => {
              const twitter = extractTwitterUsername(speaker.twitter)

              return (
                <Link className={`${css['twitter']} hover-underline`} to={`https://twitter.com/${twitter}`}>
                  <IconTwitter />
                  {`${twitter}`}
                </Link>
              )
            })()}
        </div>

        <div className={css['icon']}>
          {isSpeakerFavorited ? <IconStarFill {...iconProps} /> : <IconStar {...iconProps} />}
        </div>
      </>
    </div>
  )
}

type ListProps = {
  speakers: [SpeakerType]
  tracks?: string[]
  days?: number[]
}

const ListTrackSort = (props: ListProps) => {
  const [activeTrack, setActiveTrack] = React.useState(props.tracks && props.tracks.length > 0 ? props.tracks[0] : '')

  return (
    <div className={`${css['list-container']} ${css['track-sort']}`}>
      {props.tracks &&
        props.tracks.map(track => {
          return (
            <CollapsedSection
              key={track}
              open={track === activeTrack}
              setOpen={() => (track === activeTrack ? setActiveTrack('') : setActiveTrack(track))}
            >
              <CollapsedSectionHeader title={track} />
              <CollapsedSectionContent dontAnimate>
                {props.speakers
                  .filter(i => i.tracks?.some(t => t === track))
                  .map(speaker => {
                    return <SpeakerCard key={speaker.name} speaker={speaker} />
                  })}
              </CollapsedSectionContent>
            </CollapsedSection>
          )
        })}
    </div>
  )
}

const ListDaySort = (props: ListProps) => {
  const [activeDay, setActiveDay] = React.useState(props.days && props.days.length > 0 ? props.days[0] : 0)

  return (
    <div className={`${css['list-container']} ${css['day-sort']}`}>
      {props.days &&
        props.days.map((day, index) => {
          const hasPassed = moment.utc().isAfter(moment(day))
          return (
            <CollapsedSection
              key={day}
              open={day === activeDay}
              setOpen={() => (day === activeDay ? setActiveDay(0) : setActiveDay(day))}
            >
              <CollapsedSectionHeader title={`${moment(day).format('MMMM DD, YYYY')} - Day ${index + 1}`} />

              {hasPassed ? <p className={css['past']}>Previously Scheduled</p> : <></>}

              <CollapsedSectionContent dontAnimate>
                {props.speakers
                  .filter(i => i.eventDays?.some(d => d === day))
                  .map(speaker => {
                    return <SpeakerCard key={speaker.name} speaker={speaker} />
                  })}
              </CollapsedSectionContent>
            </CollapsedSection>
          )
        })}
    </div>
  )
}

const ListAlphabeticalSort = (props: ListProps) => {
  const [selectedLetter, setSelectedLetter] = React.useState<string>()
  const alpha = Array.from(Array(26)).map((e, i) => i + 65)
  const alphabet = alpha.map(x => String.fromCharCode(x))

  return (
    <div className={`${css['list-container']} ${css['alphabet-sort']}`}>
      <ButtonOverlay
        // leftAligned
        buttons={[
          {
            id: 'scroll-up',
            className: css['collapse'],
            // text: 'Top',
            onClick: () => {
              window.scrollTo(0, 0)
            },
            render: () => <ChevronUp />,
          },
        ]}
      />
      <div className={css['speakers-letters']}>
        <div className={css['speakers']}>
          {alphabet.map(letter => {
            if (typeof selectedLetter === 'string' && letter !== selectedLetter) return null

            const speakersByLetter = props.speakers.filter(i => i.name.charAt(0) === letter)
            if (speakersByLetter.length === 0) return null

            return (
              <div key={letter} id={`speakers-${letter}`}>
                <p className={`${css['sticky-letter']} app-header`}>{letter}</p>
                {speakersByLetter.map(speaker => {
                  return <SpeakerCard key={speaker.id} speaker={speaker} />
                })}
              </div>
            )
          })}
        </div>

        <div className={css['letters']}>
          {alphabet.map(letter => {
            const letterHasSpeakers = props.speakers.some(i => i.name.charAt(0) === letter)
            const selected = letter === selectedLetter
            let className = `plain`

            if (selected) className += ` ${css['selected']}`
            // if (!letterHasSpeakers) className += ` ${css['disabled']}`
            if (!letterHasSpeakers) return null

            // if (letterHasSpeakers) {
            //   return (
            //     <a key={letter} className={`plain ${css['selected']}`} /*href={`#speakers-${letter}`}*/>
            //       {letter}
            //     </a>
            //   )
            // }

            return (
              <span
                key={letter}
                className={className}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  if (letterHasSpeakers) {
                    setSelectedLetter(selectedLetter === letter ? undefined : letter)
                  }
                }}
              >
                {letter}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export const Speakers = (props: any) => {
  const { account } = useAccountContext()
  const [search, setSearch] = React.useState('')
  const [favoritesOnly, setFavoritesOnly] = React.useState(false)
  const [selectedTracks, setSelectedTracks] = React.useState({} as any)
  const [selectedRooms, setSelectedRooms] = React.useState({} as { [key: string]: boolean })
  const [selectedSessionTypes, setSelectedSessionTypes] = React.useState({} as { [key: string]: boolean })
  const [selectedExpertise, setSelectedExpertise] = React.useState({} as { [key: string]: boolean })

  // const searcher = React.useMemo(
  //   () => new FuzzySearch(props.speakers, ['name', 'tracks.name', 'description', 'company']),
  //   [props.speakers]
  // )
  const favoritedSpeakers = account?.appState?.speakers

  const speakers = props.speakers.filter((speaker: Speaker) => {
    // Filter by interested
    if (favoritesOnly) {
      const favoritedSpeaker = favoritedSpeakers?.find(favoritedSpeaker => favoritedSpeaker === speaker.id)

      if (!favoritedSpeaker) return false
    }

    // Filter by search
    if (search) {
      let matchesAnySearch
      const lowerCaseSearch = search.toLowerCase().trim()

      if (speaker.name.toLowerCase().includes(lowerCaseSearch)) matchesAnySearch = true
      if (speaker.twitter && speaker.twitter.toLowerCase().includes(lowerCaseSearch)) matchesAnySearch = true
      ;(speaker.sessions || []).some((session: any) => {
        if (session.room && session.room.name.toLowerCase().includes(lowerCaseSearch)) matchesAnySearch = true
        if (session.title.toLowerCase().includes(lowerCaseSearch)) matchesAnySearch = true
        if (session.description && session.description.toLowerCase().includes(lowerCaseSearch)) matchesAnySearch = true
      })

      if (!matchesAnySearch) return false
    }

    // Filter by tracks
    const match = (speaker.sessions || []).every((session: any) => {
      const trackMatches = multiSelectFilter(selectedTracks, session.track)
      const roomMatches = multiSelectFilter(selectedRooms, session.room?.name)
      const difficultyMatches = multiSelectFilter(selectedExpertise, session.expertise)
      const typeMatches = multiSelectFilter(selectedSessionTypes, session.type)

      if (!trackMatches) return false
      if (!roomMatches) return false
      if (!difficultyMatches) return false
      if (!typeMatches) return false

      return true
    })

    if (!match) return false

    return true
  })

  const sortedSpeakers = speakers
  // sortState.sortDirection === 'asc'
  //   ? speakers.sort((a: Speaker, b: Speaker) => a.name.localeCompare(b.name))
  //   : speakers.sort((a: Speaker, b: Speaker) => b.name.localeCompare(a.name))

  // const sortedBy = sortState.fields[sortState.sortBy]
  const noResults = speakers.length === 0

  return (
    <>
      <AppNav
        nested
        links={[
          {
            title: 'Speakers',
            to: '/app/speakers',
          },
        ]}
        renderRight={() => {
          // if (!account) return null

          const starProps = {
            onClick: () => setFavoritesOnly(!favoritesOnly),
            style: {
              cursor: 'pointer',
            },
          }

          if (favoritesOnly) {
            return <StarFill {...starProps} className="icon fill-red" />
          } else {
            return <Star {...starProps} />
          }
        }}
      />

      <div className={filterCss['filter']}>
        <div className="section">
          <Search placeholder="Find a speaker" value={search} onChange={setSearch} timeout={300} />

          <div className={`${filterCss['foldout']} ${css['foldout-overrides']}`}>
            <FilterFoldout
              active={
                Math.max(
                  Object.keys(selectedTracks).length,
                  Object.keys(selectedRooms).length,
                  Object.keys(selectedExpertise).length,
                  Object.keys(selectedSessionTypes).length
                ) > 0
              }
              renderRight={({ setOpen }: any) => {
                return (
                  <div className={filterCss['actions']}>
                    <button
                      className={`app hover sm thin-borders`}
                      onClick={() => {
                        setSelectedTracks({})
                        setSelectedRooms({})
                        setSelectedSessionTypes({})
                        setSelectedExpertise({})
                      }}
                    >
                      Reset
                    </button>

                    <button className={`app hover sm thin-borders`} onClick={() => setOpen(false)}>
                      Close
                    </button>
                  </div>
                )
              }}
            >
              {(open, setOpen) => {
                return (
                  <div className={filterCss['foldout-content']}>
                    <div className={filterCss['filter-section']}>
                      <p className="app-header clear-bottom-less">Tracks</p>
                      <Tags
                        value={selectedTracks}
                        onChange={nextValue => {
                          const isAlreadySelected = selectedTracks[nextValue]

                          const nextState = {
                            ...selectedTracks,
                          }

                          if (isAlreadySelected) {
                            delete nextState[nextValue]
                          } else {
                            nextState[nextValue] = true
                          }

                          setSelectedTracks(nextState)
                        }}
                        options={props.tracks
                          .filter((track: string) => !!track)
                          .map((i: string) => {
                            return {
                              text: i,
                              value: i,
                            }
                          })}
                      />
                    </div>

                    <div className={filterCss['filter-section']}>
                      <p className="app-header clear-bottom-less">Expertise</p>
                      <Tags
                        value={selectedExpertise}
                        onChange={nextValue => {
                          const isAlreadySelected = selectedExpertise[nextValue]

                          const nextState = {
                            ...selectedExpertise,
                          }

                          if (isAlreadySelected) {
                            delete nextState[nextValue]
                          } else {
                            nextState[nextValue] = true
                          }

                          setSelectedExpertise(nextState)
                        }}
                        options={props.expertiseLevels.map((i: string) => {
                          return {
                            text: i,
                            value: i,
                          }
                        })}
                      />
                    </div>

                    <div className={filterCss['filter-section']}>
                      <p className="app-header clear-bottom-less">Session Type</p>
                      <Tags
                        value={selectedSessionTypes}
                        onChange={nextValue => {
                          const isAlreadySelected = selectedSessionTypes[nextValue]

                          const nextState = {
                            ...selectedSessionTypes,
                          }

                          if (isAlreadySelected) {
                            delete nextState[nextValue]
                          } else {
                            nextState[nextValue] = true
                          }

                          setSelectedSessionTypes(nextState)
                        }}
                        options={props.sessionTypes.map((i: string) => {
                          return {
                            text: i,
                            value: i,
                          }
                        })}
                      />
                    </div>

                    <div className={filterCss['filter-section']}>
                      <p className="app-header clear-bottom-less">Room</p>
                      <Tags
                        value={selectedRooms}
                        onChange={nextValue => {
                          const isAlreadySelected = selectedRooms[nextValue]

                          const nextState = {
                            ...selectedRooms,
                          }

                          if (isAlreadySelected) {
                            delete nextState[nextValue]
                          } else {
                            nextState[nextValue] = true
                          }

                          setSelectedRooms(nextState)
                        }}
                        options={props.rooms.map((i: Room) => {
                          return {
                            text: i.name,
                            value: i.name,
                          }
                        })}
                      />
                    </div>

                    <div className={filterCss['actions']} style={{ marginTop: '8px' }}>
                      <button className={`app hover sm thin-borders`} onClick={() => setOpen(false)}>
                        Close
                      </button>
                    </div>
                  </div>
                )
              }}
            </FilterFoldout>

            <div data-type="right" className={`${filterCss['right']} ${css['tracks']}`}>
              <div>
                <p className="font-xs-fixed">Current Filter:</p>
                <p className={filterCss['filter-indicator']}>
                  {(() => {
                    const computeFilterShorthand = (filter: { [key: string]: boolean }, key: string) => {
                      const filterAsKeys = Object.keys(filter)

                      if (filterAsKeys.length === 0) return
                      if (filterAsKeys.length === 1) return filterAsKeys[0]

                      return `${key} (${filterAsKeys.length})`
                    }

                    return (
                      [
                        computeFilterShorthand(selectedTracks, 'Track'),
                        computeFilterShorthand(selectedSessionTypes, 'Session Type'),
                        computeFilterShorthand(selectedExpertise, 'Expertise'),
                        computeFilterShorthand(selectedRooms, 'Room'),
                      ]
                        .filter(val => !!val)
                        .join(', ') || 'No filter applied'
                    )
                  })()}
                </p>
              </div>
            </div>
          </div>
          {/* <div className="border-top">
            <Sort {...sortState} />
          </div> */}
        </div>
      </div>

      <div className="section">
        {noResults ? (
          <NoResults />
        ) : (
          <>
            <ListAlphabeticalSort speakers={sortedSpeakers as [SpeakerType]} />
            {/* {sortedBy.key === 'name' && <ListAlphabeticalSort speakers={sortedSpeakers as [SpeakerType]} />}
            {sortedBy.key === 'tracks' && (
              <ListTrackSort speakers={sortedSpeakers as [SpeakerType]} tracks={props.tracks} />
            )}
            {sortedBy.key === 'days' && (
              <ListDaySort speakers={sortedSpeakers as [SpeakerType]} days={props.eventDays} />
            )} */}
          </>
        )}
      </div>
    </>
  )
}
