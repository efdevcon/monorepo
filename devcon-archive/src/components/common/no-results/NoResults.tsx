import React from 'react'
import css from './no-results.module.scss'

export const NoResults = (props: any) => {
  let className = css['no-results']

  return (
    <div className={className}>
      <div>No results matching this filter - try another</div>
    </div>
  )
}
