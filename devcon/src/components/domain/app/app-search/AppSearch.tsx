import React from 'react'
import IconSearch from 'assets/icons/search.svg'
import { Sort } from 'components/common/sort'
import { InputForm } from 'components/common/input-form'
import { Filter, FilterFoldout, NoResults } from 'components/common/filter'
import { CollapsedSection, CollapsedSectionHeader, CollapsedSectionContent } from 'components/common/collapsed-section'
import { Button } from 'components/common/button'
import css from './app-search.module.scss'

type AppSearchProps = {
  search: {
    onChange: (args: any) => void
    placeholder: string
  }
  children?: any
  sortState?: any
  filterStates?: any[]
  actions?: any
  noResults?: boolean
  className?: string
}

type FilterProps = {
  filters: []
}

export const AppSearch = (props: AppSearchProps) => {
  let className = `${css['filter']} expand section`

  const noSort = !props.sortState
  const noFilter = !props.filterStates

  if (props.className) className += ` ${props.className}`
  if (noSort) className += ` ${css['no-sort']}`
  if (noFilter) className += ` ${css['no-filter']}`

  return (
    <div className="section">
      <div className={className}>
        <div className={css['search-filter-container']}>
          <InputForm
            className={css['search']}
            placeholder={props.search.placeholder}
            onChange={props.search.onChange}
            icon={IconSearch}
          />

          {props.actions}

          {props.filterStates && (
            <FilterFoldout>
              {(_, setOpen) => {
                const clearFilters = () => {
                  props.filterStates?.forEach(({ filterState }: any) => {
                    filterState?.clearFilter()
                  })
                }

                const filterIsSelected = props.filterStates?.some(({ filterState }: any) => {
                  return filterState ? Object.keys(filterState.activeFilter).length : 0
                })

                return (
                  <>
                    {props.filterStates?.map(({ filterState, title }: any, index: any) => {
                      const nFiltersSelected = filterState ? Object.keys(filterState.activeFilter).length : 0

                      return (
                        <CollapsedSection key={index}>
                          <CollapsedSectionHeader title={title}>
                            {nFiltersSelected > 0 && (
                              <div className={css['n-filters-indicator']}>
                                <div className="label sm error">{nFiltersSelected}</div>
                              </div>
                            )}
                          </CollapsedSectionHeader>
                          <CollapsedSectionContent>
                            <div className={css['filter-container']}>
                              <Filter {...filterState} />
                            </div>
                          </CollapsedSectionContent>
                        </CollapsedSection>
                      )
                    })}

                    {filterIsSelected && (
                      <div className={css['filter-actions']}>
                        <button className={`plain ${css['clear']} hover-underline`} onClick={clearFilters}>
                          Clear all
                        </button>

                        <Button className="red" onClick={() => setOpen(false)}>
                          Confirm
                        </Button>
                      </div>
                    )}
                  </>
                )
              }}
            </FilterFoldout>
          )}
        </div>

        {props.sortState && <Sort {...props.sortState} />}

        {props.children}
      </div>

      {props.noResults && <NoResults />}
    </div>
  )
}
