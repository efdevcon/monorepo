import React from 'react'
import ChevronRight from 'src/assets/icons/chevron_right.svg'
import ChevronLeft from 'src/assets/icons/chevron_left.svg'
import css from './pagination.module.scss'

type Props = {
  itemsPerPage: number
  totalItems: number
  selectedPage: number
  onSelectPage: (page: number) => void
  truncate?: boolean
  className?: string
}

export const Pagination = (props: Props) => {
  const totalPages = Math.ceil(props.totalItems / props.itemsPerPage)

  let className = css['container']
  if (props.className) className += ` ${props.className}`

  function pagesToShow() {
    const offset = 2
    const left = props.selectedPage - offset
    const right = props.selectedPage + offset + 1
    const pages = []
    const truncatedPages = []

    if (!props.truncate) {
      return Array.from(Array(totalPages + 1).keys()).splice(1)
    }

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i < right)) {
        pages.push(i)
      }
    }

    let l
    for (let i of pages) {
      if (l) {
        if (i - l === 2) {
          truncatedPages.push(l + 1)
        } else if (i - l !== 1) {
          truncatedPages.push('...')
        }
      }

      truncatedPages.push(i)
      l = i
    }

    return truncatedPages
  }

  return (
    <div className={className}>
      <ul className={css['pages']}>
        <li>
          <span role="button" aria-label='Go to previous page' onClick={() => props.onSelectPage(props.selectedPage === 1 ? 1 : props.selectedPage - 1)}>
            <ChevronLeft />
          </span>
        </li>
        {pagesToShow().map((i, index) => {
          return (
            <li key={`pagination_${className}_${index}`}>
              {typeof i === 'string' && <span className={css['truncated']}>...</span>}
              {typeof i === 'number' && (
                <span
                  className={props.selectedPage === i ? css['selected'] : ''}
                  role="button"
                  aria-label={`Go to page ${i}`}
                  onClick={() => props.onSelectPage(i)}
                >
                  {i}
                </span>
              )}
            </li>
          )
        })}
        <li>
          <span
            role="button"
            aria-label='Go to next page' 
            onClick={() => props.onSelectPage(props.selectedPage === totalPages ? totalPages : props.selectedPage + 1)}
          >
            <ChevronRight />
          </span>
        </li>
      </ul>
    </div>
  )
}
