import React, { useEffect, useImperativeHandle } from 'react'
import { Session } from 'types/Session'
import css from './list.module.scss'
import { SessionCard } from 'components/domain/app/session'
import moment, { Moment } from 'moment'
import { CollapsedSection, CollapsedSectionContent, CollapsedSectionHeader } from 'components/common/collapsed-section'
import { ScheduleInformation, normalizeDate } from '../Schedule'
import ClockIcon from 'assets/icons/clock.svg'
import CollapseIcon from 'assets/icons/collapse.svg'
import ChevronUp from 'assets/icons/chevron-up.svg'
import ExpandIcon from 'assets/icons/expand.svg'
import ShareIcon from 'assets/icons/share.svg'
import { ButtonOverlay } from 'components/domain/app/button-overlay'
import { useAccountContext } from 'context/account-context'

interface ListProps extends ScheduleInformation {
  now?: Moment | null
}

export const List = React.forwardRef((props: ListProps, ref: any) => {
  const { account } = useAccountContext()
  const [openDays, setOpenDays] = React.useState({} as { [key: string]: boolean })
  const normalizedNow = props.now ? normalizeDate(props.now) : ''

  const setNowOpen = React.useMemo(() => {
    return () => {
      if (normalizedNow) {
        const openState = {} as any

        openState[normalizedNow] = true

        setOpenDays(openState)
      }
    }
  }, [normalizedNow])

  useEffect(() => {
    setNowOpen()
  }, [setNowOpen])

  useImperativeHandle(ref, () => {
    return {
      closeAll: () => {
        setOpenDays({})
      },
      openAll: () => {
        props.sessionsByTime.forEach(time =>
          setOpenDays(openDays => {
            return {
              ...openDays,
              [time.date.readable]: true,
            }
          })
        )
      },
    }
  })

  const allOpen = props.sessionsByTime.every(time => openDays[time.date.readable])
  const todayIsDuringEvent = props.sessionsByTime.some(time => props.now && props.now.isSame(time.date.moment, 'day'))

  const fabs = [
    {
      id: 'collapse2',
      className: css['collapse'],
      // text: allOpen ? 'Close' : 'Open',
      onClick: () => {
        if (allOpen) {
          setOpenDays({})
        } else {
          props.sessionsByTime.forEach(time =>
            setOpenDays(openDays => {
              return {
                ...openDays,
                [time.date.readable]: true,
              }
            })
          )
        }
      },
      render: () => (allOpen ? <CollapseIcon /> : <ExpandIcon />),
    },
    {
      id: 'scroll-up',
      className: css['collapse'],
      onClick: () => {
        window.scrollTo(0, 0)
      },
      render: () => <ChevronUp />,
    },
  ] as any

  if (todayIsDuringEvent) {
    fabs.push({
      id: 'today',
      text: 'Today',
      className: '',
      onClick: () => {
        const nowElement = document.getElementById(`${normalizedNow}`)

        setNowOpen()

        nowElement?.scrollIntoView({ behavior: 'smooth' })
      },
      render: () => <ClockIcon />,
    })
  }

  return (
    <div className={`${css['list']}`}>
      {props.sessionsByTime.map(({ date, timeslots }) => {
        // TODO: How/why is it ever null?
        if (date.readable === 'Invalid date') return null
        if (timeslots.length === 0) return null

        const dayIsNow = props.now && props.now.isSame(date.moment, 'day')

        return (
          <CollapsedSection
            sticky
            key={date.readable}
            open={openDays[date.readable]}
            setOpen={() => {
              const isOpen = openDays[date.readable]

              const nextOpenState = {
                ...openDays,
                [date.readable]: true,
              }

              if (isOpen) {
                delete nextOpenState[date.readable]
              }

              setOpenDays(nextOpenState)
            }}
          >
            <div className={css['anchor']} id={date.readable}></div>
            <CollapsedSectionHeader className={css['day-header']}>
              <p className="font-sm-fixed bold">
                {date.moment ? date.moment.format('dddd, MMM Do') : date.readable}
                <span className={css['header-today-indicator']}>{dayIsNow && 'Today'}</span>
              </p>
            </CollapsedSectionHeader>
            <CollapsedSectionContent dontAnimate>
              {timeslots.map(({ time, sessions }) => {
                const startTime = moment.utc(time)
                const dateOfSession = startTime.format('MMM Do')
                const startTimeFormatted = startTime.format('h:mm A')

                if (dateOfSession !== date.readable) {
                  return null
                }
                if (startTimeFormatted === 'Invalid date') return null

                return (
                  <div key={time} className={css['timeslot']}>
                    <div className={css['start-time']}>{startTimeFormatted} - Colombia Time (UTC-5)</div>

                    {sessions.map((session, index) => {
                      return (
                        <SessionCard
                          className={index === 0 ? css['session-card'] : ''}
                          session={session}
                          key={session.id}
                        />
                      )
                    })}
                  </div>
                )
              })}
            </CollapsedSectionContent>
          </CollapsedSection>
        )
      })}

      <ButtonOverlay buttons={fabs} />
    </div>
  )
})
