import { AppLayout } from 'components/domain/app/Layout'
import React from 'react'
import { fetchRooms, fetchEvent } from 'services/event-data'
import { SEO } from 'components/domain/seo'
import { SessionLayout, isAdvancedFilterApplied, advancedFilterKeys } from 'components/domain/app/dc7/sessions'
import { sessionsAtom } from './_app'
import { useRecoilState, useRecoilValue } from 'recoil'
import { usePersonalized } from './schedule/u/[id]'
import { cn } from 'lib/shadcn/lib/utils'
import FilterIcon from 'assets/icons/filter-tract.svg'
import { sessionFilterOpenAtom, sessionFilterAtom } from 'pages/_app'

const FilterTrigger = () => {
  const { isPersonalizedSchedule } = usePersonalized()
  const [sessionFilterOpen, setSessionFilterOpen] = useRecoilState(sessionFilterOpenAtom)
  const sessionFilter = useRecoilValue(sessionFilterAtom)
  const advancedFilterApplied = isAdvancedFilterApplied(sessionFilter)

  if (isPersonalizedSchedule) return null

  let filterCount = 0

  return (
    <div
      data-type="session-filter-actions"
      className="flex flex-row gap-2 items-center ml-4 mr-1 text-right text-xl lg:hidden"
    >
      <div className="text-xs font-semibold line-clamp-2">
        {(() => {
          const computeFilterShorthand = (filter: { [key: string]: boolean }, key: string) => {
            const filterAsKeys = Object.keys(filter)

            filterCount += filterAsKeys.length

            if (filterAsKeys.length === 0) return
            if (filterAsKeys.length === 1) return filterAsKeys[0]

            return `${key} (${filterAsKeys.length})`
          }

          return (
            [
              computeFilterShorthand(sessionFilter.track, 'Tracks'),
              computeFilterShorthand(sessionFilter.type, 'Session Type'),
              computeFilterShorthand(sessionFilter.expertise, 'Expertise'),
              computeFilterShorthand(sessionFilter.room, 'Rooms'),
            ]
              .filter(val => !!val)
              .join(', ') || ''
          )
        })()}
      </div>

      <div
        onClick={() => setSessionFilterOpen(!sessionFilterOpen)}
        className={cn(
          'flex shrink-0 relative items-center xl:w-[40px] xl:h-[40px] w-[38px] h-[38px] justify-center text-xl cursor-pointer rounded-full p-2.5  hover:bg-[#dfd8fc] transition-all duration-300',
          (sessionFilterOpen || advancedFilterApplied) && 'bg-[#6d3bff] fill-[#7D52F4]'
        )}
      >
        <FilterIcon
          className="icon"
          style={{
            '--color-icon': sessionFilterOpen || advancedFilterApplied ? 'white' : 'white',
            fontSize: '22px',
          }}
        />

        {filterCount > 0 && (
          <div className="absolute -top-[3px] -right-[8px] bg-[#ed3636] text-white rounded-full w-5 h-5 md:w-[1.1rem] md:h-[1.1rem] lg:-top-0.5 lg:-right-0.5 flex items-center justify-center text-xs lg:text-[12px]">
            {filterCount}
          </div>
        )}
      </div>
    </div>
  )
}

const SessionPage = (props: any) => {
  const sessions = useRecoilValue(sessionsAtom)

  return (
    <AppLayout pageTitle="Schedule" breadcrumbs={[{ label: 'Schedule' }]} renderActions={() => <FilterTrigger />}>
      <SEO title="Schedule" />

      <SessionLayout sessions={sessions} event={props.event} />
    </AppLayout>
  )
}

export default SessionPage

export async function getStaticProps(context: any) {
  return {
    props: {
      event: await fetchEvent(),
      rooms: await fetchRooms(),
    },
  }
}
