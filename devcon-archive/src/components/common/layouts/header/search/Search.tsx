import React, { useState } from 'react'
import { navigate } from 'gatsby'
import { InputForm } from 'src/components/common/input-form'
import IconSearch from 'src/assets/icons/search.svg'
import css from './search.module.scss'
import { useQueryStringer } from 'src/hooks/useQueryStringer'
import { useArchiveSearch } from 'src/hooks/useArchiveSearch'
import { Link } from 'src/components/common/link'
import { useStaffPicks } from 'src/hooks/useStaffPicks'

export const Search = (props: any) => {
  let className = css['search-foldout']
  if (props.open) {
    className += ` ${css['open']}`
  }

  const [searchQuery, setSearchQuery] = useState('')
  const defaultPageSize = 6
  const qs = useQueryStringer({}, false)
  const { data, isLoading, isError } = useArchiveSearch(qs, { q: searchQuery, from: 0, size: defaultPageSize }, false)
  const staffPicks = useStaffPicks()
  const showSuggested = !searchQuery

  function onSearch() {
    navigate(`/archive/watch?q=${searchQuery}`)
  }

  return (
    <div className={className}>
      <div className={`${css['content']}`}>
        <InputForm
          id='input-form_search_header'
          type="search"
          placeholder="Search for videos.."
          icon={IconSearch}
          className={css['search-input']}
          timeout={300}
          onChange={e => setSearchQuery(e)}
          onSubmit={onSearch}
          transparentMode
          autoFocus={props.open}
        />

        <div className={css['results']}>
          <p className="text-uppercase font-xs bold">Suggested</p>

          {isLoading && <p className={css['result']}>Loading results..</p>}
          {isError && <p className={css['result']}>Unable to fetch videos..</p>}
          {!showSuggested && data?.items?.length === 0 && <p className={css['result']}>No videos found..</p>}
          {!showSuggested &&
            data?.items?.length > 0 &&
            data.items.map(i => {
              return <SearchResult key={i.slug} slug={i.slug} title={i.title} />
            })}
          {showSuggested &&
            staffPicks.videos.map(i => {
              return <SearchResult key={i.slug} slug={i.slug} title={i.title} />
            })}

          <Link to={`/archive/watch?q=${searchQuery}`} className={`${css['result']} bold text-underline"`}>
            View all
          </Link>
        </div>
      </div>
    </div>
  )
}

const SearchResult = (props: any) => {
  return (
    <Link to={props.slug} className={`${css['result']} hover-underline`}>
      <IconSearch />
      <p>{props.title}</p>
    </Link>
  )
}
