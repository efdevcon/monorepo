import React from 'react'
import { useTranslations } from 'next-intl'
import ArrowAsc from 'assets/icons/arrow_asc.svg'
import ArrowDesc from 'assets/icons/arrow_desc.svg'
import css from './sort.module.scss'
import { HorizontalScroller } from 'components/common/horizontal-scroller'

/*
  EXAMPLE USAGE:

  // useSort handles sorting logic and returns sortState given some data and a set of fields to sort on
  const sortState = useSort(dummyData, [
    {
      intl: 'alphabetical',
      key: 'title',
      sort: SortVariation.basic,
    },
    {
      intl: 'plays',
      key: 'views',
      sort: SortVariation.number,
    },
    {
      intl: 'duration',
      key: 'duration',
      sort: SortVariation.date,
    },
  ])

  // sortState can be plugged into components that will take care of rendering for you
  <Sort {...sortState} /> <--- Handles everything
  
  or...

  <SortButton index={0} field={sortState.fields[0]} sortState={sortState} /> <--- Slightly more flexible approach
*/

export enum SortVariation {
  number = 'number',
  date = 'date',
  basic = 'basic',
}

type SortState = {
  sortedData: any[]
  fields: Field[]
  sortBy: number
  setSortBy: (nextSortBy: number) => void
  sortDirection: 'asc' | 'desc'
}

type Field = {
  intl?: string
  title?: string
  key?: any
  sort?: any
}

// Generic sorting methods
export const presetSortingMethods: any = {
  number: (fieldKey: string) => (a: any, b: any) => a[fieldKey] - b[fieldKey],
  date: (fieldKey: string) => (a: any, b: any) => {
    const dateA = new Date(a[fieldKey])
    const dateB = new Date(b[fieldKey])

    return dateA === dateB ? 0 : dateA > dateB ? 1 : -1
  },
  basic: (fieldKey: string) => (a: any, b: any) => a[fieldKey] === b[fieldKey] ? 0 : a[fieldKey] > b[fieldKey] ? 1 : -1,
}

// useSort contains reusable sorting logic to provide rendering flexiblity (e.g. archive sorting is very different from table sorting)
export const useSort = (
  data: any[],
  fields: Field[],
  resetOnThirdClick = true,
  defaultDirection: 'asc' | 'desc' = 'asc'
): SortState => {
  const [sortBy, setSortBy] = React.useState<number>(0)
  const [sortDirection, setSortDirection] = React.useState<any>(defaultDirection)

  const setSort = (nextsortBy: number) => {
    const alreadySortedByField = sortBy === nextsortBy

    if (alreadySortedByField) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        if (resetOnThirdClick) {
          setSortBy(0)
        }

        setSortDirection('asc')
      }
    } else {
      setSortBy(nextsortBy)
      setSortDirection('asc')
    }
  }

  const sortedData = React.useMemo(() => {
    const sort = () => {
      if (!data) return data

      const shouldSort = typeof sortBy === 'number'

      if (shouldSort) {
        const field = fields[sortBy] as any

        if (typeof field.sort === 'function') {
          return data.slice().sort(field.sort)
        } else {
          // If sort wasn't custom, it should reference a preset sorting method:
          const createSortingMethod = presetSortingMethods[field.sort] || presetSortingMethods.basic
          // Have to instantiate the sorting method with the field key so it knows what to sort by
          const sortingMethod = createSortingMethod(field.key)

          return data.slice().sort(sortingMethod)
        }
      }

      return data
    }

    const sortedData = sort()

    if (sortDirection === 'desc') return sortedData.reverse()

    return sortedData
  }, [sortDirection, sortBy, data, fields])

  return { sortedData, fields, sortBy, setSortBy: setSort, sortDirection }
}

export const SortButton = (props: { index: number; field: Field; sortState: SortState }) => {
  const intl = useTranslations()
  const { field, index, sortState } = props
  const { sortDirection, setSortBy, sortBy } = sortState

  const sortIsActive = sortBy === index

  const shouldRenderAsc = !sortIsActive || sortDirection === 'asc'
  const shouldRenderDesc = !sortIsActive || sortDirection === 'desc'

  let className = css['sort-button']

  if (sortIsActive) className += ` ${css['sort-active']}`

  return (
    <div key={field.key} className={className} onClick={e => setSortBy(index)}>
      <p className="font-md">{field.intl ? intl(field.intl) : field.title}</p>

      <div className={css['sort-arrows']}>
        {shouldRenderAsc && <ArrowAsc />}
        {shouldRenderDesc && <ArrowDesc />}
      </div>
    </div>
  )
}

// Default sort rendering - can rely on useSort and/or SortButton to allow more customizability
export const Sort = (props: SortState) => {
  return (
    <HorizontalScroller>
      <div className={css['sort-container']}>
        {/* <p className={`font-lg bold ${css['sort-button']} ${css['text']}`}>Sort:</p> */}
        {props.fields.map((field: any, index: number) => {
          return <SortButton sortState={props} key={field.key} field={field} index={index} />
        })}
      </div>
    </HorizontalScroller>
  )
}
