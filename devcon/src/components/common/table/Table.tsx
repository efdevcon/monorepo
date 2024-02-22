import React from 'react'
import { useSort, SortVariation } from 'components/common/sort'
import css from './table.module.scss'
import ArrowAsc from 'assets/icons/arrow_asc.svg'
import ArrowDesc from 'assets/icons/arrow_desc.svg'
import { useTranslations } from 'next-intl'

type HeaderProps = {
  columns: TableColumn[]
  setSortBy: Function
  sortBy: number
  sortDirection: string
}
type RowProps = {
  columns: TableColumn[]
  itemKey: string
  items: any[]
}
export type TableColumn = {
  title?: string
  intl?: string
  key: string
  className?: string
  render?(args: any): any
  sort?: SortVariation | Function
}
type TableProps = {
  columns: TableColumn[]
  items: any[]
  itemKey: string // Which value to use to resolve a unique key for React
  [key: string]: any
}

export const TableHeader = (props: HeaderProps) => {
  const intl = useTranslations()

  return (
    <div className={css['header']}>
      {props.columns.map((column, index) => {
        let className = `${css['cell']} ${css['column-header']}`

        if (column.className) className = `${column.className} ${className}`
        if (column.sort) className += ` ${css['sort']}`

        const sortIsActive = props.sortBy === index

        if (sortIsActive) {
          className += ` ${css[props.sortDirection]}`
        }

        const shouldRenderAsc = !sortIsActive || props.sortDirection === 'asc'
        const shouldRenderDesc = !sortIsActive || props.sortDirection === 'desc'

        return (
          <div
            key={column.key}
            className={className}
            style={{
              userSelect: 'none', // Prevents accidental text selection when double-clicking
            }}
            onClick={e => {
              if (column.sort) props.setSortBy(index)
            }}
          >
            <p className="text-uppercase">{column.intl ? intl(column.intl) : column.title}</p>
            {column.sort && (
              <div className={css['sort']}>
                {shouldRenderAsc && <ArrowAsc />}
                {shouldRenderDesc && <ArrowDesc />}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export const TableRows = (props: RowProps) => {
  return (
    <>
      {props.items.map(item => {
        return (
          <div key={item[props.itemKey]} className={css['row']}>
            {props.columns.map(column => {
              const value = item[column.key]

              let className = css['cell']

              if (column.className) className = `${column.className} ${className}`

              return (
                <div key={column.key} className={className}>
                  {column.render ? column.render(item) : <p>{value}</p>}
                  {/* 
              TODO: build error
              {column.render ? column.render(item, column) : <p>{value}</p>} */}
                </div>
              )
            })}
          </div>
        )
      })}
    </>
  )
}

export const Table = (props: TableProps) => {
  const { sortedData, sortBy, setSortBy, sortDirection } = useSort(props.items, props.columns, props.initialSort)

  return (
    <div className={css['container']}>
      <TableHeader columns={props.columns} setSortBy={setSortBy} sortBy={sortBy} sortDirection={sortDirection} />
      <TableRows itemKey={props.itemKey} columns={props.columns} items={sortedData} />
    </div>
  )
}
