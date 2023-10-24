import React from 'react'
import IconFilter from 'src/assets/icons/filter.svg'
import { Filter, useFilter } from 'src/components/common/filter'
import css from './video-filter.module.scss'
import { useLocation } from '@reach/router'
import queryString from 'query-string'
import { usePageContext } from 'src/context/page-context'
import IconSearch from 'src/assets/icons/search.svg'
import { InputForm } from 'src/components/common/input-form'
import {
  CollapsedSection,
  CollapsedSectionContent,
  CollapsedSectionHeader,
} from 'src/components/common/collapsed-section'

const queryStringToFilterState = (qs: string) => {
  // Extract params from query string
  const filters = queryString.parse(qs)

  // Format to fit filter state shape
  return Object.entries(filters).reduce((acc, [key, filter]: [any, any]) => {
    if (typeof filter === 'string') {
      acc[key] = {
        [filter]: true,
      }
    } else {
      acc[key] = filter?.reduce((acc: any, tag: any) => {
        acc[tag] = true

        return acc
      }, {})
    }

    return acc
  }, {})
}

export const useVideoFilter = () => {
  const location = useLocation()
  const pageContext = usePageContext()

  const nrOfEditions = 6
  const editionFilters = Array.from(Array(nrOfEditions + 1).keys()).sort((a, b) => b - a)
  const [_, editionFilterState] = useFilter({
    tags: true,
    multiSelect: true,
    filters: editionFilters.map(i => {
      return {
        text: i.toString(),
        value: `devcon-${i}`,
      }
    }),
    filterFunction: () => [],
  })

  const [_____, typeFilterState] = useFilter({
    tags: true,
    multiSelect: true,
    filters: [
      {
        text: 'Talk',
        value: 'Talk',
      },
      {
        text: 'Panel',
        value: 'Panel',
      },
      {
        text: 'Workshop',
        value: 'Workshop',
      },
      {
        text: 'Lightning Talk',
        value: 'Lightning Talk',
      },
      {
        text: 'Breakout',
        value: 'Breakout',
      },
      {
        text: 'Other',
        value: 'Other',
      },
    ],
    filterFunction: () => [],
  })

  const [__, expertiseFilterState] = useFilter({
    tags: true,
    multiSelect: true,
    filters: [
      {
        text: 'Beginner',
        value: 'Beginner',
      },
      {
        text: 'Intermediate',
        value: 'Intermediate',
      },
      {
        text: 'Expert',
        value: 'Expert',
      },
    ],
    filterFunction: () => [],
  })

  const [___, tagsFilterState] = useFilter({
    tags: true,
    multiSelect: true,
    filters: pageContext.data.distinctVideoTags.filter((i: string) => !!i).map((tag: string) => {
      return {
        text: tag,
        value: tag,
      }
    }),
    filterFunction: () => [],
  })

  const [____, searchFilterState] = useFilter({
    tags: false,
    multiSelect: false,
    filters: [],
    filterFunction: () => [],
  })

  // Sync filters with query string on mount
  React.useEffect(() => {
    const initialFilters = queryStringToFilterState(location.search)

    if (initialFilters.event) editionFilterState?.setActiveFilter(initialFilters.event, true)
    if (initialFilters.q) searchFilterState?.setActiveFilter(initialFilters.q, true)
    if (initialFilters.tags) tagsFilterState?.setActiveFilter(initialFilters.tags, true)
    if (initialFilters.expertise) expertiseFilterState?.setActiveFilter(initialFilters.expertise, true)
    if (initialFilters.type) expertiseFilterState?.setActiveFilter(initialFilters.type, true)
  }, [])

  const editionFilter = editionFilterState && Object.keys(editionFilterState.activeFilter)
  const expertiseFilter = expertiseFilterState && Object.keys(expertiseFilterState.activeFilter)
  const tagsFilter = tagsFilterState && Object.keys(tagsFilterState.activeFilter)
  const typeFilter = typeFilterState && Object.keys(typeFilterState.activeFilter)

  const clearFilters = () => {
    editionFilterState?.clearFilter()
    expertiseFilterState?.clearFilter()
    tagsFilterState?.clearFilter()
    searchFilterState?.clearFilter()
    typeFilterState?.clearFilter()
  }

  const combinedFilter = (() => {
    // Finish this one later - the combined filter will change depending on the filtering solution (e.g. inline JS vs query a search service)
    // For now just doing a boolean to test the clear all functionality
    const filtersActive = [editionFilter, expertiseFilter, tagsFilter, typeFilter].some(filter => filter && filter.length > 0)
    const searchActive = !!searchFilterState?.activeFilter

    return filtersActive || searchActive
  })()

  return { clearFilters, combinedFilter, editionFilterState, expertiseFilterState, tagsFilterState, searchFilterState, typeFilterState }
}

const Filters = (props: any) => {
  const { clearFilters, combinedFilter, editionFilterState, expertiseFilterState, tagsFilterState, searchFilterState, typeFilterState } =
    props
  const initialSearchFilter = (): string => {
    if (typeof searchFilterState.activeFilter === 'string') {
      return searchFilterState.activeFilter
    }

    if (typeof searchFilterState.activeFilter === 'object') {
      const keys = Object.keys(searchFilterState.activeFilter)
      return keys[0]
    }

    return ''
  }

  const MobileWrapper = ({ openInitially, children }: any) => {
    const [open, setOpen] = React.useState(openInitially)

    if (props.mobile) {
      return (
        <CollapsedSection className={css['collapsible-header']} open={open} setOpen={() => setOpen(!open)}>
          <CollapsedSectionHeader>{children[0]}</CollapsedSectionHeader>
          <CollapsedSectionContent>{children[1]}</CollapsedSectionContent>
        </CollapsedSection>
      )
    }

    return children
  }

  return (
    <>
      <div className={css['search']}>
        <InputForm
          id="input-form_search_filter"
          className={css['input-form']}
          placeholder="Search"
          icon={IconSearch}
          defaultValue={initialSearchFilter()}
          onChange={value => searchFilterState.setActiveFilter(value)}
          timeout={300}
        />
      </div>

      <div className={css['categories']}>
        <MobileWrapper openInitially={tagsFilterState && Object.keys(tagsFilterState.activeFilter).length > 0}>
          <p className="bold font-xs text-uppercase">Categories:</p>
          <Filter {...tagsFilterState} />
        </MobileWrapper>
      </div>

      <div className={css['devcon']}>
        <MobileWrapper openInitially={editionFilterState && Object.keys(editionFilterState.activeFilter).length > 0}>
          <p className="bold font-xs text-uppercase">Devcon:</p>
          <Filter {...editionFilterState} />
        </MobileWrapper>
      </div>

      <div className={css['expertise']}>
        <MobileWrapper openInitially={typeFilterState && Object.keys(typeFilterState.activeFilter).length > 0}>
          <p className="bold font-xs text-uppercase">Type:</p>
          <Filter {...typeFilterState} />
        </MobileWrapper>
      </div>

      <div className={css['expertise']}>
        <MobileWrapper
          openInitially={expertiseFilterState && Object.keys(expertiseFilterState.activeFilter).length > 0}
        >
          <p className="bold font-xs text-uppercase">Expertise:</p>
          <Filter {...expertiseFilterState} />
        </MobileWrapper>

        <div className={css['clear-container']}>
          {combinedFilter && (
            <p className={`${css['open']} ${css['clear']} bold text-underline`} onClick={clearFilters}>
              Clear all
            </p>
          )}
        </div>
      </div>
    </>
  )
}

export const VideoFilter = (props: any) => {
  return (
    <div className={css['filter']}>
      <Filters {...props} />
    </div>
  )
}

export const VideoFilterMobile = (props: any) => {
  const [open, setOpen] = React.useState(props.combinedFilter)

  let className = `${css['mobile-filter']} section`

  if (open || true) className += ` ${css['open']}`

  return (
    <div className={className}>
      <div>
        <div className={css['header']}>
          <p className="title">Filter</p>
          <IconFilter className={`icon`} style={{ fontSize: '1.2em' }} />
        </div>

        <div className={css['filter-container']}>
          <Filters mobile setOpen={setOpen} {...props} />
        </div>
      </div>
    </div>
  )
}
