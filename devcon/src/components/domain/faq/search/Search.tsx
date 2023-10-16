import { useTranslations } from 'next-intl'
import React, { useState } from 'react'
import css from './search.module.scss'

interface SearchProp {
  onSearch?: (value: string) => void
}

export function Search(props: SearchProp) {
  const intl = useTranslations()
  const [searchFilter, setSearchFilter] = useState('')

  function onSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const filter = e.target.value

    setSearchFilter(filter)

    if (props.onSearch) props.onSearch(filter)
  }

  return (
    <>
      <div className={css['search-bar']}>
        <input
          id="search"
          type="text"
          placeholder={intl('faq_filter_keywords')}
          value={searchFilter}
          onChange={e => onSearch(e)}
        />

        {/* 
        RTD: remove sub-text
        <span className={css['subtitle']}>{intl.formatMessage({ id: 'faq_filter' })}</span> 
        */}
      </div>
    </>
  )
}
